import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabaseServer";

async function getHrUserIdFromSession(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get("rrs_hr_session")?.value;
  if (!token) return null;

  const { data, error } = await supabaseServer
    .from("hr_sessions")
    .select("hr_user_id, expires_at")
    .eq("session_token", token)
    .maybeSingle();

  if (error || !data?.hr_user_id) return null;

  const exp = new Date(String((data as any).expires_at || "")).getTime();
  if (exp && Date.now() > exp) return null;

  return String((data as any).hr_user_id);
}

export async function getConnectedEmail(args: {
  mode: "admin" | "hr";
  employerId: string;
}): Promise<{ connectedEmail: string | null; reason?: string }> {
  // --------------------
  // ADMIN (system sender)
  // --------------------
  if (args.mode === "admin") {
    const adminEmail = String(process.env.ADMIN_SENDER_EMAIL || "").trim().toLowerCase();
    if (!adminEmail) return { connectedEmail: null, reason: "ADMIN_SENDER_EMAIL missing" };

    // ✅ Pick the newest APPROVED admin sender that actually has refresh_token
    const { data, error } = await supabaseServer
      .from("gmail_accounts")
      .select("user_email, status, refresh_token, created_at, employer_id")
      .eq("user_email", adminEmail)
      .is("employer_id", null)
      .eq("status", "approved")
      .not("refresh_token", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return { connectedEmail: null, reason: error.message };
    if (!data) return { connectedEmail: null, reason: "No approved admin sender with refresh_token" };

    return { connectedEmail: adminEmail };
  }

  // --------------------
  // HR (employer sender)
  // --------------------
  const hrUserId = await getHrUserIdFromSession();
  if (!hrUserId) return { connectedEmail: null, reason: "HR session missing/expired" };

  const { data, error } = await supabaseServer
    .from("gmail_accounts")
    .select("user_email, status, refresh_token, connected_by_hr_user_id, employer_id, created_at")
    .eq("employer_id", args.employerId)
    .eq("connected_by_hr_user_id", hrUserId)
    .eq("status", "approved")
    .not("refresh_token", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { connectedEmail: null, reason: error.message };
  if (!data) return { connectedEmail: null, reason: "No approved HR sender for this employer (with refresh_token)" };

  return {
    connectedEmail: String((data as any).user_email || "").trim().toLowerCase() || null,
  };
}