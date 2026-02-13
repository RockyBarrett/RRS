import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

function csvEscape(value: any) {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await ctx.params;

  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

  // 1) Load employer
  const { data: employer, error: employerErr } = await supabaseServer
    .from("employers")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();

  if (employerErr || !employer) {
    return new Response("Employer not found", { status: 404 });
  }

  // 2) Load employees + events
  const { data: employeesRaw, error: empErr } = await supabaseServer
    .from("employees")
    .select(`
      employee_ref,
      first_name,
      last_name,
      email,
      phone,
      token,
      eligible,
      opted_out_at,
      events ( event_type )
    `)
    .eq("employer_id", id)
    .order("last_name", { ascending: true });

  if (empErr) {
    return new Response(`Error loading employees: ${empErr.message}`, {
      status: 500,
    });
  }

  // 3) Normalize rows
  const employees = (employeesRaw ?? []).map((e: any) => {
    const viewed = Array.isArray(e.events)
      ? e.events.some((ev: any) => ev.event_type === "page_view")
      : false;

    const noticeLink = e.token ? `${baseUrl}/notice/${e.token}` : "";

    const status = e.opted_out_at
      ? "Opted out"
      : viewed
      ? "Active"
      : "Pending";

    return { ...e, viewed, noticeLink, status };
  });

  // 4) Build CSV
  const headers = [
    "employee_ref",
    "first_name",
    "last_name",
    "email",
    "phone",
    "eligible",
    "viewed",
    "opted_out_at",
    "status",
    "notice_link",
  ];

  const rows = employees.map((e: any) => [
    e.employee_ref ?? "",
    e.first_name ?? "",
    e.last_name ?? "",
    e.email ?? "",
    e.phone ?? "",
    e.eligible ? "true" : "false",
    e.viewed ? "true" : "false",
    e.opted_out_at ?? "",
    e.status ?? "",
    e.noticeLink ?? "",
  ]);

  const csv =
    headers.join(",") +
    "\n" +
    rows.map((r: any[]) => r.map(csvEscape).join(",")).join("\n");

  const safeName = (employer.name || "employer")
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

  const filename = `${safeName}_employee_status_export.csv`;

  // 5) Return file
  return new Response(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}