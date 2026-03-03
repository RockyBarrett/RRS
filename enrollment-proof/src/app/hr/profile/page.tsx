import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabaseServer";
import { cardStyle, subtleText, buttonStyle } from "@/app/admin/_ui";

export const dynamic = "force-dynamic";

function isExpired(expiresAt: string | null | undefined) {
  if (!expiresAt) return true;
  const t = new Date(String(expiresAt)).getTime();
  if (Number.isNaN(t)) return true;
  return Date.now() > t;
}

export default async function HrProfilePage() {
  // ✅ HR session
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("rrs_hr_session")?.value || "";
  if (!sessionToken) redirect("/login");

  const { data: session, error: sessErr } = await supabaseServer
    .from("hr_sessions")
    .select("hr_user_id, expires_at")
    .eq("session_token", sessionToken)
    .maybeSingle();

  if (sessErr || !session || isExpired((session as any).expires_at)) redirect("/login");

  const hrUserId = String((session as any).hr_user_id);

  const { data: hrUser, error: hrErr } = await supabaseServer
    .from("hr_users")
    .select("id, email, display_name, signature_html")
    .eq("id", hrUserId)
    .maybeSingle();

  if (hrErr || !hrUser) {
    return (
      <main style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ ...cardStyle, padding: 18 }}>
          <h1 style={{ margin: 0 }}>Profile</h1>
          <p style={{ marginTop: 10, ...subtleText }}>Unable to load your profile.</p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 14 }}>
        <Link href="/hr" style={{ fontSize: 14 }}>
          ← Back to Employer Portal
        </Link>
      </div>

      <div style={{ ...cardStyle, padding: 18 }}>
        <h1 style={{ margin: 0, fontSize: 30 }}>Profile</h1>
        <div style={{ ...subtleText, marginTop: 8 }}>
          Signed in as <strong style={{ color: "#111827" }}>{String((hrUser as any).email || "")}</strong>
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Email Signature</div>
          <div style={{ ...subtleText, marginBottom: 10 }}>
            This signature will be appended to notices you send (Gmail or Microsoft).
          </div>

          <form action="/api/hr/profile/signature" method="post">
            <textarea
              name="signature_html"
              defaultValue={String((hrUser as any).signature_html || "")}
              placeholder={`Example:\n<div style="font-size:13px;color:#111827;">\n  <strong>Your Name</strong><br/>\n  HR Manager\n</div>`}
              style={{
                width: "100%",
                minHeight: 180,
                padding: 12,
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                fontSize: 14,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              }}
            />

            <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
              <button type="submit" style={{ ...buttonStyle, fontWeight: 900 }}>
                Save signature
              </button>

              <span style={{ ...subtleText, fontSize: 12 }}>
                Tip: keep it simple HTML (div / br / strong). No scripts.
              </span>
            </div>
          </form>

          <div style={{ marginTop: 18 }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Preview</div>
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 12,
                background: "#ffffff",
              }}
              dangerouslySetInnerHTML={{
                __html: String((hrUser as any).signature_html || "") || "<span style='color:#6b7280;'>No signature yet.</span>",
              }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}