import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";

function isExpired(expiresAt: string | null | undefined) {
  if (!expiresAt) return true;
  const t = new Date(String(expiresAt)).getTime();
  if (Number.isNaN(t)) return true;
  return Date.now() > t;
}

/**
 * ✅ Require HR session. Redirects to /login if missing/invalid.
 * Returns { hr_user_id } for convenience.
 */
export async function requireHr() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("rrs_hr_session")?.value || "";
  if (!sessionToken) redirect("/login");

  const { data: session, error: sessErr } = await supabaseServer
    .from("hr_sessions")
    .select("id, hr_user_id, expires_at")
    .eq("session_token", sessionToken)
    .maybeSingle();

  if (sessErr || !session || isExpired(session.expires_at)) {
    redirect("/login");
  }

  return { hr_user_id: String(session.hr_user_id) };
}

/**
 * ✅ Require HR AND require that HR user is assigned to this employer.
 * Redirects to /login if session invalid, otherwise /hr if not assigned.
 */
export async function requireHrForEmployer(employerId: string) {
  const { hr_user_id } = await requireHr();

  const { data: allowed, error: allowErr } = await supabaseServer
    .from("hr_user_employers")
    .select("id")
    .eq("hr_user_id", hr_user_id)
    .eq("employer_id", employerId)
    .maybeSingle();

  if (allowErr || !allowed) {
    redirect("/hr");
  }

  return { hr_user_id };
}