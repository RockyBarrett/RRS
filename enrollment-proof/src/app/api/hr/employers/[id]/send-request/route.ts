import { supabaseServer } from "@/lib/supabaseServer";
import { cookies } from "next/headers";

export const runtime = "nodejs";

function isUUID(v: any) {
  return typeof v === "string" && /^[0-9a-fA-F-]{36}$/.test(v);
}

function isExpired(expiresAt: string | null | undefined) {
  if (!expiresAt) return true;
  const t = new Date(String(expiresAt)).getTime();
  if (Number.isNaN(t)) return true;
  return Date.now() > t;
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: employerId } = await ctx.params;

  // ✅ HR session
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("rrs_hr_session")?.value || "";
  if (!sessionToken) return Response.json({ error: "Not logged in" }, { status: 401 });

  const { data: session, error: sessErr } = await supabaseServer
    .from("hr_sessions")
    .select("id, hr_user_id, expires_at")
    .eq("session_token", sessionToken)
    .maybeSingle();

  if (sessErr || !session || isExpired(session.expires_at)) {
    return Response.json({ error: "Session expired" }, { status: 401 });
  }

  // ✅ must be assigned to employer
  const { data: allowed, error: allowErr } = await supabaseServer
    .from("hr_user_employers")
    .select("id")
    .eq("hr_user_id", session.hr_user_id)
    .eq("employer_id", employerId)
    .maybeSingle();

  if (allowErr || !allowed) {
    return Response.json({ error: "Not authorized for this employer" }, { status: 403 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const template_id = body?.template_id;
  const employee_ids = Array.isArray(body?.employee_ids) ? body.employee_ids : [];

  if (!isUUID(template_id)) return Response.json({ error: "Missing template_id" }, { status: 400 });

  const ids = employee_ids.filter(isUUID);
  if (ids.length === 0) return Response.json({ error: "Missing employee_ids" }, { status: 400 });

  // Optional: validate employees belong to employer (keeps HR honest)
  const { data: employees, error: empErr } = await supabaseServer
    .from("employees")
    .select("id")
    .eq("employer_id", employerId)
    .in("id", ids);

  if (empErr) return Response.json({ error: empErr.message }, { status: 500 });

  const validIds = (employees ?? []).map((e: any) => String(e.id));
  if (validIds.length === 0) return Response.json({ error: "No valid employees found" }, { status: 400 });

  const { data: created, error: insErr } = await supabaseServer
    .from("admin_send_requests")
    .insert({
      employer_id: employerId,
      requested_by_hr_user_id: session.hr_user_id,
      template_id,
      employee_ids: validIds,
      status: "pending",
    })
    .select("id, status, created_at")
    .single();

  if (insErr || !created) return Response.json({ error: insErr?.message || "Failed to create request" }, { status: 500 });

  // Event log (optional)
  try {
    await supabaseServer.from("events").insert({
      employer_id: employerId,
      employee_id: null,
      event_type: "admin_send_requested",
    });
  } catch {}

  return Response.json({ ok: true, request: created });
}