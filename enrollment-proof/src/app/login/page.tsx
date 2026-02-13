// /src/app/login/page.tsx
import Link from "next/link";
import ContinueMenu from "@/app/_components/auth/ContinueMenu";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Premium accent bar */}
      <div style={{ height: 15, background: "#355A7C" }} />

      {/* White top header (brand only) */}
      <div style={{ background: "#ffffff", borderBottom: "1px solid #e5e7eb" }}>
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "16px 32px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontFamily: "system-ui, -apple-system, BlinkMacSystemFont",
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 16, color: "#0f172a" }}>
            Enrollment Portal
          </div>

          <Link
            href="/"
            style={{
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
              color: "#0f172a",
            }}
          >
            Back to site
          </Link>
        </div>
      </div>

      {/* Sign-in heading (centered, cleaner hierarchy) */}
      <div
        style={{
          maxWidth: 900,
          margin: "48px auto 0 auto",
          padding: "0 32px",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 38,
            letterSpacing: -0.5,
            color: "#0f172a",
          }}
        >
          Sign in
        </h1>

        <div
          style={{
            marginTop: 10,
            fontSize: 16,
            color: "#64748b",
            lineHeight: 1.6,
          }}
        >
          Choose where you want to sign in. We’ll route you to the correct workspace.
        </div>
      </div>

      {/* Page content */}
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "28px 32px 32px",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont",
          color: "#0f172a",
        }}
      >
        <div style={{ display: "grid", justifyContent: "center" }}>
          <div
            style={{
              width: "min(900px, 100%)",
              background: "#ffffff",
              borderRadius: 18,
              border: "1px solid #e5e7eb",
              boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: 16, borderBottom: "1px solid #e5e7eb" }}>
              <div style={{ fontWeight: 900 }}>Choose portal</div>
              <div style={{ marginTop: 4, fontSize: 12, color: "#64748b" }}>
                Continue with Gmail or Microsoft (work/school).
              </div>
            </div>

            <div style={{ padding: 16, display: "grid", gap: 12 }}>
              {/* HR */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  borderRadius: 16,
                  border: "1px solid #e5e7eb",
                  background: "#ffffff",
                }}
              >
                <div>
                  <div style={{ fontWeight: 900 }}>HR Portal</div>
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 13,
                      color: "#64748b",
                      lineHeight: 1.5,
                    }}
                  >
                    Send notices, track engagement, manage enrollment & compliance.
                  </div>
                </div>

                <ContinueMenu returnTo="/hr" variant="dark" />
              </div>

              {/* Admin */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  borderRadius: 16,
                  border: "1px solid #e5e7eb",
                  background: "#f9fafb",
                }}
              >
                <div>
                  <div style={{ fontWeight: 900 }}>Admin</div>
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 13,
                      color: "#64748b",
                      lineHeight: 1.5,
                    }}
                  >
                    Internal administrators only: employers, templates, compliance tooling.
                  </div>
                </div>

                <ContinueMenu returnTo="/admin" variant="light" />
              </div>

              <div
                style={{
                  marginTop: 4,
                  padding: 12,
                  borderRadius: 14,
                  border: "1px dashed #cbd5e1",
                  background: "#f8fafc",
                  color: "#475569",
                  fontSize: 12,
                  textAlign: "left",
                }}
              >
                Tip: If you ever land in the wrong portal, hit{" "}
                <strong style={{ color: "#0f172a" }}>Logout</strong>.
              </div>
            </div>

            <div
              style={{
                padding: "12px 16px",
                borderTop: "1px solid #e5e7eb",
                color: "#94a3b8",
                fontSize: 12,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <div>© {new Date().getFullYear()} Revenue Return Specialists</div>
              <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                Secure sign-in
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}