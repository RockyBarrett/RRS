import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

function cleanStr(v: any) {
  return String(v ?? "").trim();
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({} as any));

  const patch: any = {};

  if (body.name !== undefined) patch.name = cleanStr(body.name);
  if (body.category !== undefined) patch.category = cleanStr(body.category);
  if (body.subject !== undefined) patch.subject = cleanStr(body.subject);
  if (body.body !== undefined) patch.body = cleanStr(body.body);
  if (body.is_active !== undefined) patch.is_active = !!body.is_active;

  if (patch.category && patch.category !== "enrollment" && patch.category !== "compliance") {
    return Response.json({ error: "Invalid category (enrollment|compliance)" }, { status: 400 });
  }

  // basic guardrails
  if ("name" in patch && !patch.name) return Response.json({ error: "Name cannot be blank" }, { status: 400 });
  if ("subject" in patch && !patch.subject) return Response.json({ error: "Subject cannot be blank" }, { status: 400 });
  if ("body" in patch && !patch.body) return Response.json({ error: "Body cannot be blank" }, { status: 400 });

  const { data, error } = await supabaseServer
    .from("email_templates")
    .update(patch)
    .eq("id", id)
    .select("id, name, category, subject, body, is_active, created_at, updated_at")
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: "Template not found" }, { status: 404 });

  return Response.json({ ok: true, template: data });
}