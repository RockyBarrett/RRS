import Link from "next/link";
import { cardStyle, subtleText, buttonStyle } from "@/app/admin/_ui";

export const dynamic = "force-dynamic";

async function loadPending() {
  const res = await fetch(`${process.env.APP_BASE_URL || "http://localhost:3000"}/api/admin/send-requests/pending`, {
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || "Failed loading requests");
  return json?.requests || [];
}

export default async function AdminSendRequestsPage() {
  const requests = await loadPending();

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <h1 style={{ margin: "10px 0 6px 0", fontSize: 34, letterSpacing: -0.4 }}>Send Requests</h1>
          <div style={{ ...subtleText, fontSize: 13 }}>HR requests to send notices when no employer email is connected.</div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Link href="/admin" style={buttonStyle}>Back to Admin</Link>
        </div>
      </div>

      <div style={{ ...cardStyle, overflow: "hidden" }}>
        <div style={{ padding: 16, borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 900 }}>Pending / Failed</div>
            <div style={{ ...subtleText, fontSize: 13, marginTop: 4 }}>Click process to send using the Admin system Gmail.</div>
          </div>
          <div style={{ ...subtleText, fontSize: 13 }}>
            Count: <strong style={{ color: "#111827" }}>{requests.length}</strong>
          </div>
        </div>

        {requests.length === 0 ? (
          <div style={{ padding: 16, ...subtleText }}>No pending requests.</div>
        ) : (
          <div style={{ padding: 16, display: "grid", gap: 12 }}>
            {requests.map((r: any) => (
              <RequestCard key={r.id} r={r} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function RequestCard({ r }: { r: any }) {
  // Client-side process button via form POST fetch
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 900, color: "#111827" }}>{r.status === "failed" ? "Failed request" : "Pending request"}</div>
          <div style={{ ...subtleText, fontSize: 13, marginTop: 6, lineHeight: 1.6 }}>
            <div><strong style={{ color: "#111827" }}>Request ID:</strong> {r.id}</div>
            <div><strong style={{ color: "#111827" }}>Employer:</strong> {r.employer_id}</div>
            <div><strong style={{ color: "#111827" }}>Template:</strong> {r.template_id}</div>
            <div><strong style={{ color: "#111827" }}>Employees:</strong> {Array.isArray(r.employee_ids) ? r.employee_ids.length : 0}</div>
            <div><strong style={{ color: "#111827" }}>Created:</strong> {String(r.created_at || "")}</div>
          </div>

          {r.error ? (
            <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", fontSize: 12, whiteSpace: "pre-wrap" }}>
              {String(r.error).slice(0, 1000)}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
          <ProcessButton requestId={r.id} />
        </div>
      </div>
    </div>
  );
}

function ProcessButton({ requestId }: { requestId: string }) {
  // tiny client component inline (supported by Next - but needs "use client")
  // We'll do it with a plain <form> to avoid client JS? Not possible with header key.
  // Instead: show instructions to run via curl if you want no JS.
  // We'll provide a client component below.
  return (
    <>
      {/* This is a placeholder; replace with client component if you want one-click */}
      <a
        href={`/admin/send-requests/process/${requestId}`}
        style={{
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid #111827",
          background: "#111827",
          color: "#fff",
          fontWeight: 900,
          fontSize: 13,
          textDecoration: "none",
        }}
        title="Open the process page"
      >
        Process →
      </a>
    </>
  );
}