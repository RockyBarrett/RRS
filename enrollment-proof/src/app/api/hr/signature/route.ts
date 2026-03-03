import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

function stripScripts(html: string) {
  return String(html || "").replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
}

function isExpired(expiresAt: string | null | undefined) {
  if (!expiresAt) return true;
  const t = new Date(String(expiresAt)).getTime();
  if (Number.isNaN(t)) return true;
  return Date.now() > t;
}

export async function POST(req: Request) {
  const jar = await cookies();
  const token = jar.get("rrs_hr_session")?.value || "";
  if (!token) return NextResponse.redirect(new URL("/login", req.url));

  const { data: session } = await supabaseServer
    .from("hr_sessions")
    .select("hr_user_id, expires_at")
    .eq("session_token", token)
    .maybeSingle();

  if (!session || isExpired((session as any).expires_at)) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const form = await req.formData();
  const raw = String(form.get("signature_html") || "");

  const cleaned = stripScripts(raw).trim();
  const hrUserId = String((session as any).hr_user_id);

  const { error } = await supabaseServer
    .from("hr_users")
    .update({ signature_html: cleaned || null })
    .eq("id", hrUserId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.redirect(new URL("/hr/profile", req.url));
}