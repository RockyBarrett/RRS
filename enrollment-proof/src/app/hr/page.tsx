import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import { cardStyle, subtleText, buttonStyle } from "@/app/admin/_ui";

export const dynamic = "force-dynamic";

function fmtDate(d: string | null | undefined) {
  return d ? String(d) : "—";
}

function isExpired(expiresAt: string | null | undefined) {
  if (!expiresAt) return true;
  const t = new Date(String(expiresAt)).getTime();
  if (Number.isNaN(t)) return true;
  return Date.now() > t;
}

function EmployerRow({ e }: { e: any }) {
  return (
    <div
      style={{
        padding: 14,
        borderTop: "1px solid #e5e7eb",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <div style={{ minWidth: 280 }}>
        <div style={{ fontWeight: 900, fontSize: 15, color: "#111827" }}>{e.name}</div>

        <div style={{ ...subtleText, fontSize: 13, marginTop: 6, lineHeight: 1.6 }}>
          Effective: <strong style={{ color: "#111827" }}>{fmtDate(e.effective_date)}</strong>
          {" · "}
          Opt-out deadline: <strong style={{ color: "#111827" }}>{fmtDate(e.opt_out_deadline)}</strong>
          <br />
          Support: <strong style={{ color: "#111827" }}>{String(e.support_email || "")}</strong>
        </div>

        <div style={{ ...subtleText, fontSize: 12, marginTop: 6 }}>
          Employer ID:{" "}
          <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: "#111827" }}>
            {e.id}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {/* This page comes next: /hr/employers/[id] */}
        <Link href={`/hr/employers/${e.id}`} style={buttonStyle}>
          Open →
        </Link>
      </div>
    </div>
  );
}

export default async function HrHome() {
  // ✅ Read HR session cookie
  const cookieStore = await cookies();
const sessionToken = cookieStore.get("rrs_hr_session")?.value || "";
  if (!sessionToken) redirect("/login"); // change later if you want /hr/login

  // ✅ Validate session -> get hr_user_id
  const { data: session, error: sessErr } = await supabaseServer
    .from("hr_sessions")
    .select("id, hr_user_id, expires_at")
    .eq("session_token", sessionToken)
    .maybeSingle();

  if (sessErr || !session || isExpired(session.expires_at)) {
    redirect("/login");
  }

  // ✅ Load employer assignments for this HR user
  const { data: assignments, error: aErr } = await supabaseServer
    .from("hr_user_employers")
    .select("employer_id")
    .eq("hr_user_id", session.hr_user_id);

  if (aErr) {
    return (
      <main style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ ...cardStyle, padding: 18 }}>
          <h1 style={{ margin: 0, fontSize: 28 }}>Employer Portal</h1>
          <div style={{ marginTop: 8, color: "#b91c1c", fontWeight: 800 }}>
            Error loading assignments: {aErr.message}
          </div>
        </div>
      </main>
    );
  }

  const employerIds = Array.from(new Set((assignments ?? []).map((x: any) => String(x.employer_id)).filter(Boolean)));

  // ✅ Load those employers
  const { data: employers, error: empErr } = employerIds.length
    ? await supabaseServer
        .from("employers")
        .select("id, name, effective_date, opt_out_deadline, support_email, created_at")
        .in("id", employerIds)
        .order("created_at", { ascending: false })
    : { data: [], error: null as any };

  if (empErr) {
    return (
      <main style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ ...cardStyle, padding: 18 }}>
          <h1 style={{ margin: 0, fontSize: 28 }}>Employer Portal</h1>
          <div style={{ marginTop: 8, color: "#b91c1c", fontWeight: 800 }}>
            Error loading employers: {empErr.message}
          </div>
        </div>
      </main>
    );
  }

  const list = employers ?? [];

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
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
          <h1 style={{ margin: "10px 0 6px 0", fontSize: 34, letterSpacing: -0.4 }}>Employer Portal</h1>
          <div style={{ ...subtleText, fontSize: 13 }}>
            Select a company to manage enrollment, notices, and compliance.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        </div>
      </div>

      {/* Employers */}
      <div style={{ ...cardStyle, overflow: "hidden" }}>
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
          <div>
            <div style={{ fontWeight: 900 }}>Your Companies</div>
            <div style={{ ...subtleText, fontSize: 13, marginTop: 4 }}>You only see employers assigned to your account.</div>
          </div>

          <div style={{ ...subtleText, fontSize: 13 }}>
            Count: <strong style={{ color: "#111827" }}>{list.length}</strong>
          </div>
        </div>

        {list.length === 0 ? (
          <div style={{ padding: 16, ...subtleText }}>
            No companies assigned yet. Ask your administrator to assign employers to your account.
          </div>
        ) : (
          list.map((e: any) => <EmployerRow key={e.id} e={e} />)
        )}
      </div>
    </main>
  );
}