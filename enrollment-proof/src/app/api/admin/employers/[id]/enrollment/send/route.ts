import { supabaseServer } from "@/lib/supabaseServer";
import { ensureMicrosoftAccessToken } from "@/lib/microsoftAuth";

export const runtime = "nodejs";

function b64url(input: string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function getCookie(req: Request, name: string) {
  const cookie = req.headers.get("cookie") || "";
  const parts = cookie.split(";").map((p) => p.trim());
  const hit = parts.find((p) => p.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.split("=").slice(1).join("=")) : null;
}

async function getCaller(
  req: Request
): Promise<
  | { kind: "admin"; adminUserId: string }
  | { kind: "hr"; hrUserId: string }
  | null
> {
  const adminToken = getCookie(req, "rrs_admin_session");
  if (adminToken) {
    const { data, error } = await supabaseServer
      .from("admin_sessions")
      .select("admin_user_id, expires_at")
      .eq("session_token", adminToken)
      .maybeSingle();

    if (!error && data?.admin_user_id) {
      const exp = new Date(String((data as any).expires_at || "")).getTime();
      if (!exp || Date.now() < exp) {
        return { kind: "admin", adminUserId: String((data as any).admin_user_id) };
      }
    }
  }

  const hrToken = getCookie(req, "rrs_hr_session");
  if (hrToken) {
    const { data, error } = await supabaseServer
      .from("hr_sessions")
      .select("hr_user_id, expires_at")
      .eq("session_token", hrToken)
      .maybeSingle();

    if (!error && data?.hr_user_id) {
      const exp = new Date(String((data as any).expires_at || "")).getTime();
      if (!exp || Date.now() < exp) {
        return { kind: "hr", hrUserId: String((data as any).hr_user_id) };
      }
    }
  }

  return null;
}

async function refreshAccessToken(refreshToken: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: requireEnv("GOOGLE_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const json = await res.json().catch(() => ({} as any));
  if (!res.ok || !json.access_token) {
    throw new Error(json?.error_description || json?.error || "Failed to refresh access token");
  }

  return { access_token: String(json.access_token), expires_in: Number(json.expires_in || 0) };
}

function isUUID(v: any) {
  return typeof v === "string" && /^[0-9a-fA-F-]{36}$/.test(v);
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
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(d);
}

/* ----------------------------
   HTML email helpers (legacy fallback)
----------------------------- */

function escapeHtml(s: string) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripScripts(html: string) {
  return String(html || "").replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
}

function buildHtmlWrapper({
  subject,
  innerHtml,
  noticeLink,
  supportEmail,
}: {
  subject: string;
  innerHtml: string;
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

  const sendRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({ raw: b64url(raw) }),
  });

  const sendJson = await sendRes.json().catch(() => ({} as any));
  if (!sendRes.ok) throw new Error(sendJson?.error?.message || "Gmail send failed");
  return sendJson;
}

async function sendMicrosoftGraph({
  to,
  subject,
  html,
  accessToken,
}: {
  to: string;
  subject: string;
  html: string;
  accessToken: string;
}) {
  const safeSubject = (subject || "").replace(/\r?\n/g, " ").trim();

  const res = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      message: {
        subject: safeSubject,
        body: { contentType: "HTML", content: html || "" },
        toRecipients: [{ emailAddress: { address: to } }],
      },
      saveToSentItems: true,
    }),
  });

  const json = await res.json().catch(() => ({} as any));
  if (!res.ok) throw new Error(json?.error?.message || "Microsoft Graph sendMail failed");
  return json;
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { id: employerId } = await ctx.params;

  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const employee_id = body?.employee_id;
  const employee_ids = Array.isArray(body?.employee_ids) ? body.employee_ids : null;
  const template_id = body?.template_id;

  const subject_override = typeof body?.subject_override === "string" ? body.subject_override : null;
  const body_override = typeof body?.body_override === "string" ? body.body_override : null;

  const ids: string[] = [];
  if (isUUID(employee_id)) ids.push(employee_id);
  if (employee_ids) for (const x of employee_ids) if (isUUID(x)) ids.push(x);

  if (ids.length === 0) return Response.json({ error: "Missing employee_id or employee_ids" }, { status: 400 });
  if (!isUUID(template_id)) return Response.json({ error: "Missing template_id" }, { status: 400 });

  const { data: employer, error: empErr } = await supabaseServer
    .from("employers")
    .select("id, name, support_email, effective_date, opt_out_deadline")
    .eq("id", employerId)
    .maybeSingle();

  if (empErr || !employer) return Response.json({ error: "Employer not found" }, { status: 404 });

  const { data: tmpl, error: tmplErr } = await supabaseServer
    .from("email_templates")
    .select("id, subject, body, body_text, body_html, is_active")
    .eq("id", template_id)
    .maybeSingle();

  if (tmplErr || !tmpl) return Response.json({ error: "Template not found" }, { status: 404 });
  if ((tmpl as any).is_active === false) return Response.json({ error: "Template is archived" }, { status: 400 });

  // ✅ Sender selection (Gmail admin, HR can be Gmail OR Microsoft)
  let providerUsed: "gmail" | "microsoft" = "gmail";
  let acct: any = null;

  if (caller.kind === "admin") {
    const adminSystemEmail = String(requireEnv("ADMIN_SENDER_EMAIL")).trim().toLowerCase();

    const { data } = await supabaseServer
      .from("gmail_accounts")
      .select("user_email, access_token, refresh_token, expires_at, status, connected_by_admin_user_id")
      .eq("user_email", adminSystemEmail)
      .is("employer_id", null)
      .eq("status", "approved")
      .maybeSingle();

    if (
      data &&
      (data as any).connected_by_admin_user_id &&
      String((data as any).connected_by_admin_user_id) !== caller.adminUserId
    ) {
      return Response.json({ error: "Admin sender not owned by this admin user." }, { status: 403 });
    }

    acct = data;
    providerUsed = "gmail";
  } else {
    // 1) Try Gmail sender for this HR user
    const { data: g } = await supabaseServer
      .from("gmail_accounts")
      .select("user_email, access_token, refresh_token, expires_at, status, employer_id, connected_by_hr_user_id, created_at")
      .eq("status", "approved")
      .eq("employer_id", employerId)
      .eq("connected_by_hr_user_id", caller.hrUserId)
      .not("refresh_token", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (g) {
      acct = g;
      providerUsed = "gmail";
    } else {
      // 2) Try Microsoft sender for this HR user
      const { data: m } = await supabaseServer
        .from("microsoft_accounts")
        .select("user_email, access_token, refresh_token, expires_at, status, employer_id, requested_by_hr_user_id, created_at")
        .eq("status", "approved")
        .eq("employer_id", employerId)
        .eq("requested_by_hr_user_id", caller.hrUserId)
        .not("refresh_token", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (m) {
        acct = m;
        providerUsed = "microsoft";
      }
    }
  }

  if (!acct) {
    return Response.json(
      {
        error:
          caller.kind === "admin"
            ? "Admin sender not connected/approved. Connect ADMIN_SENDER_EMAIL first."
            : "No approved sender connected for this employer by this HR user.",
      },
      { status: 400 }
    );
  }

  const fromEmail = String((acct as any).user_email || "").trim().toLowerCase();
  const refreshToken = String((acct as any).refresh_token || "");
  let accessToken = String((acct as any).access_token || "");
  const expiresAtRaw = String((acct as any).expires_at || "");

  if (!refreshToken) {
    return Response.json({ error: "Sender refresh_token missing. Reconnect sender." }, { status: 400 });
  }

  // ✅ Ensure valid token for chosen provider
  if (providerUsed === "gmail") {
    const expiresAtMs = new Date(expiresAtRaw).getTime();

    if (!accessToken || !expiresAtMs || Date.now() > expiresAtMs - 60_000) {
      const refreshed = await refreshAccessToken(refreshToken);
      accessToken = refreshed.access_token;

      const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

      const q = supabaseServer
        .from("gmail_accounts")
        .update({ access_token: accessToken, expires_at: newExpiresAt })
        .eq("user_email", fromEmail);

      if (caller.kind === "admin") q.is("employer_id", null);
      else q.eq("employer_id", employerId);

      await q;
    }
  } else {
    // Microsoft: use your helper (supports refresh token rotation and DB persistence)
    const ensured = await ensureMicrosoftAccessToken({
      userEmail: fromEmail,
      accessToken,
      refreshToken,
      expiresAt: expiresAtRaw || null,
    });

    accessToken = ensured.access_token;
  }

  // Employees
  const { data: employees, error: employeesErr } = await supabaseServer
    .from("employees")
    .select("id, email, first_name, last_name, token, eligible, opted_out_at, notice_sent_at")
    .eq("employer_id", employerId)
    .in("id", ids);

  if (employeesErr) return Response.json({ error: employeesErr.message }, { status: 500 });

  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

  let attempted = 0;
  let sent = 0;
  const failed: Array<{ employee_id: string; error: string }> = [];

  // pick template channels
  const bodyTextTemplate = String((tmpl as any).body_text ?? (tmpl as any).body ?? "");
  const bodyHtmlTemplate = String((tmpl as any).body_html ?? "");

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

    const renderedSubject = renderTemplate(String((tmpl as any).subject || ""), vars);
    const renderedText = renderTemplate(bodyTextTemplate, vars);

    const finalSubject = subject_override ? renderTemplate(subject_override, vars) : renderedSubject;
    const finalText = body_override ? renderTemplate(body_override, vars) : renderedText;

    const innerHtml =
      bodyHtmlTemplate.trim().length
        ? stripScripts(renderTemplate(bodyHtmlTemplate, vars))
        : (() => {
            const escaped = escapeHtml(finalText || "").replace(/\n/g, "<br/>");
            return `<div style="white-space:normal;">${escaped}</div>`;
          })();

    const html = buildHtmlWrapper({
      subject: finalSubject || "Benefits Notice",
      innerHtml,
      noticeLink: String(vars["links.notice"] || ""),
      supportEmail: String(vars["employer.support_email"] || ""),
    });

    try {
      if (providerUsed === "gmail") {
        await sendGmail({
          from: fromEmail,
          to,
          subject: finalSubject || "Benefits Notice",
          text: finalText || "",
          html,
          accessToken,
        });
      } else {
        // Microsoft Graph sendMail uses HTML body
        await sendMicrosoftGraph({
          to,
          subject: finalSubject || "Benefits Notice",
          html,
          accessToken,
        });
      }

      sent++;

      const now = new Date().toISOString();

      await supabaseServer.from("events").insert({
        employer_id: employerId,
        employee_id: (e as any).id,
        event_type: "enrollment_notice_sent",
        created_at: now,
      });

      const alreadySentAt = (e as any).notice_sent_at;
      if (!alreadySentAt) {
        await supabaseServer
          .from("employees")
          .update({ notice_sent_at: now })
          .eq("id", (e as any).id)
          .is("notice_sent_at", null);
      }
    } catch (err: any) {
      failed.push({ employee_id: (e as any).id, error: err?.message || "Send failed" });

      await supabaseServer.from("events").insert({
        employer_id: employerId,
        employee_id: (e as any).id,
        event_type: "enrollment_notice_failed",
        created_at: new Date().toISOString(),
      });
    }
  }

  return Response.json({
    ok: true,
    attempted,
    sent,
    failed_count: failed.length,
    failed,
    provider_used: providerUsed,
    sender_email_used: fromEmail,
  });
}