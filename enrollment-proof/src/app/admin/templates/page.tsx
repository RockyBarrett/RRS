import Link from "next/link";
import { cardStyle, subtleText, buttonStyle, buttonPrimaryStyle } from "@/app/admin/_ui";
import TemplatesClient from "./templates-client";

export const dynamic = "force-dynamic";

export default function TemplatesPage() {
  return (
    <main style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        <Link href="/admin" style={{ fontSize: 14 }}>
          ← Back to Admin
        </Link>

        <a href="/admin" style={buttonStyle}>
          Admin Home →
        </a>
      </div>

      {/* Header */}
      <div style={{ ...cardStyle, padding: 18, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 30, letterSpacing: -0.4, color: "#0f172a" }}>Email Templates</h1>
            <div style={{ ...subtleText, marginTop: 8, lineHeight: 1.6 }}>
              Create reusable templates for <strong style={{ color: "#0f172a" }}>Enrollment</strong> and{" "}
              <strong style={{ color: "#0f172a" }}>Compliance</strong> sends.
              <br />
              (Later: we’ll reuse this for HR accounts.)
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start" }}>
            <div
              style={{
                ...subtleText,
                fontSize: 12,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: 12,
                maxWidth: 340,
              }}
            >
              <div style={{ fontWeight: 900, color: "#0f172a", marginBottom: 6 }}>Variables (v1)</div>
              <div style={{ lineHeight: 1.6 }}>
                Insert variables like <code>{"{{employee.first_name}}"}</code>, <code>{"{{links.notice}}"}</code>, etc.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Client */}
      <div style={{ ...cardStyle, overflow: "hidden" }}>
        <div
          style={{
            padding: 16,
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            background: "#ffffff",
          }}
        >
          <div style={{ fontWeight: 900 }}>Manage Templates</div>
          <a href="/admin/templates" style={buttonPrimaryStyle}>
            Refresh
          </a>
        </div>

        <div style={{ padding: 16 }}>
          <TemplatesClient />
        </div>
      </div>
    </main>
  );
}