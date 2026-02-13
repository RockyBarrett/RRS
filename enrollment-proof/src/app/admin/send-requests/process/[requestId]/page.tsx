"use client";

import * as React from "react";
import Link from "next/link";

export default function ProcessRequestPage({ params }: { params: { requestId: string } }) {
  const requestId = params.requestId;

  const [busy, setBusy] = React.useState(false);
  const [out, setOut] = React.useState<any>(null);
  const [err, setErr] = React.useState<string>("");

  async function run() {
    setBusy(true);
    setErr("");
    setOut(null);

    try {
      const res = await fetch(`/api/admin/send-requests/${requestId}/process`, {
        method: "POST",
        headers: {
          "x-admin-key": (process.env.NEXT_PUBLIC_ADMIN_PROCESS_KEY as any) || "", // optional if you expose it
        },
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed");
      setOut(json);
    } catch (e: any) {
      setErr(e?.message || "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0 }}>Process Request</h1>
        <Link href="/admin/send-requests" style={{ fontSize: 14 }}>← Back</Link>
      </div>

      <p style={{ marginTop: 10, opacity: 0.8 }}>Request: {requestId}</p>

      <button
        onClick={run}
        disabled={busy}
        style={{
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid #111827",
          background: busy ? "#9ca3af" : "#111827",
          color: "#fff",
          fontWeight: 900,
          cursor: busy ? "not-allowed" : "pointer",
        }}
      >
        {busy ? "Processing..." : "Run now"}
      </button>

      {err ? (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b" }}>
          {err}
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
            If you enabled ADMIN_PROCESS_KEY, you must send it as x-admin-key. Easiest: temporarily remove the key check while building.
          </div>
        </div>
      ) : null}

      {out ? (
        <pre style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "#f3f4f6", overflow: "auto" }}>
          {JSON.stringify(out, null, 2)}
        </pre>
      ) : null}
    </main>
  );
}