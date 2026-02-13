import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

type EventBody = {
  token?: string;
  event_type?: string;
};

export async function POST(req: Request): Promise<Response> {
  let body: EventBody = {};
  try {
    body = (await req.json()) as EventBody;
  } catch {}

  const token = body.token?.trim();
  const event_type = body.event_type?.trim();

  if (!token || !event_type) {
    return Response.json(
      { error: "Missing token or event_type" },
      { status: 400 }
    );
  }

  const { data: employeeRaw, error: empErr } = await supabaseServer
    .from("employees")
    .select(
      [
        "id",
        "employer_id",
        "notice_viewed_at",
        "learn_more_viewed_at",
        "notice_sent_at",
      ].join(",")
    )
    .eq("token", token)
    .maybeSingle();

  if (empErr) return Response.json({ error: empErr.message }, { status: 500 });
  if (!employeeRaw) return Response.json({ error: "Invalid token" }, { status: 404 });

  // ✅ Cast once to avoid GenericStringError union headaches in TS
  const employee = employeeRaw as any;

  const ua = req.headers.get("user-agent") || null;
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;

  const now = new Date().toISOString();

  // 1) Insert event log (audit trail)
  const { error: insErr } = await supabaseServer.from("events").insert({
    employer_id: employee.employer_id,
    employee_id: employee.id,
    event_type,
    user_agent: ua,
    ip,
    created_at: now,
  });

  if (insErr) return Response.json({ error: insErr.message }, { status: 500 });

  // 2) Update employee "first view" timestamps (do not overwrite)
  if (event_type === "page_view" && !employee.notice_viewed_at) {
    const { error: upErr } = await supabaseServer
      .from("employees")
      .update({ notice_viewed_at: now })
      .eq("id", employee.id)
      .is("notice_viewed_at", null);

    if (upErr) return Response.json({ error: upErr.message }, { status: 500 });
  }

  if (event_type === "learn_more_view" && !employee.learn_more_viewed_at) {
    const { error: upErr } = await supabaseServer
      .from("employees")
      .update({ learn_more_viewed_at: now })
      .eq("id", employee.id)
      .is("learn_more_viewed_at", null);

    if (upErr) return Response.json({ error: upErr.message }, { status: 500 });
  }

  // Optional: if you ever log this through /api/events
  if (event_type === "enrollment_notice_sent" && !employee.notice_sent_at) {
    const { error: upErr } = await supabaseServer
      .from("employees")
      .update({ notice_sent_at: now })
      .eq("id", employee.id)
      .is("notice_sent_at", null);

    if (upErr) return Response.json({ error: upErr.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}