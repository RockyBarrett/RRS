import Link from "next/link";
import { supabaseServer } from "@/lib/supabaseServer";
import { cardStyle, subtleText, buttonStyle } from "@/app/admin/_ui";
import SettingsClient from "./settings-client";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EmployerSettingsPage({ params }: PageProps) {
  const { id: employerId } = await params;

  const { data: employer, error: employerErr } = await supabaseServer
    .from("employers")
    .select("id, name, effective_date, opt_out_deadline, support_email")
    .eq("id", employerId)
    .maybeSingle();

  if (employerErr || !employer) {
    return (
      <main style={{ maxWidth: 900, margin: "0 auto" }}>
        <Link href="/admin" style={{ fontSize: 14 }}>
          ← Back to Admin
        </Link>

        <div style={{ ...cardStyle, padding: 18, marginTop: 14 }}>
          <h1 style={{ margin: 0 }}>Employer not found</h1>
          <p style={{ marginTop: 8, marginBottom: 0, ...subtleText }}>
            Please return to Admin and select a valid employer.
          </p>
        </div>
      </main>
    );
  }

  // ✅ HR assignments for this employer
  // We read hr_user_employers then look up the HR user emails
  const { data: links, error: linkErr } = await supabaseServer
    .from("hr_user_employers")
    .select("id, hr_user_id")
    .eq("employer_id", employerId)
    .order("created_at", { ascending: false });

  if (linkErr) {
    // Not fatal, but show something
    console.error("Failed loading hr_user_employers:", linkErr.message);
  }

  const hrUserIds = (links ?? []).map((x: any) => String(x.hr_user_id)).filter(Boolean);

  let hrEmailMap = new Map<string, string>();
  if (hrUserIds.length > 0) {
    const { data: hrs, error: hrErr } = await supabaseServer
      .from("hr_users")
      .select("id, email")
      .in("id", hrUserIds);

    if (hrErr) {
      console.error("Failed loading hr_users:", hrErr.message);
    }

    for (const u of hrs ?? []) {
      hrEmailMap.set(String((u as any).id), String((u as any).email || ""));
    }
  }

  const hr_assignments = (links ?? []).map((a: any) => ({
    id: String(a.id),
    hr_user_id: String(a.hr_user_id),
    email: hrEmailMap.get(String(a.hr_user_id)) || null,
  }));

  return (
    <main style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 14, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <Link href={`/admin/employers/${employerId}`} style={{ fontSize: 14 }}>
          ← Back to Employer Dashboard
        </Link>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a href={`/admin/employers/${employerId}`} style={buttonStyle}>
            Employer Dashboard →
          </a>
        </div>
      </div>

      <h1 style={{ margin: "10px 0 6px 0", fontSize: 34, letterSpacing: -0.4 }}>
        Settings
      </h1>

      <div style={{ ...subtleText, fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
        Employer: <strong style={{ color: "#0f172a" }}>{employer.name}</strong>
        <br />
        Employer ID:{" "}
        <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: "#0f172a" }}>
          {employerId}
        </span>
      </div>

      <div style={{ ...cardStyle, padding: 18 }}>
        <SettingsClient
          employerId={employerId}
          initial={{
            name: String(employer.name || ""),
            effective_date: String(employer.effective_date || ""),
            opt_out_deadline: String(employer.opt_out_deadline || ""),
            support_email: String(employer.support_email || ""),
            hr_assignments,
          }}
        />
      </div>
    </main>
  );
}