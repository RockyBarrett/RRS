import { supabaseServer } from "@/lib/supabaseServer";
import { ensureActivePlanYear } from "@/lib/planYear";

export const runtime = "nodejs";

type Body = {
  name?: string;
  support_email?: string;
  effective_date?: string; // YYYY-MM-DD
  opt_out_deadline?: string; // YYYY-MM-DD
};

function isISODate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function POST(req: Request): Promise<Response> {
  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {}

  const name = (body.name || "").trim();
  const support_email = (body.support_email || "").trim();
  const effective_date = (body.effective_date || "").trim();
  const opt_out_deadline = (body.opt_out_deadline || "").trim();

  if (!name) {
    return Response.json({ error: "Employer name is required." }, { status: 400 });
  }

  if (!support_email || !support_email.includes("@")) {
    return Response.json({ error: "A valid support email is required." }, { status: 400 });
  }

  if (!effective_date || !isISODate(effective_date)) {
    return Response.json({ error: "Effective date must be YYYY-MM-DD." }, { status: 400 });
  }

  if (!opt_out_deadline || !isISODate(opt_out_deadline)) {
    return Response.json({ error: "Opt-out deadline must be YYYY-MM-DD." }, { status: 400 });
  }

  // Opt-out deadline must be on or before effective date
  const eff = new Date(`${effective_date}T00:00:00Z`).getTime();
  const dead = new Date(`${opt_out_deadline}T00:00:00Z`).getTime();
  if (Number.isNaN(eff) || Number.isNaN(dead)) {
    return Response.json({ error: "Invalid date values." }, { status: 400 });
  }
  if (dead > eff) {
    return Response.json(
      { error: "Opt-out deadline should be on or before the effective date." },
      { status: 400 }
    );
  }

  // 1️⃣ Create employer
  const { data, error } = await supabaseServer
    .from("employers")
    .insert({
      name,
      support_email,
      effective_date,
      opt_out_deadline,
    })
    .select("id")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // 2️⃣ Auto-create ACTIVE plan year (deterministic)
  await ensureActivePlanYear({
    employerId: data.id,
    effectiveDate: effective_date,
    lengthMonths: 12, // default; we can expose this later
  });

  return Response.json({ ok: true, id: data.id });
}