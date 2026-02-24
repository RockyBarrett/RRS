import Link from "next/link";
import { supabaseServer } from "@/lib/supabaseServer";
import { cardStyle, subtleText, buttonStyle } from "@/app/admin/_ui";

export const dynamic = "force-dynamic";

function isActive(effectiveDate: string | null | undefined) {
  if (!effectiveDate) return false;
  const t = new Date(`${effectiveDate}T00:00:00`).getTime();
  if (Number.isNaN(t)) return false;

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return t <= todayStart; // effective today or earlier
}

function fmtDate(d: string | null | undefined) {
  return d ? String(d) : "—";
}

function EmployerRow({ e }: { e: any }) {
  return (
    <div
      style={{
        padding: 14,
        borderTop: "1px solid #e5e7eb",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <div style={{ minWidth: 280 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
  <div style={{ fontWeight: 900, fontSize: 15, color: "#111827" }}>{e.name}</div>

  <span
    style={{
      fontSize: 11,
      fontWeight: 900,
      padding: "3px 8px",
      borderRadius: 999,
      border: "1px solid #e5e7eb",
      background: "#ffffff",
      color: "#111827",
    }}
  >
    {e.enrollment_type === "active" ? "Active Enrollment" : "Passive Enrollment"}
  </span>
</div>

        <div style={{ ...subtleText, fontSize: 13, marginTop: 6, lineHeight: 1.6 }}>
          Effective: <strong style={{ color: "#111827" }}>{fmtDate(e.effective_date)}</strong>
          {" · "}
          Opt-out deadline: <strong style={{ color: "#111827" }}>{fmtDate(e.opt_out_deadline)}</strong>
          <br />
          Support: <strong style={{ color: "#111827" }}>{String(e.support_email || "")}</strong>
        </div>

        <div style={{ ...subtleText, fontSize: 12, marginTop: 6 }}>
          Employer ID:{" "}
          <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: "#111827" }}>
            {e.id}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <Link href={`/admin/employers/${e.id}`} style={buttonStyle}>
          Open →
        </Link>
      </div>
    </div>
  );
}

export default async function AdminHome() {
  const { data: employers, error } = await supabaseServer
    .from("employers")
    .select("id, name, effective_date, opt_out_deadline, support_email, created_at, enrollment_type")
    .order("created_at", { ascending: false });

  const list = employers ?? [];

  const liveEmployers = list.filter((e: any) => isActive(e.effective_date));
const enrollingEmployers = list.filter((e: any) => !isActive(e.effective_date));

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
        <div>
          <h1 style={{ margin: "10px 0 6px 0", fontSize: 34, letterSpacing: -0.4 }}>Admin</h1>
          <div style={{ ...subtleText, fontSize: 13 }}>
            Create employers, upload employee CSVs, track notice engagement, and manage compliance.
          </div>
          {error && (
            <div style={{ marginTop: 10, color: "#b91c1c", fontWeight: 800 }}>
              Error loading employers: {error.message}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
  <a
    href="/admin/send-requests"
    style={{
      padding: "10px 12px",
      borderRadius: 12,
      border: "1px solid #e5e7eb",
      fontWeight: 900,
      textDecoration: "none",
      fontSize: 13,
      background: "#ffffff",
      color: "#111827",
      display: "inline-block",
      whiteSpace: "nowrap",
    }}
  >
    Send Requests
  </a>

  <a
    href="/admin/employers/new"
    style={{
      padding: "10px 12px",
      borderRadius: 12,
      border: "1px solid #111827",
      fontWeight: 900,
      textDecoration: "none",
      fontSize: 13,
      background: "#111827",
      color: "#ffffff",
      display: "inline-block",
      whiteSpace: "nowrap",
    }}
  >
    + New enrollment
  </a>
</div>
      </div>

      {/* Enrollment Process */}
      <div style={{ ...cardStyle, overflow: "hidden", marginBottom: 14 }}>
        <div
          style={{
            padding: 16,
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontWeight: 900 }}>Employers — Enrollment Process</div>
            <div style={{ ...subtleText, fontSize: 13, marginTop: 4 }}>
              Not yet live (effective date in the future or not set).
            </div>
          </div>

          <div style={{ ...subtleText, fontSize: 13 }}>
            Count: <strong style={{ color: "#111827" }}>{enrollingEmployers.length}</strong>
          </div>
        </div>

        {enrollingEmployers.length === 0 ? (
          <div style={{ padding: 16, ...subtleText }}>No enrolling employers right now.</div>
        ) : (
          enrollingEmployers.map((e: any) => <EmployerRow key={e.id} e={e} />)
        )}
      </div>

      {/* Active */}
      <div style={{ ...cardStyle, overflow: "hidden" }}>
        <div
          style={{
            padding: 16,
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontWeight: 900 }}>Employers — Active</div>
            <div style={{ ...subtleText, fontSize: 13, marginTop: 4 }}>
              Live employers (effective date is today or in the past).
            </div>
          </div>

          <div style={{ ...subtleText, fontSize: 13 }}>
            Count: <strong style={{ color: "#111827" }}>{liveEmployers.length}</strong>
          </div>
        </div>

        {liveEmployers.length === 0 ? (
          <div style={{ padding: 16, ...subtleText }}>No active employers yet.</div>
        ) : (
          liveEmployers.map((e: any) => <EmployerRow key={e.id} e={e} />)
        )}
      </div>
    </main>
  );
}