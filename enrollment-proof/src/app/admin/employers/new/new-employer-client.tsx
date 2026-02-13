"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { buttonPrimaryStyle, buttonStyle, subtleText } from "@/app/admin/_ui";

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function NewEmployerClient() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [supportEmail, setSupportEmail] = useState("rocky@revenuereturnspecialists.com");
  const [effectiveDate, setEffectiveDate] = useState(todayISO());
  const [optOutDeadline, setOptOutDeadline] = useState(todayISO());

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return (
      name.trim().length > 1 &&
      supportEmail.includes("@") &&
      /^\d{4}-\d{2}-\d{2}$/.test(effectiveDate) &&
      /^\d{4}-\d{2}-\d{2}$/.test(optOutDeadline)
    );
  }, [name, supportEmail, effectiveDate, optOutDeadline]);

  async function onCreate() {
    setMsg(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/employers/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          support_email: supportEmail,
          effective_date: effectiveDate,
          opt_out_deadline: optOutDeadline,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Create failed");

      router.push(`/admin/employers/${data.id}`);
      router.refresh();
    } catch (e: any) {
      setMsg(e?.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ fontWeight: 900, display: "block", marginBottom: 6 }}>Employer name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Pilot Company"
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 12,
              border: "1px solid #d1d5db",
              fontSize: 14,
            }}
          />
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ fontWeight: 900, display: "block", marginBottom: 6 }}>
            Support email (shown to employees)
          </label>
          <input
            value={supportEmail}
            onChange={(e) => setSupportEmail(e.target.value)}
            placeholder="benefits@company.com"
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 12,
              border: "1px solid #d1d5db",
              fontSize: 14,
            }}
          />
          <div style={{ marginTop: 6, ...subtleText, fontSize: 12 }}>
            This appears on the employee notice page for questions.
          </div>
        </div>

        <div>
          <label style={{ fontWeight: 900, display: "block", marginBottom: 6 }}>Effective date</label>
          <input
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 12,
              border: "1px solid #d1d5db",
              fontSize: 14,
            }}
          />
          <div style={{ marginTop: 6, ...subtleText, fontSize: 12 }}>
            Tip: Employers with a future effective date will show under <strong style={{ color: "#111827" }}>Enrollment Process</strong>.
          </div>
        </div>

        <div>
          <label style={{ fontWeight: 900, display: "block", marginBottom: 6 }}>Opt-out deadline</label>
          <input
            type="date"
            value={optOutDeadline}
            onChange={(e) => setOptOutDeadline(e.target.value)}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 12,
              border: "1px solid #d1d5db",
              fontSize: 14,
            }}
          />
          <div style={{ marginTop: 6, ...subtleText, fontSize: 12 }}>
            Usually on or before the effective date.
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button
          onClick={onCreate}
          disabled={!canSubmit || busy}
          style={{
            ...(canSubmit && !busy ? buttonPrimaryStyle : buttonStyle),
            opacity: canSubmit && !busy ? 1 : 0.6,
            cursor: canSubmit && !busy ? "pointer" : "not-allowed",
          }}
        >
          {busy ? "Creating…" : "Create enrollment"}
        </button>

        <div style={{ ...subtleText, fontSize: 12 }}>
          After creation, you’ll be taken to the Employer Dashboard where you can upload the employee CSV
          and manage compliance tracking.
        </div>
      </div>

      {msg && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 12,
            background: "#fef2f2",
            border: "1px solid #fecaca",
          }}
        >
          <strong style={{ color: "#991b1b" }}>Error:</strong>{" "}
          <span style={{ color: "#991b1b" }}>{msg}</span>
        </div>
      )}
    </div>
  );
}