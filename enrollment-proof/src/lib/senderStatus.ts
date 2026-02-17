import { supabaseServer } from "@/lib/supabaseServer";

export async function getSenderStatus(args: {
  viewer: "admin" | "hr";
  employerId?: string | null;
  hrUserId?: string | null;
}) {
  if (args.viewer === "admin") {
    const adminEmail = String(process.env.ADMIN_SENDER_EMAIL || "").trim().toLowerCase();
    if (!adminEmail) return { connected: false, reason: "ADMIN_SENDER_EMAIL not set" };

    const { data, error } = await supabaseServer
      .from("gmail_accounts")
      .select("user_email, status, refresh_token, expires_at")
      .eq("user_email", adminEmail)
      .is("employer_id", null)
      .maybeSingle();

    if (error) return { connected: false, reason: error.message };
    if (!data) return { connected: false, reason: "Admin sender not connected" };
    if (String((data as any).status) !== "approved") return { connected: false, reason: "Admin sender not approved" };
    if (!(data as any).refresh_token) return { connected: false, reason: "Admin sender missing refresh token" };

    return { connected: true, email: adminEmail };
  }

  // HR
  const employerId = String(args.employerId || "").trim();
  const hrUserId = String(args.hrUserId || "").trim();

  if (!employerId) return { connected: false, reason: "Missing employerId" };
  if (!hrUserId) return { connected: false, reason: "Missing hrUserId" };

  const { data, error } = await supabaseServer
    .from("gmail_accounts")
    .select("user_email, status, refresh_token, employer_id, connected_by_hr_user_id")
    .eq("employer_id", employerId)
    .eq("connected_by_hr_user_id", hrUserId)
    .eq("status", "approved")
    .maybeSingle();

  if (error) return { connected: false, reason: error.message };
  if (!data) return { connected: false, reason: "No approved HR sender connected for this employer" };
  if (!(data as any).refresh_token) return { connected: false, reason: "HR sender missing refresh token" };

  return { connected: true, email: String((data as any).user_email || "") };
}