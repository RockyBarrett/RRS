"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

type Props = {
  token: string;
  disabled: boolean;
  initialOptedOut: boolean;
  supportEmail: string;
  pastDeadline: boolean;

  // optional; defaults keep passive behavior unchanged
  enrollmentType?: "passive" | "active" | string;
  initialElection?: "opt_in" | "opt_out" | null;
};

export default function NoticeClient({
  token,
  disabled,
  initialOptedOut,
  supportEmail,
  pastDeadline,
  enrollmentType = "passive",
  initialElection = null,
}: Props) {
  const router = useRouter();

  const [busy, setBusy] = React.useState(false);
  const [optedOut, setOptedOut] = React.useState<boolean>(initialOptedOut);
  const [msg, setMsg] = React.useState<string>("");

  const isActiveEnrollment = enrollmentType === "active";
  const [election, setElection] = React.useState<"opt_in" | "opt_out" | null>(initialElection);

  // ✅ Critical fix — sync local state with server refresh
  React.useEffect(() => {
    setOptedOut(initialOptedOut);
  }, [initialOptedOut]);

  // ✅ Keep election synced with server truth after router.refresh()
  React.useEffect(() => {
    setElection(initialElection ?? null);
  }, [initialElection]);

  async function doOptOut() {
    if (busy || disabled) return;

    const ok = window.confirm(
      "Are you sure you want to opt out?\n\nIf you opt out, your estimated savings will be set to $0 and you will not receive the savings and benefits described on this notice."
    );
    if (!ok) return;

    setBusy(true);
    setMsg("");

    // optimistic highlight (active only)
    if (isActiveEnrollment) setElection("opt_out");

    try {
      const res = await fetch("/api/opt-out", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Opt-out failed");

      setMsg("Opt out selected. Updating your notice…");
      router.refresh();
    } catch (e: any) {
      setMsg(e?.message || "Something went wrong.");
      if (isActiveEnrollment) setElection(initialElection ?? null);
    } finally {
      setBusy(false);
    }
  }

  async function undoOptOut() {
    if (busy) return;

    if (pastDeadline) {
      setMsg(`The opt-out window has ended. Please contact your HR team at ${supportEmail}.`);
      return;
    }

    const ok = window.confirm("Undo opt-out and continue participating?");
    if (!ok) return;

    setBusy(true);
    setMsg("");

    // optimistic highlight (active only)
    if (isActiveEnrollment) setElection("opt_in");

    try {
      const res = await fetch("/api/opt-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Undo failed");

      setMsg("You are currently participating. Updating your notice…");
      router.refresh();
    } catch (e: any) {
      setMsg(e?.message || "Something went wrong.");
      if (isActiveEnrollment) setElection(initialElection ?? null);
    } finally {
      setBusy(false);
    }
  }

  async function doOptIn() {
    if (busy || disabled) return;

    setBusy(true);
    setMsg("");

    // optimistic highlight
    setElection("opt_in");

    try {
      const res = await fetch("/api/opt-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Opt-in failed");

      setMsg("Opt in selected. Updating your notice…");
      router.refresh();
    } catch (e: any) {
      setMsg(e?.message || "Something went wrong.");
      setElection(initialElection ?? null);
    } finally {
      setBusy(false);
    }
  }

  const lock = pastDeadline;

  // --- Active button styles (calm, premium, non-salesy) ---
  const btnBase: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 12,
    fontWeight: 900,
    fontSize: 13,
    cursor: busy || disabled ? "not-allowed" : "pointer",
    opacity: busy || disabled ? 0.75 : 1,
    borderStyle: "solid",
    borderWidth: 1,
    transition: "transform 120ms ease, opacity 120ms ease",
    minWidth: 120,
  };

  const optOutStyle = (selected: boolean): React.CSSProperties => ({
  ...btnBase,
  borderColor: selected ? "#8C3F3F" : "#E6CACA",
  background: selected ? "#8C3F3F" : "#F6EAEA",
  color: selected ? "#FFFFFF" : "#5A2F2F",
});

const optInStyle = (selected: boolean): React.CSSProperties => ({
  ...btnBase,
  borderColor: selected ? "#2F6F4F" : "#BFDAC8",
  background: selected ? "#2F6F4F" : "#E8F3EC",
  color: selected ? "#FFFFFF" : "#1F3D2B",
});

  return (
    <div style={{ marginTop: 12 }}>
      {isActiveEnrollment ? (
        <div style={{ marginTop: 6 }}>
          {/* Step header */}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 900, color: "#111827" }}>
                Step 2 (Required): Your election
              </div>
              <div style={{ marginTop: 4, fontSize: 12, color: "#6b7280", lineHeight: 1.4 }}>
                Choose <strong>Opt In</strong> or <strong>Opt Out</strong>. You may change your election before the deadline.
              </div>
            </div>

            {pastDeadline && (
              <div
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid #e5e7eb",
                  background: "#ffffff",
                  fontSize: 12,
                  fontWeight: 900,
                  color: "#6b7280",
                  whiteSpace: "nowrap",
                  alignSelf: "flex-start",
                }}
              >
                Deadline passed
              </div>
            )}
          </div>

          {/* Buttons row */}
          <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {/* Opt Out (left, secondary) */}
            <button
              onClick={doOptOut}
              disabled={busy || disabled}
              style={optOutStyle(election === "opt_out")}
              title="Opt Out"
            >
              {busy ? "Updating…" : "Opt Out"}
            </button>

            {/* Opt In (right, primary) */}
            <button
              onClick={doOptIn}
              disabled={busy || disabled}
              style={optInStyle(election === "opt_in")}
              title="Opt In"
            >
              {busy ? "Updating…" : "Opt In"}
            </button>

            {election === null && (
              <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 800 }}>
                Select an option to enable Confirm &amp; Close.
              </div>
            )}

            {/* If they previously opted out, keep undo available (same behavior) */}
            {optedOut && (
              <button
                onClick={undoOptOut}
                disabled={busy || lock}
                style={{
                  ...btnBase,
                  borderColor: "#111827",
                  background: "#ffffff",
                  color: "#111827",
                  cursor: busy || lock ? "not-allowed" : "pointer",
                  opacity: lock ? 0.7 : busy ? 0.75 : 1,
                }}
                title={lock ? "Deadline passed" : "Undo opt-out"}
              >
                {busy ? "Updating…" : "Undo opt-out"}
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Existing Passive Enrollment UI (unchanged) */}
          {!optedOut ? (
            <button
              onClick={doOptOut}
              disabled={busy || disabled}
              style={{
                padding: "8px 12px",
                borderRadius: 12,
                border: "1px solid #d1d5db",
                background: busy || disabled ? "#9ca3af" : "#e5e7eb",
                color: "#374151",
                fontWeight: 900,
                fontSize: 13,
                cursor: busy || disabled ? "not-allowed" : "pointer",
                transition: "opacity 150ms ease",
              }}
            >
              {busy ? "Updating…" : "Opt out"}
            </button>
          ) : (
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div
                style={{
                  padding: "8px 10px",
                  borderRadius: 12,
                  border: "1px solid #fde68a",
                  background: "#fffbeb",
                  color: "#92400e",
                  fontWeight: 900,
                  fontSize: 13,
                }}
              >
                Opted out
              </div>

              <button
                onClick={undoOptOut}
                disabled={busy || lock}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid #111827",
                  background: busy ? "#f3f4f6" : "#ffffff",
                  color: "#111827",
                  fontWeight: 900,
                  fontSize: 13,
                  cursor: busy || lock ? "not-allowed" : "pointer",
                  opacity: lock ? 0.7 : 1,
                }}
                title={lock ? "Deadline passed" : "Undo opt-out"}
              >
                {busy ? "Updating…" : "Undo opt-out"}
              </button>
            </div>
          )}
        </>
      )}

      {msg && (
        <div style={{ marginTop: 10, fontSize: 13, opacity: 0.9, color: "#374151" }}>
          {msg}{" "}
          {pastDeadline && (
            <>
              If you need help, contact <strong>{supportEmail}</strong>.
            </>
          )}
        </div>
      )}
    </div>
  );
}