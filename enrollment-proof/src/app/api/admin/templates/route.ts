import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

function cleanStr(v: any) {
  return String(v ?? "").trim();
}

export async function GET() {
  const { data, error } = await supabaseServer
    .from("email_templates")
    .select("id, name, category, subject, body, body_html, is_active, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, templates: data ?? [] });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));

  const name = cleanStr(body.name);
  const category = cleanStr(body.category);
  const subject = cleanStr(body.subject);

  const templateBody = cleanStr(body.body);
  const templateBodyHtml = body.body_html == null ? null : String(body.body_html);

  if (!name) return Response.json({ error: "Missing name" }, { status: 400 });
  if (category !== "enrollment" && category !== "compliance") {
    return Response.json({ error: "Invalid category (enrollment|compliance)" }, { status: 400 });
  }
  if (!subject) return Response.json({ error: "Missing subject" }, { status: 400 });
  if (!templateBody) return Response.json({ error: "Missing body" }, { status: 400 });

  const { data, error } = await supabaseServer
    .from("email_templates")
    .insert({
      name,
      category,
      subject,
      body: templateBody,
      body_html: templateBodyHtml,
      is_active: true,
    })
    .select("id, name, category, subject, body, body_html, is_active, created_at, updated_at")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, template: data });
}