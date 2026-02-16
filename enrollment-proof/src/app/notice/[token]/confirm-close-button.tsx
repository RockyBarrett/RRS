"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

type Props = {
  token: string;
  // Optional: where to send them if closing is blocked
  fallbackHref?: string;
};

export default function ConfirmCloseButton({
  token,
  fallbackHref = "/",
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);

  async function handleConfirm() {
    if (busy) return;
    setBusy(true);

    try {
      const res = await fetch("/api/confirm-close", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const json = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(json?.error || "Failed to confirm");

      router.refresh();

      // Show a success state immediately
      setDone(true);

      // Attempt to close (only works if opened via window.open / script)
      // Safari will ignore this for normal tabs.
      window.close();

      // Fallback: if still open, redirect to a safe page.
      // (We can't reliably detect "closed", so we just schedule a redirect.)
      setTimeout(() => {
        // If we’re still here, send them somewhere clean.
        // Replace keeps back button from returning to the page.
        window.location.replace(fallbackHref);
      }, 350);
    } catch (e: any) {
      alert(e?.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={handleConfirm}
      disabled={busy || done}
      style={{
        padding: "10px 14px",
        borderRadius: 12,
        borderStyle: "solid",
        borderWidth: 1,
        borderColor: "#e5e7eb",
        background: done ? "#16a34a" : "#5d83a5ff",
        color: "#ffffff",
        fontWeight: 800,
        fontSize: 13,
        cursor: busy || done ? "not-allowed" : "pointer",
      }}
      title={done ? "Confirmed" : "Confirm & Close"}
    >
      {busy ? "Updating…" : done ? "Confirmed" : "Confirm & Close"}
    </button>
  );
}