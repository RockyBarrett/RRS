"use client";

import { useMemo, useState } from "react";
import { buttonStyle, buttonPrimaryStyle, subtleText } from "@/app/admin/_ui";

type HrAssignment = {
  id: string;
  hr_user_id: string;
  email: string | null;
};

type Initial = {
  name: string;
  effective_date: string; // YYYY-MM-DD
  opt_out_deadline: string; // YYYY-MM-DD
  support_email: string;

  // ✅ NEW: optional HR assignments passed from server
  hr_assignments?: HrAssignment[];
};

function isYYYYMMDD(v: string) {
  if (!v) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function isEmail(v: string) {
  if (!v) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function normEmail(v: string) {
  return String(v || "").trim().toLowerCase();
}

export default function SettingsClient({
  employerId,
  initial,
}: {
  employerId: string;
  initial: Initial;
}) {
  // Employer settings
  const [name, setName] = useState(initial.name);
  const [effectiveDate, setEffectiveDate] = useState(initial.effective_date);
  const [optOutDeadline, setOptOutDeadline] = useState(initial.opt_out_deadline);
  const [supportEmail, setSupportEmail] = useState(initial.support_email);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const canSave = useMemo(() => {
    return (
      name.trim().length > 0 &&
      isYYYYMMDD(effectiveDate.trim()) &&
      isYYYYMMDD(optOutDeadline.trim()) &&
      isEmail(supportEmail.trim())
    );
  }, [name, effectiveDate, optOutDeadline, supportEmail]);

  async function onSave() {
    setBusy(true);
    setMsg(null);

    try {
      const res = await fetch(`/api/admin/employers/${employerId}/settings`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          effective_date: effectiveDate.trim(),
          opt_out_deadline: optOutDeadline.trim(),
          support_email: supportEmail.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Save failed");

      setMsg("Saved successfully.");
    } catch (e: any) {
      setMsg(e?.message || "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  // ✅ HR Access state
  const [hrEmail, setHrEmail] = useState("");
  const [hrBusy, setHrBusy] = useState(false);
  const [assignments, setAssignments] = useState<HrAssignment[]>(initial.hr_assignments ?? []);

  const canGrant = useMemo(() => isEmail(normEmail(hrEmail)), [hrEmail]);

  async function grantAccess() {
    if (!canGrant) return;

    setHrBusy(true);
    setMsg(null);

    try {
      const res = await fetch(`/api/admin/employers/${employerId}/hr-access`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: normEmail(hrEmail) }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Grant failed");

      setAssignments(data.assignments ?? []);
      setHrEmail("");
      setMsg("HR access granted.");
    } catch (e: any) {
      setMsg(e?.message || "Grant failed.");
    } finally {
      setHrBusy(false);
    }
  }

  async function removeAccess(hr_user_id: string) {
    setHrBusy(true);
    setMsg(null);

    try {
      const res = await fetch(`/api/admin/employers/${employerId}/hr-access`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ hr_user_id }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Remove failed");

      setAssignments(data.assignments ?? []);
      setMsg("HR access removed.");
    } catch (e: any) {
      setMsg(e?.message || "Remove failed.");
    } finally {
      setHrBusy(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    outline: "none",
    fontSize: 14,
    color: "#0f172a",
    background: "#ffffff",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 900,
    color: "#0f172a",
    marginBottom: 6,
  };

  const helperStyle: React.CSSProperties = {
    ...subtleText,
    fontSize: 12,
    marginTop: 6,
    lineHeight: 1.5,
  };

  const cardStyle: React.CSSProperties = {
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    background: "#ffffff",
    padding: 16,
    boxShadow: "0 10px 25px rgba(15, 23, 42, 0.06)",
  };

  return (
    <div style={{ display: "grid", gap: 14, maxWidth: 720 }}>
      {/* Employer Settings */}
      <div style={cardStyle}>
        <div style={{ fontWeight: 900, marginBottom: 10, color: "#0f172a" }}>Employer Settings</div>

        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={labelStyle}>Employer name</div>
            <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ display: "grid", gap: 8 }}>
              <div style={labelStyle}>Effective date (YYYY-MM-DD)</div>
              <input value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} style={inputStyle} />
              {!isYYYYMMDD(effectiveDate.trim()) && (
                <div style={{ ...helperStyle, color: "#b91c1c" }}>Format must be YYYY-MM-DD (example: 2026-03-01)</div>
              )}
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <div style={labelStyle}>Opt-out deadline (YYYY-MM-DD)</div>
              <input value={optOutDeadline} onChange={(e) => setOptOutDeadline(e.target.value)} style={inputStyle} />
              {!isYYYYMMDD(optOutDeadline.trim()) && (
                <div style={{ ...helperStyle, color: "#b91c1c" }}>Format must be YYYY-MM-DD (example: 2026-02-15)</div>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <div style={labelStyle}>Support email</div>
            <input value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} style={inputStyle} />
            {!isEmail(supportEmail.trim()) && (
              <div style={{ ...helperStyle, color: "#b91c1c" }}>Enter a valid email address.</div>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={onSave}
              disabled={!canSave || busy}
              style={{
                ...buttonPrimaryStyle,
                opacity: !canSave || busy ? 0.6 : 1,
                cursor: !canSave || busy ? "not-allowed" : "pointer",
              }}
            >
              {busy ? "Saving…" : "Save changes"}
            </button>

            <button
              onClick={() => {
                setName(initial.name);
                setEffectiveDate(initial.effective_date);
                setOptOutDeadline(initial.opt_out_deadline);
                setSupportEmail(initial.support_email);
                setMsg("Reverted.");
              }}
              disabled={busy}
              style={{
                ...buttonStyle,
                opacity: busy ? 0.6 : 1,
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* ✅ HR Access */}
      <div style={cardStyle}>
        <div style={{ fontWeight: 900, marginBottom: 6, color: "#0f172a" }}>HR Access</div>
        <div style={{ ...subtleText, fontSize: 13, marginBottom: 12, lineHeight: 1.6 }}>
          Add HR users by email so they can view this employer in the Employer Portal.
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input
            value={hrEmail}
            onChange={(e) => setHrEmail(e.target.value)}
            placeholder="hr@company.com"
            style={{
              ...inputStyle,
              flex: "1 1 240px",
            }}
          />
          <button
            onClick={grantAccess}
            disabled={!canGrant || hrBusy}
            style={{
              ...buttonPrimaryStyle,
              opacity: !canGrant || hrBusy ? 0.6 : 1,
              cursor: !canGrant || hrBusy ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {hrBusy ? "Working…" : "Grant access"}
          </button>
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 800, marginBottom: 8, color: "#0f172a" }}>Assigned HR users</div>

          {assignments.length === 0 ? (
            <div style={{ ...subtleText }}>No HR users assigned yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {assignments.map((a) => (
                <div
                  key={a.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    padding: 12,
                    border: "1px solid #e2e8f0",
                    borderRadius: 14,
                    background: "#f8fafc",
                  }}
                >
                  <div style={{ fontWeight: 800, color: "#0f172a" }}>{a.email || a.hr_user_id}</div>

                  <button
                    onClick={() => removeAccess(a.hr_user_id)}
                    disabled={hrBusy}
                    style={{
                      ...buttonStyle,
                      opacity: hrBusy ? 0.6 : 1,
                      cursor: hrBusy ? "not-allowed" : "pointer",
                      background: "#ffffff",
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Toast / status */}
      {msg && (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid " + (msg.toLowerCase().includes("saved") || msg.toLowerCase().includes("granted") || msg.toLowerCase().includes("removed") ? "#a7f3d0" : "#fecaca"),
            background: msg.toLowerCase().includes("saved") || msg.toLowerCase().includes("granted") || msg.toLowerCase().includes("removed") ? "#ecfdf5" : "#fef2f2",
            color: msg.toLowerCase().includes("saved") || msg.toLowerCase().includes("granted") || msg.toLowerCase().includes("removed") ? "#065f46" : "#991b1b",
            fontWeight: 800,
          }}
        >
          {msg}
        </div>
      )}
    </div>
  );
}