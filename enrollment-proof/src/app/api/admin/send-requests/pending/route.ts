import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function GET() {
  // Optional guard
  // If you want to require a key even to view:
  // (leave off for now if you want)
  const { data, error } = await supabaseServer
    .from("admin_send_requests")
    .select("id, employer_id, requested_by_hr_user_id, template_id, employee_ids, status, error, created_at, processed_at")
    .in("status", ["pending", "failed"])
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, requests: data ?? [] });
}