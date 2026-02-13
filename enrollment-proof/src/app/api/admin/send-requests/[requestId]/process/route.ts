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
  if (!res.ok || !json.access_token) throw new Error(json?.error_description || "Failed to refresh access token");

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
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(d);
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

  const sendRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({ raw: b64url(raw) }),
  });

  const sendJson = await sendRes.json().catch(() => ({} as any));
  if (!sendRes.ok) throw new Error(sendJson?.error?.message || "Gmail send failed");
  return sendJson;
}

export async function POST(req: Request, ctx: { params: Promise<{ requestId: string }> }) {
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

  if (rErr || !r) return Response.json({ error: rErr?.message || "Request not found" }, { status: 404 });

  if (String((r as any).status) === "processing") {
    return Response.json({ error: "Request already processing" }, { status: 409 });
  }

  // Mark processing
  await supabaseServer.from("admin_send_requests").update({ status: "processing", error: null }).eq("id", requestId);

  try {
    const employerId = String((r as any).employer_id);
    const templateId = String((r as any).template_id);
    const employeeIds = Array.isArray((r as any).employee_ids) ? (r as any).employee_ids : [];

    // Employer
    const { data: employer, error: empErr } = await supabaseServer
      .from("employers")
      .select("id, name, support_email, effective_date, opt_out_deadline")
      .eq("id", employerId)
      .maybeSingle();
    if (empErr || !employer) throw new Error("Employer not found");

    // Template
    const { data: tmpl, error: tmplErr } = await supabaseServer
      .from("email_templates")
      .select("id, subject, body, is_active")
      .eq("id", templateId)
      .maybeSingle();
    if (tmplErr || !tmpl) throw new Error("Template not found");
    if ((tmpl as any).is_active === false) throw new Error("Template archived");

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

      if (!to.includes("@")) { failed.push({ employee_id: (e as any).id, error: "Missing/invalid employee email" }); continue; }
      if (!token) { failed.push({ employee_id: (e as any).id, error: "Missing employee token" }); continue; }
      if (!eligible) { failed.push({ employee_id: (e as any).id, error: "Employee marked ineligible" }); continue; }
      if (optedOut) { failed.push({ employee_id: (e as any).id, error: "Employee opted out" }); continue; }

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

      const subject = renderTemplate(String((tmpl as any).subject || ""), vars);
      const text = renderTemplate(String((tmpl as any).body || ""), vars);

      try {
        await sendGmail({
          from: adminSender,
          to,
          subject: subject || "Benefits Notice",
          text: text || "",
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

    return Response.json({ error: err?.message || "Failed to process request" }, { status: 500 });
  }
}