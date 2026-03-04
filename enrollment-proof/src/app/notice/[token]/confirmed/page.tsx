import { supabaseServer } from "@/lib/supabaseServer";
import OptOutFeedbackForm from "./opt-out-feedback-form";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ token: string }> };

function formatLongDate(d: string | null | undefined) {
  if (!d) return null;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function ConfirmedPage({ params }: PageProps) {
  const { token } = await params;
  const supabase = supabaseServer;

  const { data: employee, error: empErr } = await supabase
    .from("employees")
    .select(
      "id, token, employer_id, election, confirm_closed_at, opt_out_reason, opt_out_notes"
    )
    .eq("token", token)
    .maybeSingle();

  if (empErr || !employee) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#eef4f8",
          paddingTop: 80,
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 20px" }}>
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: 16,
              padding: 24,
              boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
            }}
          >
            <h1
              style={{
                fontSize: 22,
                fontWeight: 700,
                margin: 0,
                color: "#111827",
              }}
            >
              We couldn’t load this page.
            </h1>

            <p style={{ marginTop: 10, color: "#4b5563", fontSize: 14 }}>
              Please return to your notice link and try again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { data: employer } = await supabase
    .from("employers")
    .select("effective_date, support_email")
    .eq("id", employee.employer_id)
    .maybeSingle();

  const activeDateText =
    formatLongDate((employer as any)?.effective_date) ?? "{{activeDate}}";

  const supportEmail = (employer as any)?.support_email ?? null;

  const election = ((employee as any)?.election ??
    null) as "opt_in" | "opt_out" | null;

  const optedIn = election === "opt_in";
  const optedOut = election === "opt_out";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#eef4f8",
        paddingTop: 80,
        paddingBottom: 80,
        fontFamily:
          "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 20px" }}>
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 16,
            padding: 32,
            boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "#dcfce7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#166534",
                fontWeight: 800,
                fontSize: 18,
              }}
            >
              ✓
            </div>

            <h1
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: "#111827",
                margin: 0,
              }}
            >
              Response Recorded
            </h1>
          </div>

          <p style={{ marginTop: 10, color: "#4b5563", fontSize: 15 }}>
            Thank you. Your response has been successfully recorded.
          </p>

          {/* Summary */}
          <div
            style={{
              marginTop: 24,
              background: "#f9fafb",
              borderRadius: 12,
              padding: 18,
              border: "1px solid #e5e7eb",
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: 14,
                color: "#374151",
                marginBottom: 8,
              }}
            >
              Your Response
            </div>

            <div style={{ fontSize: 14, color: "#374151" }}>
              <div>
                <span style={{ color: "#6b7280" }}>Participation:</span>{" "}
                <strong>
                  {optedIn
                    ? "Opted In"
                    : optedOut
                    ? "Opted Out"
                    : "Selection Recorded"}
                </strong>
              </div>

              <div style={{ marginTop: 4 }}>
                <span style={{ color: "#6b7280" }}>Submitted:</span>{" "}
                <strong>
                  {formatLongDate(
                    (employee as any)?.confirm_closed_at
                  ) ?? "Today"}
                </strong>
              </div>
            </div>
          </div>

          {/* Opt In Message */}
          {optedIn && (
            <div style={{ marginTop: 24 }}>
              <p style={{ fontSize: 15, color: "#374151", margin: 0 }}>
                You have elected to participate in this program.
              </p>

              <p style={{ marginTop: 10, fontSize: 15, color: "#374151" }}>
                <strong>No further action is required.</strong> You will
                receive a link to your portal on{" "}
                <strong>{activeDateText}</strong>.
              </p>
            </div>
          )}

          {/* Opt Out Questionnaire */}
          {optedOut && (
            <div style={{ marginTop: 24 }}>
              <p style={{ fontSize: 15, color: "#374151", margin: 0 }}>
                You have chosen not to participate in this program.
              </p>

              <div
                style={{
                  marginTop: 18,
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: "#374151",
                    marginBottom: 6,
                  }}
                >
                  Optional: Help us understand your decision
                </div>

                <p
                  style={{
                    fontSize: 13,
                    color: "#6b7280",
                    marginTop: 0,
                    marginBottom: 14,
                  }}
                >
                  Your feedback helps improve communication about the
                  program.
                </p>

                <OptOutFeedbackForm
                  token={(employee as any).token}
                  existingReason={(employee as any).opt_out_reason ?? ""}
                  existingNotes={(employee as any).opt_out_notes ?? ""}
                />
              </div>
            </div>
          )}

          {/* Footer */}
          <div
            style={{
              marginTop: 28,
              paddingTop: 16,
              borderTop: "1px solid #e5e7eb",
              fontSize: 13,
              color: "#6b7280",
            }}
          >
            {supportEmail ? (
              <>
                Questions? Contact <strong>{supportEmail}</strong>.
              </>
            ) : (
              <>You may now close this page.</>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}