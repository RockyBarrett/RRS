import { supabaseServer } from "@/lib/supabaseServer";
import NoticeClient from "./notice-client";
import ViewTracker from "./view-tracker";
import InsuranceAffirmation from "./insurance-affirmation";
import ConfirmCloseButton from "./confirm-close-button";

type PageProps = {
  params: Promise<{ token: string }>;
};

export const dynamic = "force-dynamic";

function formatMoneyFromCents(cents: number | null | undefined) {
  const dollars = typeof cents === "number" ? cents / 100 : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(dollars);
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  const d = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export default async function NoticePage({ params }: PageProps) {
  const { token } = await params;

  const { data: employee } = await supabaseServer
    .from("employees")
    .select("id, employer_id, first_name, eligible, annual_savings_cents, opted_out_at")
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
            <h1 style={{ margin: 0 }}>Notice link not found</h1>
            <p>Please contact your HR team.</p>
          </div>
        </div>
      </main>
    );
  }

  const { data: employer } = await supabaseServer
    .from("employers")
    .select("name, support_email, effective_date, opt_out_deadline")
    .eq("id", employee.employer_id)
    .maybeSingle();

  if (!employer) {
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
            <h1 style={{ margin: 0 }}>Employer not found</h1>
          </div>
        </div>
      </main>
    );
  }

  const baselineAnnual = employee.annual_savings_cents ?? 0;
  const isOptedOut = !!employee.opted_out_at;

  const displayAnnual = isOptedOut ? 0 : baselineAnnual;
  const monthlyCents = Math.round(displayAnnual / 12);
  const isZero = monthlyCents === 0;

  const greetingName = employee.first_name?.trim() || "there";
  const isEligible = !!employee.eligible;
  const supportEmail = employer.support_email || "support@company.com";

  const deadline = employer.opt_out_deadline
    ? new Date(`${employer.opt_out_deadline}T23:59:59Z`)
    : null;

  const pastDeadline = deadline ? Date.now() > deadline.getTime() : false;
  const disableOptOut = !isEligible || isOptedOut || pastDeadline;

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
        <ViewTracker token={token} eventType="page_view" />

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
                letterSpacing: 0.4,
                textTransform: "uppercase",
              }}
            >
              Important Benefits Notice
            </div>

            <div
              style={{
                marginTop: 6,
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <h1 style={{ margin: 0, fontSize: 22 }}>{employer.name}</h1>
              <div style={{ fontSize: 13, color: "#4b5563" }}>
                Notice ID{" "}
                <span style={{ fontFamily: "ui-monospace", color: "#111827" }}>
                  {token.slice(0, 8)}…
                </span>
              </div>
            </div>

            <p style={{ marginTop: 10, color: "#4b5563" }}>
              Hi {greetingName} — please review the statement below.
            </p>
          </div>

          {/* Body */}
          <div style={{ padding: 22 }}>
            {/* Statement */}
            <div
              style={{
                background: "#f8fbff",
                borderRadius: 14,
                border: "1px solid #e5e7eb",
                padding: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
                      textTransform: "uppercase",
                      letterSpacing: 0.35,
                    }}
                  >
                    Estimated Net Take-Home Pay Increase
                  </div>

                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 34,
                      fontWeight: 900,
                      color: isZero ? "#b91c1c" : "#111827",
                    }}
                  >
                    {formatMoneyFromCents(monthlyCents)}/mo
                  </div>

                  <div style={{ marginTop: 2, color: isZero ? "#b91c1c" : "#4b5563" }}>
                    ≈ {formatMoneyFromCents(displayAnnual)}/yr
                  </div>

                  {isZero && (
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#b91c1c",
                      }}
                    >
                      Savings inactive
                    </div>
                  )}
                </div>

                <div style={{ minWidth: 260 }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      rowGap: 8,
                      columnGap: 12,
                    }}
                  >
                    <div style={{ fontSize: 12, color: "#6b7280" }}>Effective date</div>
                    <div style={{ fontWeight: 700, textAlign: "right" }}>
                      {formatDate(employer.effective_date)}
                    </div>

                    <div style={{ fontSize: 12, color: "#6b7280" }}>Opt-out deadline</div>
                    <div style={{ fontWeight: 700, textAlign: "right" }}>
                      {formatDate(employer.opt_out_deadline)}
                    </div>

                    <div style={{ fontSize: 12, color: "#6b7280" }}>Eligibility</div>
                    <div style={{ fontWeight: 800, textAlign: "right" }}>
                      {isEligible ? "Eligible" : "Not eligible"}
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: 14,
                  borderTop: "1px dashed #e5e7eb",
                  paddingTop: 12,
                  color: "#4b5563",
                }}
              >
                <strong style={{ color: "#111827" }}>How this works</strong>
                <div>No action is required if you wish to participate. If you prefer not to participate, you may opt out before the deadline above.</div>
              </div>
            </div>

            {/* Decision */}
            <div
              style={{
                marginTop: 18,
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                padding: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                  flexWrap: "wrap",
                  marginBottom: 8,
                }}
              >
                <div style={{ fontWeight: 900 }}>Your decision</div>

                <a
                  href={`/notice/${token}/learn-more`}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    background: "#ffffff",
                    color: "#111827",
                    fontWeight: 900,
                    fontSize: 13,
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  Learn more →
                </a>
              </div>

              <InsuranceAffirmation
                token={token}
                isOptedOut={isOptedOut}
                supportEmail={supportEmail}
              />

              <NoticeClient
                token={token}
                disabled={disableOptOut}
                initialOptedOut={isOptedOut}
                supportEmail={supportEmail}
                pastDeadline={pastDeadline}
              />

              {/* Terms link (right aligned) */}
              <div
                style={{
                  marginTop: -20,
                  display: "flex",
                  justifyContent: "flex-end",
                  fontSize: 12,
                }}
              >
                <a
                  href={`/notice/${token}/learn-more#terms`}
                  style={{
                    color: "#6b7280",
                    textDecoration: "underline",
                  }}
                >
                  Terms & Conditions
                </a>
              </div>
            </div>

            {/* Footer row */}
            <div
              style={{
                marginTop: 18,
                paddingTop: 14,
                borderTop: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
                fontSize: 13,
                color: "#4b5563",
              }}
            >
              <div>
                Questions? Contact{" "}
                <strong style={{ color: "#111827" }}>{supportEmail}</strong>
              </div>

              <ConfirmCloseButton token={token} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}