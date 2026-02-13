import Link from "next/link";
import { supabaseServer } from "@/lib/supabaseServer";
import { cardStyle, subtleText, buttonStyle } from "@/app/admin/_ui";
import EmployeeTableClient from "./employee-table-client";
import ConnectEmailMenu from "@/app/_components/ConnectEmailMenu";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

function fmtDate(d: string | null | undefined) {
  return d ? String(d) : "—";
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ ...cardStyle, padding: 14, minWidth: 170 }}>
      <div style={{ ...subtleText, fontSize: 12, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color: "#111827", letterSpacing: -0.3 }}>
        {value}
      </div>
    </div>
  );
}

export default async function EmployerDashboard({ params }: PageProps) {
  const { id } = await params;

  const { data: employer, error: employerErr } = await supabaseServer
    .from("employers")
    .select("id, name, effective_date, opt_out_deadline, support_email")
    .eq("id", id)
    .maybeSingle();

  if (employerErr || !employer) {
    return (
      <main style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ marginBottom: 14 }}>
          <Link href="/admin" style={{ fontSize: 14 }}>
            ← Back to Admin
          </Link>
        </div>

        <div style={{ ...cardStyle, padding: 18 }}>
          <h1 style={{ margin: 0 }}>Employer not found</h1>
          <p style={{ marginTop: 8, marginBottom: 0, ...subtleText }}>
            Please return to Admin and select a valid employer.
          </p>
        </div>
      </main>
    );
  }

  const { data: enrollmentTemplates, error: tplErr } = await supabaseServer
    .from("email_templates")
    .select("id, name, subject, body, category, is_active, created_at")
    .eq("category", "enrollment")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (tplErr) {
    console.warn("Failed loading enrollment templates:", tplErr.message);
  }

  // Email connection (latest global for now)
const employerSender = String((employer as any).sender_email || "")
  .trim()
  .toLowerCase() || null;

const { data: gmailAcct } = employerSender
  ? await supabaseServer
      .from("gmail_accounts")
      .select("user_email, status, employer_id, created_at")
      .eq("user_email", employerSender)
      .maybeSingle()
  : ({ data: null } as any);

const connectedEmail = gmailAcct?.user_email || null;

  const { data: employees } = await supabaseServer
  .from("employees")
  .select(
    [
      "id",
      "first_name",
      "last_name",
      "email",
      "token",
      "eligible",
      "opted_out_at",

      // NEW LOG FIELDS
      "notice_sent_at",
      "notice_viewed_at",
      "learn_more_viewed_at",
      "terms_viewed_at",
      "confirm_closed_at",
      "insurance_selection",
      "insurance_selected_at",
    ].join(",")
  )
  .eq("employer_id", id)
  .order("email", { ascending: true });

  const { data: events } = await supabaseServer
    .from("events")
    .select("id, employee_id, event_type, created_at")
    .eq("employer_id", id)
    .order("created_at", { ascending: false });

  const employeeCount = employees?.length ?? 0;

  const viewedSet = new Set(
    (events ?? [])
      .filter((ev: any) => ev.event_type === "page_view")
      .map((ev: any) => ev.employee_id)
  );

  const viewedCount = employees ? employees.filter((e: any) => viewedSet.has(e.id)).length : 0;
  const optedOutCount = employees ? employees.filter((e: any) => !!e.opted_out_at).length : 0;

  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

  const emailPill = connectedEmail ? (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 10px",
        borderRadius: 999,
        border: "1px solid #d1fae5",
        background: "#ecfdf5",
        color: "#065f46",
        fontWeight: 900,
        fontSize: 12,
        whiteSpace: "nowrap",
      }}
      title={`Connected as ${connectedEmail}`}
    >
      <span style={{ width: 8, height: 8, borderRadius: 999, background: "#10b981" }} />
      Email connected
      <span style={{ fontWeight: 700, color: "#064e3b" }}>·</span>
      <span style={{ fontWeight: 700, color: "#064e3b" }}>{connectedEmail}</span>
    </span>
  ) : (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 10px",
        borderRadius: 999,
        border: "1px solid #fecaca",
        background: "#fef2f2",
        color: "#991b1b",
        fontWeight: 900,
        fontSize: 12,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 999, background: "#ef4444" }} />
      Email not connected
    </span>
  );

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Top bar: Back + actions */}
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

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <a href={`/admin/employers/${id}/import`} style={buttonStyle}>
            Upload CSV
          </a>
          <a href={`/api/admin/employers/${id}/export`} style={buttonStyle}>
            Download CSV
          </a>
          <a href={`/admin/employers/${id}/compliance`} style={buttonStyle}>
            Compliance
          </a>
                 <a href={`/admin/employers/${id}/settings`} style={buttonStyle}>
  Settings
</a>
<a href="/admin/templates" style={buttonStyle}>
  Templates
</a>
        </div>
      </div>

      {/* Header: left title/meta + right email block (this fixes the “floating” feeling) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 18,
          alignItems: "start",
          marginBottom: 12,
        }}
      >
        {/* Left */}
        <div>
          <h1 style={{ margin: 0, fontSize: 38, letterSpacing: -0.6, color: "#111827" }}>
            {employer.name}
          </h1>

          <div style={{ ...subtleText, fontSize: 13, marginTop: 10, lineHeight: 1.6 }}>
            <span style={{ fontWeight: 800, color: "#111827" }}>Employer ID:</span>{" "}
            <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: "#111827" }}>{id}</span>
            {"  "}·{"  "}
            <span style={{ fontWeight: 800, color: "#111827" }}>Effective:</span> {fmtDate(employer.effective_date)}
            {"  "}·{"  "}
            <span style={{ fontWeight: 800, color: "#111827" }}>Opt-out deadline:</span> {fmtDate(employer.opt_out_deadline)}
            {"  "}·{"  "}
            <span style={{ fontWeight: 800, color: "#111827" }}>Support:</span> {String(employer.support_email || "")}
          </div>
        </div>

        {/* Right (right-aligned, compact, no centering drift) */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
          {emailPill}

          <ConnectEmailMenu
  employerId={id}
  returnTo={`/admin/employers/${id}`}
  variant="dark"
/>

          <div style={{ ...subtleText, fontSize: 10, maxWidth: 340, textAlign: "right" }}>
            Used for <strong style={{ color: "#111827" }}>Enrollment</strong> +{" "}
            <strong style={{ color: "#111827" }}>Compliance</strong> one-click sends.
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "12px 0 18px 0" }}>
        <StatCard label="Employees" value={employeeCount} />
        <StatCard label="Viewed" value={viewedCount} />
        <StatCard label="Opted out" value={optedOutCount} />
      </div>

      {/* Table */}
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
          <div style={{ fontWeight: 900 }}>Employees</div>

          <div style={{ ...subtleText, fontSize: 13 }}>
            Tip: Use <strong style={{ color: "#111827" }}>Details</strong> to see activity timestamps.
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <EmployeeTableClient
  employerId={id}
  employees={(employees ?? []) as any}
  events={(events ?? []) as any}
  baseUrl={baseUrl}
  employerName={String(employer.name || "")}
  templates={(enrollmentTemplates ?? []) as any}
/>
        </div>
      </div>
    </main>
  );
}