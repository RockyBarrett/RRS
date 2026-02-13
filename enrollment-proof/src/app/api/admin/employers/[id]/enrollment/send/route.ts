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
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

async function sendGmail({
  from,
  to,
  subject,
  text,
  accessToken,
}: {
  from: string;
  to: string;
  subject: string;
  text: string;
  accessToken: string;
}) {
  const raw = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    ``,
    text,
  ].join("\r\n");

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
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: employerId } = await ctx.params;

  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const employee_id = body?.employee_id;
  const employee_ids = Array.isArray(body?.employee_ids) ? body.employee_ids : null;
  const template_id = body?.template_id;

  // ✅ NEW: optional overrides (used for Preview edits)
  const subject_override =
    typeof body?.subject_override === "string" ? body.subject_override : null;

  const body_override =
    typeof body?.body_override === "string" ? body.body_override : null;

  const ids: string[] = [];
  if (isUUID(employee_id)) ids.push(employee_id);
  if (employee_ids) for (const x of employee_ids) if (isUUID(x)) ids.push(x);

  if (ids.length === 0) {
    return Response.json(
      { error: "Missing employee_id or employee_ids" },
      { status: 400 }
    );
  }
  if (!isUUID(template_id)) {
    return Response.json({ error: "Missing template_id" }, { status: 400 });
  }

  // Employer (needs sender_email)
  const { data: employer, error: empErr } = await supabaseServer
    .from("employers")
    .select("id, name, support_email, effective_date, opt_out_deadline, sender_email")
    .eq("id", employerId)
    .maybeSingle();

  if (empErr || !employer) {
    return Response.json({ error: "Employer not found" }, { status: 404 });
  }

  const senderEmail = String((employer as any).sender_email || "")
    .trim()
    .toLowerCase();

  if (!senderEmail) {
    return Response.json(
      {
        error:
          "No sender email connected for this employer yet. Please connect Gmail on the employer page.",
      },
      { status: 400 }
    );
  }

  // Template
  const { data: tmpl, error: tmplErr } = await supabaseServer
    .from("email_templates")
    .select("id, name, category, subject, body, is_active")
    .eq("id", template_id)
    .maybeSingle();

  if (tmplErr || !tmpl) return Response.json({ error: "Template not found" }, { status: 404 });
  if ((tmpl as any).is_active === false) {
    return Response.json({ error: "Template is archived" }, { status: 400 });
  }

  // Gmail account must be approved AND tied to this employer
  const { data: acct, error: acctErr } = await supabaseServer
    .from("gmail_accounts")
    .select("user_email, access_token, refresh_token, expires_at, status, employer_id")
    .eq("user_email", senderEmail)
    .maybeSingle();

  if (acctErr) return Response.json({ error: acctErr.message }, { status: 500 });
  if (!acct) return Response.json({ error: `Sender email ${senderEmail} is not connected.` }, { status: 400 });

  const status = String((acct as any).status || "");
  const acctEmployerId = (acct as any).employer_id ? String((acct as any).employer_id) : null;

  if (status !== "approved") {
    return Response.json({ error: "Sender is pending approval." }, { status: 403 });
  }

  if (!acctEmployerId || acctEmployerId !== employerId) {
    return Response.json({ error: "Sender not authorized for this employer." }, { status: 403 });
  }

  const fromEmail = String((acct as any).user_email || "");
  const refreshToken = String((acct as any).refresh_token || "");
  let accessToken = String((acct as any).access_token || "");

  if (!refreshToken) {
    return Response.json(
      { error: "Gmail sender is missing refresh_token. Re-connect Gmail." },
      { status: 500 }
    );
  }

  const expiresAtMs = new Date(String((acct as any).expires_at || "")).getTime();
  if (!accessToken || !expiresAtMs || Date.now() > expiresAtMs - 60_000) {
    const refreshed = await refreshAccessToken(refreshToken);
    accessToken = refreshed.access_token;

    const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
    await supabaseServer
      .from("gmail_accounts")
      .update({ access_token: accessToken, expires_at: newExpiresAt })
      .eq("user_email", fromEmail);
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

    // Default rendered template
    const renderedSubject = renderTemplate(String((tmpl as any).subject || ""), vars);
    const renderedText = renderTemplate(String((tmpl as any).body || ""), vars);

    // ✅ NEW: apply overrides if provided (still supports {{vars}} if you keep them)
    const finalSubject = subject_override
      ? renderTemplate(subject_override, vars)
      : renderedSubject;

    const finalText = body_override
      ? renderTemplate(body_override, vars)
      : renderedText;

    try {
      await sendGmail({
        from: fromEmail,
        to,
        subject: finalSubject || "Benefits Notice",
        text: finalText || "",
        accessToken,
      });

      sent++;

      const now = new Date().toISOString();

      // Event: sent (timestamped)
      await supabaseServer.from("events").insert({
        employer_id: employerId,
        employee_id: (e as any).id,
        event_type: "enrollment_notice_sent",
        created_at: now,
      });

      // Employee: first-time notice_sent_at (do not overwrite)
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
    sender_email_used: fromEmail,
  });
}