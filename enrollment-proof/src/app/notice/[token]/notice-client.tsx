"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

type Props = {
  token: string;
  disabled: boolean;
  initialOptedOut: boolean;
  supportEmail: string;
  pastDeadline: boolean;
};

export default function NoticeClient({
  token,
  disabled,
  initialOptedOut,
  supportEmail,
  pastDeadline,
}: Props) {
  const router = useRouter();

  const [busy, setBusy] = React.useState(false);
  const [optedOut, setOptedOut] = React.useState<boolean>(initialOptedOut);
  const [msg, setMsg] = React.useState<string>("");

  // ✅ Critical fix — sync local state with server refresh
  React.useEffect(() => {
    setOptedOut(initialOptedOut);
  }, [initialOptedOut]);

  async function doOptOut() {
    if (busy || disabled) return;

    const ok = window.confirm(
      "Are you sure you want to opt out?\n\nIf you opt out, your estimated savings will be set to $0 and you will not receive the savings and benefits described on this notice."
    );
    if (!ok) return;

    setBusy(true);
    setMsg("");

    try {
      const res = await fetch("/api/opt-out", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Opt-out failed");

      setMsg("You have successfully opted out. Updating your notice…");

      // Pull fresh server data (this updates savings + undo state)
      router.refresh();
    } catch (e: any) {
      setMsg(e?.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function undoOptOut() {
    if (busy) return;

    if (pastDeadline) {
      setMsg(
        `The opt-out window has ended. Please contact your HR team at ${supportEmail}.`
      );
      return;
    }

    const ok = window.confirm("Undo opt-out and continue participating?");
    if (!ok) return;

    setBusy(true);
    setMsg("");

    try {
      const res = await fetch("/api/opt-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Undo failed");

      setMsg("You are currently participating. Updating your notice…");

      // Pull fresh server data (restores savings immediately)
      router.refresh();
    } catch (e: any) {
      setMsg(e?.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const lock = pastDeadline;

  return (
    <div style={{ marginTop: 12 }}>
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
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
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

      {msg && (
        <div
          style={{
            marginTop: 10,
            fontSize: 13,
            opacity: 0.9,
            color: "#374151",
          }}
        >
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