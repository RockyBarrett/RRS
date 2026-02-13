import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Accent bar */}
      <div style={{ height: 15, background: "#355A7C" }} />

      {/* White header */}
      <div
        style={{
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "14px 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            fontFamily: "system-ui, -apple-system, BlinkMacSystemFont",
          }}
        >
          <div style={{ fontWeight: 900, color: "#0f172a" }}>Admin</div>

          <div style={{ display: "flex", gap: 14, alignItems: "center", fontSize: 13 }}>
            <Link href="/admin" style={{ color: "#0f172a", fontWeight: 800, textDecoration: "none" }}>
              Dashboard
            </Link>
            <a href="/api/auth/logout?returnTo=/login" style={{ color: "#b91c1c", fontWeight: 900, textDecoration: "none" }}>
              Logout
            </a>
          </div>
        </div>
      </div>

      {/* Page container */}
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: 32,
          color: "#0f172a",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont",
        }}
      >
        {children}
      </div>
    </div>
  );
}