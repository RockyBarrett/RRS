import Link from "next/link";
import { supabaseServer } from "@/lib/supabaseServer";
import { cardStyle, subtleText, buttonStyle } from "@/app/admin/_ui";

// ⚠️ IMPORTANT:
// These imports must remain valid relative to your project.
// If this file lives at src/app/_components/compliance/ComplianceView.tsx,
// then UploadClient + ComplianceTableClient must be imported from their actual locations.
// Option A (recommended): create shared client components under _components/compliance/client/
// Option B (quickest): import from the admin route paths (shown below).

import UploadClient from "@/app/admin/employers/[id]/compliance/upload-client";
import ComplianceTableClient from "@/app/admin/employers/[id]/compliance/compliance-table-client";

export const dynamic = "force-dynamic";

type Props = {
  mode: "admin" | "hr";
  employerId: string;
};

function fmtDate(d: string | null | undefined) {
  return d ? String(d) : "—";
}

function fmtDateTime(ts: string | null | undefined) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

function StatPill({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
      <span style={{ ...subtleText, fontSize: 13 }}>{label}:</span>
      <strong style={{ color: "#111827" }}>{value}</strong>
    </div>
  );
}

export default async function ComplianceView({ mode, employerId }: Props) {
  // Employer
  const { data: employer, error: employerErr } = await supabaseServer
    .from("employers")
    .select("id, name, effective_date, opt_out_deadline, support_email")
    .eq("id", employerId)
    .maybeSingle();

  const backHref = mode === "admin" ? `/admin/employers/${employerId}` : `/hr/employers/${employerId}`;
  const backLabel = mode === "admin" ? "← Back to Employer Dashboard" : "← Back to Employer Portal";

  if (employerErr || !employer) {
    return (
      <main style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ ...cardStyle, padding: 18 }}>
          <h1 style={{ margin: 0 }}>Employer not found</h1>
          <p style={{ marginTop: 8, marginBottom: 0, ...subtleText }}>
            Please return and select a valid employer.
          </p>

          <div style={{ marginTop: 12 }}>
            <Link href={mode === "admin" ? "/admin" : "/hr"} style={buttonStyle}>
              ← Back
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Active plan year
  const { data: planYear } = await supabaseServer
    .from("plan_years")
    .select("id, name, start_date, end_date")
    .eq("employer_id", employerId)
    .eq("status", "active")
    .maybeSingle();

  // Latest import run (vendor scope)
  const { data: latestRun } =
    planYear
      ? await supabaseServer
          .from("compliance_import_runs")
          .select("id, imported_at, source_filename")
          .eq("employer_id", employerId)
          .eq("plan_year_id", planYear.id)
          .order("imported_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : { data: null as any };

  // Roster employee_ids from latest run
  let rosterEmployeeIds: string[] = [];
  if (latestRun?.id) {
    const { data: roster } = await supabaseServer
      .from("compliance_import_run_members")
      .select("employee_id")
      .eq("run_id", latestRun.id);

    rosterEmployeeIds = (roster ?? []).map((r: any) => r.employee_id);
  }

  let tableRows: {
    employee_id: string;
    name: string;
    email: string;
    last_login_at: string | null;
    status: "Compliant" | "Not compliant" | "Overridden";
    portal_url: string | null;
    last_reminder_at: string | null;
  }[] = [];

  const inScope = rosterEmployeeIds.length;
  let compliant = 0;
  let noncompliant = 0;
  let overridden = 0;

  if (planYear && rosterEmployeeIds.length > 0) {
    // Employees
    const { data: employees } = await supabaseServer
      .from("employees")
      .select("id, first_name, last_name, email")
      .eq("employer_id", employerId)
      .in("id", rosterEmployeeIds);

    const employeeMap = new Map<string, any>();
    for (const e of employees ?? []) employeeMap.set((e as any).id, e);

    // EPY rows (compliance + portal link)
    const { data: epy } = await supabaseServer
      .from("employee_plan_year")
      .select("employee_id, compliance_status, override_flag, last_attentive_login_at, attentive_invitation_url")
      .eq("plan_year_id", planYear.id)
      .in("employee_id", rosterEmployeeIds);

    const epyMap = new Map<string, any>();
    for (const r of epy ?? []) epyMap.set((r as any).employee_id, r);

    // Reminder events (latest per employee)
    const { data: reminderEvents } = await supabaseServer
      .from("events")
      .select("employee_id, event_type, created_at")
      .eq("employer_id", employerId)
      .in("employee_id", rosterEmployeeIds)
      .in("event_type", [
        "compliance_email_reminder_sent",
        "compliance_email_reminder_sent_1",
        "compliance_email_reminder_sent_2",
        "compliance_email_reminder_sent_3",
      ])
      .order("created_at", { ascending: false });

    const lastReminderByEmployeeId = new Map<string, string>();
    for (const ev of reminderEvents ?? []) {
      const eid = String((ev as any).employee_id);
      const ts = String((ev as any).created_at);
      if (!lastReminderByEmployeeId.has(eid)) lastReminderByEmployeeId.set(eid, ts);
    }

    // Stable order by email
    const sortedIds = [...rosterEmployeeIds].sort((a, b) => {
      const ea = String(employeeMap.get(a)?.email ?? "");
      const eb = String(employeeMap.get(b)?.email ?? "");
      return ea.localeCompare(eb);
    });

    tableRows = sortedIds.map((employee_id) => {
      const emp = employeeMap.get(employee_id);
      const row = epyMap.get(employee_id);

      const name = `${emp?.first_name ?? ""} ${emp?.last_name ?? ""}`.trim() || "(No name)";
      const email = String(emp?.email ?? "");

      const isOverridden = !!row?.override_flag;
      const isCompliant = String(row?.compliance_status ?? "") === "compliant";

      let status: "Compliant" | "Not compliant" | "Overridden" = "Not compliant";
      if (isOverridden) status = "Overridden";
      else if (isCompliant) status = "Compliant";

      const last_login_at = (row?.last_attentive_login_at as string | null) ?? null;
      const portal_url = (row?.attentive_invitation_url as string | null) ?? null;
      const last_reminder_at = lastReminderByEmployeeId.get(employee_id) ?? null;

      if (status === "Compliant") compliant++;
      else if (status === "Overridden") overridden++;
      else noncompliant++;

      return {
        employee_id,
        name,
        email,
        last_login_at,
        status,
        portal_url,
        last_reminder_at,
      };
    });
  }

  const latestRunLabel = latestRun
    ? `Latest import: ${fmtDateTime(latestRun.imported_at)}${
        latestRun.source_filename ? ` · ${latestRun.source_filename}` : ""
      }`
    : "No imports yet (upload a report below).";

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 14 }}>
        <Link href={backHref} style={{ fontSize: 14 }}>
          {backLabel}
        </Link>
      </div>

      {/* Header row */}
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
          <h1 style={{ margin: "0 0 6px 0", fontSize: 34, letterSpacing: -0.4 }}>Compliance</h1>

          <div style={{ ...subtleText, fontSize: 13, lineHeight: 1.5 }}>
            Employer: <strong style={{ color: "#111827" }}>{employer.name}</strong>
            <br />
            Effective: <strong style={{ color: "#111827" }}>{fmtDate(employer.effective_date)}</strong>
            {" · "}
            Opt-out deadline: <strong style={{ color: "#111827" }}>{fmtDate(employer.opt_out_deadline)}</strong>
            <br />
            Support: <strong style={{ color: "#111827" }}>{String(employer.support_email || "")}</strong>
          </div>

          <div style={{ marginTop: 8, ...subtleText, fontSize: 13, lineHeight: 1.5 }}>
            Plan year:{" "}
            {planYear ? (
              <strong style={{ color: "#111827" }}>
                {planYear.name} ({String(planYear.start_date)} → {String(planYear.end_date)})
              </strong>
            ) : (
              <strong style={{ color: "#b91c1c" }}>No active plan year found</strong>
            )}
          </div>
        </div>
      </div>

      {/* Compliance table card */}
      <div style={{ ...cardStyle, overflow: "hidden", marginBottom: 16 }}>
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
          <div style={{ fontWeight: 900 }}>Compliance Roster (Vendor Scope)</div>

          <div style={{ display: "flex", gap: 14, ...subtleText, fontSize: 13, flexWrap: "wrap" }}>
            <StatPill label="In scope" value={inScope} />
            <StatPill label="Compliant" value={compliant} />
            <StatPill label="Not compliant" value={noncompliant} />
            <StatPill label="Overridden" value={overridden} />
          </div>
        </div>

        <div
          style={{
            padding: "10px 16px",
            borderBottom: "1px solid #e5e7eb",
            ...subtleText,
            fontSize: 12,
          }}
        >
          {latestRunLabel}
          <div style={{ marginTop: 6 }}>
            Note: “In scope” is defined by the latest Attentive compliance report import for this plan year.
          </div>
        </div>

        <div style={{ padding: 16 }}>
          {planYear ? (
            <ComplianceTableClient
              employerId={employerId}
              planYearId={planYear.id}
              latestRunLabel={latestRunLabel}
              rows={tableRows}
              employerName={String(employer.name || "")}
              supportEmail={String(employer.support_email || "")}
            />
          ) : (
            <div style={{ ...subtleText }}>No active plan year found. Create one first.</div>
          )}
        </div>
      </div>

      {/* Upload card (ADMIN ONLY) */}
      {mode === "admin" && (
        <div style={{ ...cardStyle, overflow: "hidden" }}>
          <div style={{ padding: 16, borderBottom: "1px solid #e5e7eb", fontWeight: 900 }}>
            Upload Attentive Compliance Report (.xlsx)
          </div>

          <div style={{ padding: 16 }}>
            <div style={{ ...subtleText, fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>
              This will read the Excel report and update per-employee compliance for the active plan year.
              <br />
              Expected columns (case-insensitive): <strong>EMAIL</strong>, <strong>LAST LOGIN DATE</strong>
            </div>

            <UploadClient employerId={employerId} planYearId={planYear?.id ?? null} />
          </div>
        </div>
      )}
    </main>
  );
}