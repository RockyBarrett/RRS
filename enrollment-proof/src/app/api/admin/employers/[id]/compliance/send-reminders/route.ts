import { supabaseServer } from "@/lib/supabaseServer";
import { buildComplianceReminderEmail } from "@/lib/email/templates/complianceReminder";

export const runtime = "nodejs";

type Body = {
  plan_year_id?: string;
  employee_id?: string;
  employee_ids?: string[];
};

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

async function refreshAccessToken(refreshToken: string) {
  const client_id = requireEnv("GOOGLE_CLIENT_ID");
  const client_secret = requireEnv("GOOGLE_CLIENT_SECRET");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id,
      client_secret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const json = await res.json().catch(() => ({} as any));
  if (!res.ok || !json.access_token) {
    throw new Error(json?.error_description || json?.error || "Failed to refresh access token");
  }

  return {
    access_token: json.access_token as string,
    expires_in: json.expires_in as number,
  };
}

async function sendGmail(opts: {
  accessToken: string;
  from: string;
  to: string;
  subject: string;
  text: string;
}) {
  const raw = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    `Subject: ${opts.subject}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    ``,
    opts.text,
  ].join("\r\n");

  const sendRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ raw: b64url(raw) }),
  });

  const sendJson = await sendRes.json().catch(() => ({} as any));
  if (!sendRes.ok) {
    throw new Error(sendJson?.error?.message || sendJson?.error || "Gmail send failed");
  }

  return sendJson?.id as string | undefined;
}

async function safeInsertEvent(row: any) {
  const { error } = await supabaseServer.from("events").insert(row);
  if (error) console.error("EVENT_INSERT_FAILED:", error);
}

async function safeUpdateEpy(opts: { planYearId: string; employeeId: string; patch: any }) {
  const { error } = await supabaseServer
    .from("employee_plan_year")
    .update(opts.patch)
    .eq("plan_year_id", opts.planYearId)
    .eq("employee_id", opts.employeeId);

  if (error) console.error("EPY_UPDATE_FAILED:", error);
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id: employerId } = await ctx.params;

    const body = (await req.json().catch(() => ({}))) as Body;

    const planYearId = String(body.plan_year_id || "").trim();
    if (!planYearId) return Response.json({ ok: false, error: "Missing plan_year_id" }, { status: 400 });

    const ids = (body.employee_ids ?? (body.employee_id ? [body.employee_id] : [])).filter(Boolean);
    if (!ids.length) return Response.json({ ok: false, error: "Missing employee_id(s)" }, { status: 400 });

    // Employer (template fields)
    const { data: employer, error: empErr } = await supabaseServer
      .from("employers")
      .select("id, name, support_email")
      .eq("id", employerId)
      .maybeSingle();

    if (empErr) {
      console.error("EMPLOYER_SELECT_FAILED:", empErr);
      return Response.json({ ok: false, error: empErr.message }, { status: 500 });
    }
    if (!employer) return Response.json({ ok: false, error: "Employer not found" }, { status: 404 });

    // Employees
    const { data: employees, error: eErr } = await supabaseServer
      .from("employees")
      .select("id, email, first_name, last_name")
      .eq("employer_id", employerId)
      .in("id", ids);

    if (eErr) {
      console.error("EMPLOYEES_SELECT_FAILED:", eErr);
      return Response.json({ ok: false, error: eErr.message }, { status: 500 });
    }

    // EPY links (ONE query) — NO FALLBACK ALLOWED
    const { data: epyRows, error: epyErr } = await supabaseServer
      .from("employee_plan_year")
      .select("employee_id, attentive_invitation_url")
      .eq("plan_year_id", planYearId)
      .in("employee_id", ids);

    if (epyErr) {
      console.error("EPY_SELECT_FAILED:", epyErr);
      return Response.json({ ok: false, error: epyErr.message }, { status: 500 });
    }

    const portalLinkByEmployeeId = new Map<string, string>();
    for (const r of epyRows ?? []) {
      const eid = String((r as any).employee_id);
      const url = String((r as any).attentive_invitation_url || "").trim();
      if (url) portalLinkByEmployeeId.set(eid, url);
    }

    // Gmail account
    const { data: acct, error: acctErr } = await supabaseServer
      .from("gmail_accounts")
      .select("user_email, access_token, refresh_token, expires_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (acctErr) {
      console.error("GMAIL_ACCT_SELECT_FAILED:", acctErr);
      return Response.json({ ok: false, error: acctErr.message }, { status: 500 });
    }
    if (!acct) return Response.json({ ok: false, error: "No Gmail account connected" }, { status: 400 });

    let accessToken = String((acct as any).access_token || "");
    const refreshToken = String((acct as any).refresh_token || "");
    const expiresAtStr = String((acct as any).expires_at || "");
    const expiresAtMs = expiresAtStr ? new Date(expiresAtStr).getTime() : 0;

    if (!refreshToken) return Response.json({ ok: false, error: "Missing refresh_token" }, { status: 500 });

    // Refresh if expired or within 60s
    if (!accessToken || !expiresAtMs || Date.now() > expiresAtMs - 60_000) {
      const refreshed = await refreshAccessToken(refreshToken);
      accessToken = refreshed.access_token;

      const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
      const { error: upErr } = await supabaseServer
        .from("gmail_accounts")
        .update({ access_token: accessToken, expires_at: newExpiresAt })
        .eq("user_email", (acct as any).user_email);

      if (upErr) console.error("GMAIL_ACCT_UPDATE_FAILED:", upErr);
    }

    const from = String((acct as any).user_email);

    let attempted = 0;
    let sent = 0;
    let skippedMissingLink = 0;
    let failed = 0;

    for (const e of employees ?? []) {
      const employeeId = String((e as any).id);
      const to = String((e as any).email || "").trim();
      if (!to) continue;

      attempted++;

      const first = String((e as any).first_name || "").trim();
      const last = String((e as any).last_name || "").trim();
      const name = `${first} ${last}`.trim() || first || "there";

      const portalLink = portalLinkByEmployeeId.get(employeeId) || "";

      // 🚫 NO FALLBACK
      if (!portalLink) {
        skippedMissingLink++;

        await safeInsertEvent({
          employer_id: employerId,
          employee_id: employeeId,
          event_type: "compliance_email_skipped_missing_portal_link",
          user_agent: null,
          ip: null,
        });

        continue;
      }

      const tpl = buildComplianceReminderEmail({
        name,
        attentivePortalLink: portalLink,
        employerName: String((employer as any).name || ""),
        supportEmail: String((employer as any).support_email || ""),
      });

      try {
        await sendGmail({
          accessToken,
          from,
          to,
          subject: tpl.subject,
          text: tpl.text,
        });

        // ✅ source of truth for “Last reminder” column in UI
        await safeUpdateEpy({
          planYearId,
          employeeId,
          patch: { last_reminder_at: new Date().toISOString() },
        });

        // ✅ immutable audit log (single event is enough)
        await safeInsertEvent({
          employer_id: employerId,
          employee_id: employeeId,
          event_type: "compliance_email_reminder_sent",
          user_agent: null,
          ip: null,
        });

        sent++;
      } catch (err: any) {
        failed++;
        console.error("SEND_ONE_FAILED:", { employeeId, to, message: err?.message ?? String(err) });

        await safeInsertEvent({
          employer_id: employerId,
          employee_id: employeeId,
          event_type: "compliance_email_reminder_failed",
          user_agent: null,
          ip: null,
        });
      }
    }

    return Response.json({ ok: true, attempted, sent, failed, skippedMissingLink, from });
  } catch (err: any) {
    console.error("SEND_REMINDERS_FATAL:", err);
    return Response.json(
      { ok: false, error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}