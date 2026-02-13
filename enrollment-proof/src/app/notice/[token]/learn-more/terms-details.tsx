"use client";

import * as React from "react";

type Props = {
  token: string;
  supportEmail: string;
};

export default function TermsDetails({ token, supportEmail }: Props) {
  const [logged, setLogged] = React.useState(false);

  return (
    <details
      id="terms"
      onToggle={(e) => {
        const el = e.currentTarget as HTMLDetailsElement;

        // Only log when opened (not closed), and only once per page load
        if (!el.open || logged) return;

        setLogged(true);

        fetch("/api/terms-viewed", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token }),
          keepalive: true,
        }).catch(() => {});
      }}
    >
      <summary
        style={{
          padding: "12px 14px",
          cursor: "pointer",
          fontWeight: 800,
          color: "#111827",
          listStyle: "none",
          outline: "none",
        }}
      >
        Terms &amp; Conditions
        <span
          style={{
            float: "right",
            color: "#64748b",
            fontWeight: 900,
          }}
        >
          Expand →
        </span>
      </summary>

      <div style={{ height: 1, background: "#e5e7eb" }} />

      <div
        style={{
          padding: 16,
          fontSize: 13,
          color: "#4b5563",
          lineHeight: 1.65,
        }}
      >
        <div style={{ fontWeight: 800, color: "#111827", marginBottom: 10 }}>
          By participating, you acknowledge the following:
        </div>

        <ol style={{ margin: 0, paddingLeft: 18 }}>
          <li style={{ marginBottom: 10 }}>
            <strong style={{ color: "#111827" }}>
              Qualified health insurance requirement.
            </strong>{" "}
            I affirm that I have qualified health insurance through my employer,
            my spouse, my parent, the ACA exchange (if not receiving a subsidy),
            TRICARE, or Medicare Part A or C.{" "}
            <strong style={{ color: "#111827" }}>
              Medicaid is not considered qualified health insurance.
            </strong>
          </li>

          <li style={{ marginBottom: 10 }}>
            <strong style={{ color: "#111827" }}>
              Section 125 salary reduction authorization.
            </strong>{" "}
            I authorize a salary reduction for the pre-tax premium for the
            Preventive Care Management Program. I understand Section 125 rules
            apply and that this election cannot be revoked during the plan year
            unless a qualifying event occurs. Participation may reduce my
            Federal, State, Social Security, and Medicare tax contributions.
          </li>

          <li style={{ marginBottom: 10 }}>
            <strong style={{ color: "#111827" }}>
              Activity requirement for eligibility.
            </strong>{" "}
            To remain eligible, I must complete at least one activity during the
            plan year within the Personal Portal (e.g., health assessment,
            coaching session, educational access, or similar activity).
          </li>

          <li style={{ marginBottom: 10 }}>
            <strong style={{ color: "#111827" }}>
              Administrative fee acknowledgment.
            </strong>{" "}
            I understand and agree to pay an administrative fee, deducted from
            tax savings.
          </li>

          <li>
            <strong style={{ color: "#111827" }}>
              Communications consent.
            </strong>{" "}
            I consent to receive updates, SMS messages, voicemail messages, and
            email communications for program purposes. Standard message and data
            rates may apply.
          </li>
        </ol>

        <div style={{ marginTop: 12, fontSize: 12, color: "#6b7280" }}>
          Questions? Contact{" "}
          <strong style={{ color: "#111827" }}>{supportEmail}</strong>.
        </div>
      </div>
    </details>
  );
}