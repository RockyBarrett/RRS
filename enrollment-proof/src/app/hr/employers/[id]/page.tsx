import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import { cardStyle, subtleText, buttonStyle } from "@/app/admin/_ui";
import EmployeeTableClient from "@/app/admin/employers/[id]/employee-table-client";
import ConnectEmailMenu from "@/app/_components/ConnectEmailMenu";
import { getConnectedEmail } from "@/lib/email/getConnectedEmail";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    gmail_sender_status?: string;
    gmail_sender_email?: string;
  }>;
};

function fmtDate(d: string | null | undefined) {
  return d ? String(d) : "—";
}

function isExpired(expiresAt: string | null | undefined) {
  if (!expiresAt) return true;
  const t = new Date(String(expiresAt)).getTime();
  if (Number.isNaN(t)) return true;
  return Date.now() > t;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ ...cardStyle, padding: 14, minWidth: 170 }}>
      <div style={{ ...subtleText, fontSize: 12, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color: "#111827", letterSpacing: -0.3 }}>{value}</div>
    </div>
  );
}

function EmailStatusPill({
  status,
  email,
  title,
}: {
  status: "connected" | "pending" | "none";
  email?: string | null;
  title?: string;
}) {
  if (status === "pending") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 10px",
          borderRadius: 999,
          border: "1px solid #fde68a",
          background: "#fffbeb",
          color: "#92400e",
          fontWeight: 900,
          fontSize: 12,
          whiteSpace: "nowrap",
        }}
        title={email ? `Pending approval: ${email}` : "Pending approval"}
      >
        <span style={{ width: 8, height: 8, borderRadius: 999, background: "#f59e0b" }} />
        Pending approval
        {email ? (
          <>
            <span style={{ fontWeight: 700, color: "#92400e" }}>·</span>
            <span style={{ fontWeight: 700, color: "#92400e" }}>{email}</span>
          </>
        ) : null}
      </span>
    );
  }

  if (status === "connected") {
    return (
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
        title={email ? `Sending from: ${email}` : "Email connected"}
      >
        <span style={{ width: 8, height: 8, borderRadius: 999, background: "#10b981" }} />
        Sending from
        {email ? (
          <>
            <span style={{ fontWeight: 700, color: "#064e3b" }}>·</span>
            <span style={{ fontWeight: 700, color: "#064e3b" }}>{email}</span>
          </>
        ) : (
          <>
            <span style={{ fontWeight: 700, color: "#064e3b" }}>·</span>
            <span style={{ fontWeight: 700, color: "#064e3b" }}>Connected</span>
          </>
        )}
      </span>
    );
  }

  // NONE
  return (
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
      title={title || "No sender email connected"}
    >
      <span style={{ width: 8, height: 8, borderRadius: 999, background: "#ef4444" }} />
      Email not connected
    </span>
  );
}

export default async function HrEmployerDashboard({ params, searchParams }: PageProps) {
  const { id: employerId } = await params;
  const sp = (await searchParams) || {};
  const gmailSenderStatus = String(sp.gmail_sender_status || "").toLowerCase();
  const gmailSenderEmail = sp.gmail_sender_email ? String(sp.gmail_sender_email) : null;

  // ✅ HR session
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

  // ✅ Authorization: HR user must be assigned to this employer
  const { data: allowed, error: allowErr } = await supabaseServer
    .from("hr_user_employers")
    .select("id")
    .eq("hr_user_id", session.hr_user_id)
    .eq("employer_id", employerId)
    .maybeSingle();

  if (allowErr || !allowed) {
    return (
      <main style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ marginBottom: 14 }}>
          <Link href="/hr" style={{ fontSize: 14 }}>
            ← Back to Employer Portal
          </Link>
        </div>

        <div style={{ ...cardStyle, padding: 18 }}>
          <h1 style={{ margin: 0 }}>Employer not found</h1>
          <p style={{ marginTop: 8, marginBottom: 0, ...subtleText }}>You don’t have access to this employer.</p>
        </div>
      </main>
    );
  }

  // Employer (✅ include sender_email)
  const { data: employer, error: employerErr } = await supabaseServer
    .from("employers")
    .select("id, name, effective_date, opt_out_deadline, support_email, sender_email")
    .eq("id", employerId)
    .maybeSingle();

  if (employerErr || !employer) {
    return (
      <main style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ marginBottom: 14 }}>
          <Link href="/hr" style={{ fontSize: 14 }}>
            ← Back to Employer Portal
          </Link>
        </div>

        <div style={{ ...cardStyle, padding: 18 }}>
          <h1 style={{ margin: 0 }}>Employer not found</h1>
          <p style={{ marginTop: 8, marginBottom: 0, ...subtleText }}>Please return and select a valid employer.</p>
        </div>
      </main>
    );
  }

  // ✅ Templates (EmployeeTableClient requires this prop)
  const { data: templates, error: tplErr } = await supabaseServer
    .from("email_templates")
    .select("id, name, subject, body, category, is_active, created_at")
    .eq("category", "enrollment")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (tplErr) {
    console.warn("Failed loading templates:", tplErr.message);
  }

  // Employees + events (for activity + “last sent”)
  const { data: employees } = await supabaseServer
    .from("employees")
    .select("id, first_name, last_name, email, token, opted_out_at, eligible")
    .eq("employer_id", employerId)
    .order("email", { ascending: true });

  const { data: events } = await supabaseServer
    .from("events")
    .select("id, employee_id, event_type, created_at")
    .eq("employer_id", employerId)
    .order("created_at", { ascending: false });

  const employeeCount = employees?.length ?? 0;

  const viewedSet = new Set(
    (events ?? []).filter((ev: any) => ev.event_type === "page_view").map((ev: any) => ev.employee_id)
  );

  const viewedCount = employees ? employees.filter((e: any) => viewedSet.has(e.id)).length : 0;
  const optedOutCount = employees ? employees.filter((e: any) => !!e.opted_out_at).length : 0;

  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

  // ✅ Determine pill status using same rules as sending (HR-only sender per employer per HR user)
const { connectedEmail, reason: connectedEmailReason } = await getConnectedEmail({
  mode: "hr",
  employerId: employerId,
});

const pillStatus: "connected" | "pending" | "none" =
  gmailSenderStatus === "pending" ? "pending" : connectedEmail ? "connected" : "none";

const pillEmail = gmailSenderStatus === "pending" ? gmailSenderEmail : connectedEmail;

// Optional: if it’s "none", show reason on hover for instant debugging
const pillTitle =
  pillStatus === "none" ? (connectedEmailReason || "No sender found") : undefined;

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
        <Link href="/hr" style={{ fontSize: 14 }}>
          ← Back to Employer Portal
        </Link>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <EmailStatusPill status={pillStatus} email={pillEmail} title={pillTitle} />

          <ConnectEmailMenu
  employerId={employerId}
  returnTo={`/hr/employers/${employerId}`}
  variant="light"
/>

          <a href={`/hr/employers/${employerId}/compliance`} style={buttonStyle} title="(Admin route for now)">
            Compliance
          </a>
        </div>
      </div>

      {/* Header */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12, marginBottom: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 38, letterSpacing: -0.6, color: "#111827" }}>{employer.name}</h1>

          <div style={{ ...subtleText, fontSize: 13, marginTop: 10, lineHeight: 1.6 }}>
            <span style={{ fontWeight: 800, color: "#111827" }}>Effective:</span> {fmtDate(employer.effective_date)}
            {"  "}·{"  "}
            <span style={{ fontWeight: 800, color: "#111827" }}>Opt-out deadline:</span> {fmtDate(employer.opt_out_deadline)}
            {"  "}·{"  "}
            <span style={{ fontWeight: 800, color: "#111827" }}>Support:</span> {String(employer.support_email || "")}
          </div>
        </div>
      </div>

      {/* KPIs */}
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
            Use <strong style={{ color: "#111827" }}>Send notice</strong> to enroll employees.
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <EmployeeTableClient
            employerId={employerId}
            employerName={String(employer.name || "")}
            employees={(employees ?? []) as any}
            events={(events ?? []) as any}
            baseUrl={baseUrl}
            templates={(templates ?? []) as any}
          />
        </div>
      </div>
    </main>
  );
}