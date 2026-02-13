"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

type Props = {
  token: string;
};

export default function ConfirmCloseButton({ token }: Props) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

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

      // Update UI state (so admin tables/statuses reflect immediately on refresh)
      router.refresh();

      // Try to close tab/window (works only if tab was opened via script)
      window.close();

      // If window.close() is blocked, user will just remain on the page (refreshed).
      // You can optionally add a tiny "Confirmed" message elsewhere if desired.
    } catch (e: any) {
      alert(e?.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={handleConfirm}
      disabled={busy}
      style={{
        padding: "10px 14px",
        borderRadius: 12,
        borderStyle: "solid",
        borderWidth: 1,
        borderColor: "#e5e7eb",
        background: "#5d83a5ff",
        color: "#ffffff",
        fontWeight: 800,
        fontSize: 13,
        cursor: busy ? "not-allowed" : "pointer",
      }}
    >
      {busy ? "Updating…" : "Confirm & Close"}
    </button>
  );
}