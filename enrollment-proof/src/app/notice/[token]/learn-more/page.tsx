import Link from "next/link";
import { supabaseServer } from "@/lib/supabaseServer";
import ViewTracker from "../view-tracker";
import TermsDetails from "./terms-details";

type PageProps = {
  params: Promise<{ token: string }>;
};

export const dynamic = "force-dynamic";

export default async function LearnMorePage({ params }: PageProps) {
  const { token } = await params;

  const { data: employee } = await supabaseServer
    .from("employees")
    .select("id, employer_id, first_name")
    .eq("token", token)
    .maybeSingle();

  if (!employee) {
    return (
      <main style={{ minHeight: "100vh", background: "#f3f4f6", padding: 24 }}>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              border: "1px solid #e5e7eb",
              padding: 20,
            }}
          >
            <h1 style={{ margin: 0, fontSize: 22 }}>Notice not found</h1>
            <p style={{ color: "#4b5563" }}>
              Please return to your original notice.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const { data: employer } = await supabaseServer
    .from("employers")
    .select("name, support_email")
    .eq("id", employee.employer_id)
    .maybeSingle();

  const greeting = (employee.first_name ?? "").trim() || "there";
  const supportEmail = employer?.support_email || "support@company.com";

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f0f6ff",
        padding: 24,
        fontFamily: "system-ui",
        color: "#111827",
      }}
    >
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <ViewTracker token={token} eventType="learn_more_view" />

        <div
          style={{
            background: "#ffffff",
            borderRadius: 18,
            borderStyle: "solid",
            borderColor: "#e5e7eb",
            borderWidth: 1,
            borderTopWidth: 2,
            borderTopColor: "#e5e7eb",
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{ padding: 22, borderBottom: "1px solid #e5e7eb" }}>
            <div
              style={{
                fontSize: 12,
                color: "#6b7280",
                textTransform: "uppercase",
                letterSpacing: 0.4,
              }}
            >
              Learn More
            </div>

            <h1 style={{ marginTop: 6, marginBottom: 6, fontSize: 22 }}>
              About this benefits program
            </h1>

            <p style={{ margin: 0, color: "#4b5563", lineHeight: 1.5 }}>
              Hi {greeting} — below is a clear explanation of the program
              referenced in your notice.
            </p>
          </div>

          {/* Content */}
          <div style={{ padding: 22 }}>
            <section style={{ marginBottom: 18 }}>
              <h3 style={{ marginTop: 0, marginBottom: 6 }}>What is this?</h3>
              <p style={{ margin: 0, color: "#4b5563", lineHeight: 1.6 }}>
                Your employer is implementing a payroll-based benefits program
                designed to reduce taxable income while providing access for you and your family to
                additional preventive care benefits.
              </p>
            </section>

            <section style={{ marginBottom: 18 }}>
              <h3 style={{ marginBottom: 6 }}>How does it work?</h3>
              <p style={{ margin: 0, color: "#4b5563", lineHeight: 1.6 }}>
                Eligible employees may see an increase in take-home pay because
                a portion of their paycheck is treated differently for tax purposes. (See Paycheck Reimbursement Example below.)
              </p>
            </section>

            <section style={{ marginBottom: 18 }}>
              <h3 style={{ marginBottom: 6 }}>Do I need to do anything?</h3>
              <p style={{ margin: 0, color: "#4b5563", lineHeight: 1.6 }}>
                No action is required if you wish to continue participating.
                Simply return to your savings page and click confirm and close. You may also opt out if you wish before the deadline shown on your notice.
              </p>
            </section>

            <section style={{ marginBottom: 18 }}>
              <h3 style={{ marginBottom: 6 }}>
                Will this affect my existing benefits?
              </h3>
              <p style={{ margin: 0, color: "#4b5563", lineHeight: 1.6 }}>
                No, this program operates alongside your current health benefits and is intended to enhance your families overall wellness and financial well being.


              </p>
            </section>

            <section style={{ marginBottom: 18 }}>
              <h3 style={{ marginBottom: 6 }}>Questions or concerns?</h3>
              <p style={{ margin: 0, color: "#4b5563", lineHeight: 1.6 }}>
                Contact your HR team or{" "}
                <strong style={{ color: "#111827" }}>{supportEmail}</strong>.
              </p>
            </section>

            {/* Downloads + Terms */}
            <section style={{ marginTop: 18 }}>
              <h3 style={{ marginBottom: 10 }}>Downloads</h3>

              <div
                style={{
                  borderStyle: "solid",
                  borderWidth: 1,
                  borderColor: "#e5e7eb",
                  borderRadius: 14,
                  overflow: "hidden",
                  background: "#ffffff",
                }}
              >
                <a
                  href="https://www.revenuereturnspecialists.com/enrollment-videos"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 14px",
                    textDecoration: "none",
                    color: "#111827",
                    fontWeight: 800,
                  }}
                >
                  <span>Enrollment video walkthrough</span>
                  <span style={{ color: "#64748b", fontWeight: 900 }}>
                    Open →
                  </span>
                </a>

                <div style={{ height: 1, background: "#e5e7eb" }} />

                <a
                  href="/docs/attentive-program-booklet.pdf"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 14px",
                    textDecoration: "none",
                    color: "#111827",
                    fontWeight: 800,
                  }}
                >
                  <span>Attentive Program Booklet (PDF)</span>
                  <span style={{ color: "#64748b", fontWeight: 900 }}>
                    Open →
                  </span>
                </a>

                <div style={{ height: 1, background: "#e5e7eb" }} />

                <a
                  href="/docs/paycheck-reimbursement.pdf.jpg"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 14px",
                    textDecoration: "none",
                    color: "#111827",
                    fontWeight: 800,
                  }}
                >
                  <span>Paycheck Reimbursement Example (jpg)</span>
                  <span style={{ color: "#64748b", fontWeight: 900 }}>
                    Open →
                  </span>
                </a>

                <div style={{ height: 1, background: "#e5e7eb" }} />

                {/* ✅ Client component */}
                <TermsDetails token={token} supportEmail={supportEmail} />
              </div>

              <div
                style={{
                  marginTop: 8,
                  color: "#64748b",
                  fontSize: 12,
                }}
              >
                These resources open in a new tab so you don’t lose your place.
              </div>
            </section>

            <div style={{ marginTop: 22 }}>
              <Link
                href={`/notice/${token}`}
                style={{
                  display: "inline-block",
                  padding: "10px 14px",
                  borderRadius: 14,
                  border: "1px solid #e5e7eb",
                  background: "#5d83a5ff",
                  color: "#ffffff",
                  fontWeight: 800,
                  textDecoration: "none",
                }}
              >
                ← Back to notice
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}