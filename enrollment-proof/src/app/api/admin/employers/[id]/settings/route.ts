import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: employerId } = await ctx.params;

  const body = await req.json().catch(() => ({} as any));

  const name = String(body?.name || "").trim();
  const effective_date = String(body?.effective_date || "").trim();
  const opt_out_deadline = String(body?.opt_out_deadline || "").trim();
  const support_email = String(body?.support_email || "").trim();

  if (!name) {
    return Response.json({ error: "Missing name" }, { status: 400 });
  }

  // basic YYYY-MM-DD check
  const isYYYYMMDD = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
  if (!isYYYYMMDD(effective_date)) {
    return Response.json({ error: "Invalid effective_date (expected YYYY-MM-DD)" }, { status: 400 });
  }
  if (!isYYYYMMDD(opt_out_deadline)) {
    return Response.json({ error: "Invalid opt_out_deadline (expected YYYY-MM-DD)" }, { status: 400 });
  }

  // basic email check
  const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  if (!isEmail(support_email)) {
    return Response.json({ error: "Invalid support_email" }, { status: 400 });
  }

  const { error } = await supabaseServer
    .from("employers")
    .update({
      name,
      effective_date,
      opt_out_deadline,
      support_email,
    })
    .eq("id", employerId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}