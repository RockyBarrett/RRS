import Link from "next/link";

export default function HrLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Premium accent bar */}
      <div
        style={{
          height: 15,
          background: "#355A7C",
        }}
      />

      {/* Top nav */}
      <div
        style={{
          background: "#ffffff",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "14px 32px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontFamily: "system-ui, -apple-system, BlinkMacSystemFont",
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 16, color: "#0f172a" }}>
            Employer Portal
          </div>

          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <Link
              href="/hr"
              style={{
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
                color: "#0f172a",
              }}
            >
              Dashboard
            </Link>

            <a
              href="/api/auth/logout?returnTo=/login"
              style={{
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
                color: "#b91c1c",
              }}
            >
              Logout
            </a>
          </div>
        </div>
      </div>

      {/* Page content */}
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: 32,
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont",
          color: "#0f172a",
        }}
      >
        {children}
      </div>
    </div>
  );
}