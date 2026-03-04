"use client";

import { useMemo, useState } from "react";

const REASONS = [
  "I need more information",
  "I don't have a qualified insurance plan",
  "I prefer not to adjust my payroll",
  "I’m not interested at this time",
  "Other (please specify in notes)",
];

export default function OptOutFeedbackForm({
  token,
  existingReason,
  existingNotes,
}: {
  token: string;
  existingReason: string;
  existingNotes: string;
}) {
  const [reason, setReason] = useState(existingReason || "");
  const [notes, setNotes] = useState(existingNotes || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => reason.trim().length >= 2, [reason]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (!canSubmit) {
      setError("Please select a reason.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/opt-out-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, reason, notes }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "save_failed");

      setSaved(true);
    } catch (err: any) {
      setError(err?.message || "save_failed");
    } finally {
      setSaving(false);
    }
  }

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 13,
    fontWeight: 700,
    color: "#374151",
    marginBottom: 6,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#111827",
    fontSize: 14,
    outline: "none",
  };

  const helperStyle: React.CSSProperties = {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 6,
  };

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
      <div>
        <label style={labelStyle}>Reason</label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          style={inputStyle}
        >
          <option value="">Select one...</option>
          {REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <div style={helperStyle}>Optional, but appreciated.</div>
      </div>

      <div>
        <label style={labelStyle}>Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          style={{ ...inputStyle, resize: "vertical" }}
          placeholder="Anything else you'd like us to know?"
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          type="submit"
          disabled={!canSubmit || saving}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid #111827",
            background: saving || !canSubmit ? "#9ca3af" : "#111827",
            color: "#ffffff",
            fontWeight: 800,
            fontSize: 14,
            cursor: saving || !canSubmit ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Saving..." : "Submit feedback"}
        </button>

        {saved && <span style={{ fontSize: 13, color: "#047857" }}>Saved — thank you.</span>}
        {error && <span style={{ fontSize: 13, color: "#b91c1c" }}>Couldn’t save: {error}</span>}
      </div>
    </form>
  );
}