// /src/app/api/admin/send-requests/[requestId]/process/route.ts

import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

function b64url(input: string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function refreshAccessToken(refreshToken: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const json = await res.json().catch(() => ({} as any));
  if (!res.ok || !json.access_token) {
    throw new Error(json?.error_description || "Failed to refresh access token");
  }

  return {
    access_token: String(json.access_token),
    expires_in: Number(json.expires_in || 0),
  };
}

function renderTemplate(str: string, vars: Record<string, string>) {
  return String(str || "").replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g, (_, key) => {
    const k = String(key || "").trim();
    return vars[k] != null ? String(vars[k]) : "";
  });
}

function fmtDateNice(dateStr: string | null | undefined) {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

// very light safety: strip script tags (internal admin tool, but still)
function stripScripts(html: string) {
  return String(html || "").replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    ""
  );
}

function escapeHtml(s: string) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtmlFromText(bodyText: string) {
  const lines = String(bodyText || "").split("\n");
  const blocks: string[] = [];
  let buffer: string[] = [];

  const flush = () => {
    if (buffer.length) {
      blocks.push(
        `<p style="margin:0 0 12px 0; line-height:1.6;">${escapeHtml(
          buffer.join(" ")
        )}</p>`
      );
      buffer = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flush();
      blocks.push(`<div style="height:10px;"></div>`);
      continue;
    }
    buffer.push(line);
  }
  flush();

  return blocks.join("");
}

function buildHtmlWrapper({
  subject,
  innerHtml,
  noticeLink,
  supportEmail,
}: {
  subject: string;
  innerHtml: string; // already-rendered HTML (scripts stripped)
  noticeLink: string;
  supportEmail: string;
}) {
  const safeSubject = escapeHtml(subject || "");
  const safeSupport = escapeHtml(supportEmail || "");
  const safeLink = escapeHtml(noticeLink || "");

  return `
  <div style="background:#f5f7fa; padding:28px 12px;">
    <div style="max-width:640px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden;">
      <div style="padding:18px 20px; border-bottom:1px solid #e5e7eb; font-family:Arial, sans-serif;">
        <div style="font-size:12px; letter-spacing:.4px; text-transform:uppercase; color:#6b7280;">
          Benefits Notice
        </div>
        <div style="margin-top:6px; font-size:18px; font-weight:700; color:#111827;">
          ${safeSubject}
        </div>
      </div>

      <div style="padding:18px 20px; font-family:Arial, sans-serif; font-size:14px; color:#111827; line-height:1.6;">
        ${innerHtml}

        <div style="margin:18px 0 10px 0; text-align:center;">
          <a href="${safeLink}"
             style="display:inline-block; background:#355A7C; color:#ffffff; text-decoration:none;
                    padding:12px 18px; border-radius:10px; font-weight:700;">
            Review Notice
          </a>
        </div>

        <div style="margin-top:10px; font-size:12px; color:#6b7280; line-height:1.5;">
          If the button doesn’t work, copy and paste this link into your browser:
          <div style="margin-top:6px; color:#355A7C; word-break:break-all;">
            ${safeLink}
          </div>
        </div>

        ${
          safeSupport
            ? `<div style="margin-top:14px; font-size:12px; color:#6b7280;">
                 Questions? Contact <strong style="color:#111827;">${safeSupport}</strong>
               </div>`
            : ""
        }
      </div>
    </div>
  </div>
  `.trim();
}

async function sendGmail({
  from,
  to,
  subject,
  text,
  html,
  accessToken,
}: {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  accessToken: string;
}) {
  const safeSubject = (subject || "").replace(/\r?\n/g, " ").trim();

  let raw = "";

  if (html) {
    const boundary = "flow_boundary_" + Math.random().toString(16).slice(2);

    raw = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${safeSubject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset="UTF-8"`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      text || "",
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset="UTF-8"`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      html,
      ``,
      `--${boundary}--`,
      ``,
    ].join("\r\n");
  } else {
    raw = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${safeSubject}`,
      `Content-Type: text/plain; charset="UTF-8"`,
      ``,
      text || "",
    ].join("\r\n");
  }

  const sendRes = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ raw: b64url(raw) }),
    }
  );

  const sendJson = await sendRes.json().catch(() => ({} as any));
  if (!sendRes.ok) throw new Error(sendJson?.error?.message || "Gmail send failed");
  return sendJson;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ requestId: string }> }
) {
  // ✅ optional security key
  const key = req.headers.get("x-admin-key") || "";
  const required = process.env.ADMIN_PROCESS_KEY || "";
  if (required && key !== required) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { requestId } = await ctx.params;

  // Load request
  const { data: r, error: rErr } = await supabaseServer
    .from("admin_send_requests")
    .select("id, employer_id, template_id, employee_ids, status")
    .eq("id", requestId)
    .maybeSingle();

  if (rErr || !r) {
    return Response.json(
      { error: rErr?.message || "Request not found" },
      { status: 404 }
    );
  }

  if (String((r as any).status) === "processing") {
    return Response.json({ error: "Request already processing" }, { status: 409 });
  }

  // Mark processing
  await supabaseServer
    .from("admin_send_requests")
    .update({ status: "processing", error: null })
    .eq("id", requestId);

  try {
    const employerId = String((r as any).employer_id);
    const templateId = String((r as any).template_id);
    const employeeIds = Array.isArray((r as any).employee_ids)
      ? (r as any).employee_ids
      : [];

    // Employer
    const { data: employer, error: empErr } = await supabaseServer
      .from("employers")
      .select("id, name, support_email, effective_date, opt_out_deadline")
      .eq("id", employerId)
      .maybeSingle();

    if (empErr || !employer) throw new Error("Employer not found");

    // ✅ Template (includes body_text/body_html)
    const { data: tmpl, error: tmplErr } = await supabaseServer
      .from("email_templates")
      .select("id, subject, body, body_text, body_html, is_active")
      .eq("id", templateId)
      .maybeSingle();

    if (tmplErr || !tmpl) throw new Error("Template not found");
    if ((tmpl as any).is_active === false) throw new Error("Template archived");

    // Choose channels (text is canonical)
    const bodyTextTemplate = String((tmpl as any).body_text ?? (tmpl as any).body ?? "");
    const bodyHtmlTemplate = String((tmpl as any).body_html ?? "");

    // Admin system sender
    const adminSender = (process.env.ADMIN_SENDER_EMAIL || "").trim().toLowerCase();
    if (!adminSender) throw new Error("Missing ADMIN_SENDER_EMAIL");

    const { data: acct, error: acctErr } = await supabaseServer
      .from("gmail_accounts")
      .select("user_email, access_token, refresh_token, expires_at, status, employer_id")
      .eq("user_email", adminSender)
      .maybeSingle();

    if (acctErr || !acct) throw new Error(`Admin sender not connected: ${adminSender}`);

    const status = String((acct as any).status || "");
    if (status !== "approved") throw new Error("Admin sender is not approved");

    const refreshToken = String((acct as any).refresh_token || "");
    if (!refreshToken) throw new Error("Admin sender missing refresh_token. Re-connect Gmail.");

    let accessToken = String((acct as any).access_token || "");
    const expiresAtMs = new Date(String((acct as any).expires_at || "")).getTime();

    if (!accessToken || !expiresAtMs || Date.now() > expiresAtMs - 60_000) {
      const refreshed = await refreshAccessToken(refreshToken);
      accessToken = refreshed.access_token;
      const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

      await supabaseServer
        .from("gmail_accounts")
        .update({ access_token: accessToken, expires_at: newExpiresAt })
        .eq("user_email", adminSender);
    }

    // Employees
    const { data: employees, error: eErr } = await supabaseServer
      .from("employees")
      .select("id, email, first_name, last_name, token, eligible, opted_out_at")
      .eq("employer_id", employerId)
      .in("id", employeeIds);

    if (eErr) throw new Error(eErr.message);

    const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

    let attempted = 0;
    let sent = 0;
    const failed: Array<{ employee_id: string; error: string }> = [];

    for (const e of employees ?? []) {
      attempted++;

      const to = String((e as any).email || "").trim();
      const eligible = (e as any).eligible !== false;
      const optedOut = !!(e as any).opted_out_at;
      const token = String((e as any).token || "").trim();

      if (!to.includes("@")) {
        failed.push({ employee_id: (e as any).id, error: "Missing/invalid employee email" });
        continue;
      }
      if (!token) {
        failed.push({ employee_id: (e as any).id, error: "Missing employee token" });
        continue;
      }
      if (!eligible) {
        failed.push({ employee_id: (e as any).id, error: "Employee marked ineligible" });
        continue;
      }
      if (optedOut) {
        failed.push({ employee_id: (e as any).id, error: "Employee opted out" });
        continue;
      }

      const vars: Record<string, string> = {
        "employee.first_name": String((e as any).first_name || ""),
        "employee.last_name": String((e as any).last_name || ""),
        "employee.email": to,

        "employer.name": String((employer as any).name || ""),
        "employer.support_email": String((employer as any).support_email || ""),

        "program.effective_date": fmtDateNice((employer as any).effective_date),
        "program.opt_out_deadline": fmtDateNice((employer as any).opt_out_deadline),

        "links.notice": `${baseUrl}/notice/${token}`,
        "links.learn_more": `${baseUrl}/notice/${token}/learn-more`,
      };

      const subject = renderTemplate(String((tmpl as any).subject || ""), vars) || "Benefits Notice";
      const text = renderTemplate(bodyTextTemplate, vars) || "";

      const noticeLink = String(vars["links.notice"] || "");
      const supportEmail = String(vars["employer.support_email"] || "");

      // ✅ Always send an HTML version so the button can appear.
      // If body_html exists, it keeps bold/colors/etc and gets wrapped.
      // If it doesn't, we convert text -> HTML and still wrap.
      let html = "";
      if (bodyHtmlTemplate.trim().length) {
        const inner = stripScripts(renderTemplate(bodyHtmlTemplate, vars));
        html = buildHtmlWrapper({
          subject,
          innerHtml: inner,
          noticeLink,
          supportEmail,
        });
      } else {
        html = buildHtmlWrapper({
          subject,
          innerHtml: buildHtmlFromText(text),
          noticeLink,
          supportEmail,
        });
      }

      try {
        await sendGmail({
          from: adminSender,
          to,
          subject,
          text,
          html,
          accessToken,
        });

        sent++;

        await supabaseServer.from("events").insert({
          employer_id: employerId,
          employee_id: (e as any).id,
          event_type: "enrollment_notice_sent",
        });
      } catch (err: any) {
        failed.push({ employee_id: (e as any).id, error: err?.message || "Send failed" });

        await supabaseServer.from("events").insert({
          employer_id: employerId,
          employee_id: (e as any).id,
          event_type: "enrollment_notice_failed",
        });
      }
    }

    const finalStatus = failed.length > 0 ? "failed" : "sent";

    await supabaseServer
      .from("admin_send_requests")
      .update({
        status: finalStatus,
        error: failed.length ? JSON.stringify(failed).slice(0, 10_000) : null,
        processed_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    return Response.json({
      ok: true,
      request_id: requestId,
      status: finalStatus,
      attempted,
      sent,
      failed_count: failed.length,
      failed,
      sender_email_used: adminSender,
    });
  } catch (err: any) {
    await supabaseServer
      .from("admin_send_requests")
      .update({
        status: "failed",
        error: String(err?.message || err || "Failed"),
        processed_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    return Response.json(
      { error: err?.message || "Failed to process request" },
      { status: 500 }
    );
  }
}