import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const key = req.headers.get("x-admin-key") || "";
  if (!process.env.ADMIN_API_KEY || key !== process.env.ADMIN_API_KEY) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const email = String(body?.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return Response.json({ error: "Missing/invalid email" }, { status: 400 });
  }

  const { error } = await supabaseServer
    .from("gmail_accounts")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
    })
    .eq("user_email", email);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true, email });
}