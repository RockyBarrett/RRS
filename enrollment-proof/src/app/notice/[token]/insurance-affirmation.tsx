"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

type Props = {
  token: string;
  isOptedOut: boolean;
  supportEmail: string;
  enrollmentType?: "passive" | "active" | string;
};

const LS_KEY = (token: string) => `flow_insurance_selection_${token}`;

export default function InsuranceAffirmation({
  token,
  isOptedOut,
  supportEmail,
  enrollmentType = "passive",
}: Props) {
  const router = useRouter();
  const isActiveEnrollment = enrollmentType === "active";

  const [selection, setSelection] = React.useState<"yes" | "no" | null>(
    isActiveEnrollment ? null : "yes"
  );
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (isOptedOut) {
      setSelection("no");
      return;
    }
    setSelection(isActiveEnrollment ? null : "yes");
  }, [isOptedOut, isActiveEnrollment]);

  function broadcastLocalInsurance(next: "yes" | "no" | null) {
    try {
      if (next) localStorage.setItem(LS_KEY(token), next);
      else localStorage.removeItem(LS_KEY(token));

      window.dispatchEvent(
        new CustomEvent("flow:insurance-selection", {
          detail: { token, selection: next },
        })
      );
    } catch {}
  }

  async function saveInsuranceSelection(next: "yes" | "no") {
    const res = await fetch("/api/insurance-selection", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, selection: next }),
    });

    const json = await res.json().catch(() => ({} as any));
    if (!res.ok) throw new Error(json?.error || "Failed to save insurance selection");

    router.refresh();
  }

  async function handleSelect(next: "yes" | "no") {
    if (busy || isOptedOut) return;

    setBusy(true);

    try {
      if (next === "no") {
        const ok = window.confirm(
          "If you do not have qualified health insurance, you must opt out of this program.\n\nDo you want to opt out now?"
        );

        if (!ok) {
          const fallback = isActiveEnrollment ? null : "yes";
          setSelection(fallback);
          broadcastLocalInsurance(fallback);
          return;
        }
      }

      setSelection(next);
      broadcastLocalInsurance(next);

      await saveInsuranceSelection(next);

      if (next === "no") {
        const res = await fetch("/api/opt-out", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const json = await res.json().catch(() => ({} as any));
        if (!res.ok) throw new Error(json?.error || "Opt-out failed");

        router.refresh();
      }
    } catch (err: any) {
      alert(err?.message || "Something went wrong. Please contact support.");
      const fallback = isActiveEnrollment ? null : "yes";
      setSelection(fallback);
      broadcastLocalInsurance(fallback);
    } finally {
      setBusy(false);
    }
  }

  const checkboxBase: React.CSSProperties = {
    marginTop: 3,
    width: 14,
    height: 14,
    borderRadius: 4,
    appearance: "none",
    WebkitAppearance: "none",
    display: "inline-block",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#5d83a5ff",
    background: "#ffffff",
  };

  function getCheckboxStyle(checked: boolean, disabled: boolean): React.CSSProperties {
    const base: React.CSSProperties = {
      ...checkboxBase,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.6 : 1,
    };

    if (!checked) return base;

    return {
      ...base,
      background: "#60a5fa",
      borderColor: "#60a5fa",
      backgroundImage:
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cpath fill='white' d='M7.5 13.5 4.5 10.5l-1.4 1.4 4.4 4.4L17 6.8 15.6 5.4z'/%3E%3C/svg%3E\")",
      backgroundRepeat: "no-repeat",
      backgroundPosition: "center",
      backgroundSize: "14px 14px",
    };
  }

  const optionRowStyle: React.CSSProperties = {
    display: "flex",
    gap: 8,
    alignItems: "flex-start",
    cursor: busy || isOptedOut ? "not-allowed" : "pointer",
    opacity: busy ? 0.75 : 1,
  };

  return (
    <div
      style={{
        marginTop: 16,
        borderStyle: "solid",
        borderWidth: 1,
        borderColor: "#e5e7eb",
        background: "#f9fafb",
        borderRadius: 12,
        padding: 14,
      }}
    >
      {isActiveEnrollment ? (
        <>
          <div style={{ fontWeight: 900, color: "#111827" }}>
            Step 1 (Required): Confirm health coverage
          </div>

          <div style={{ marginTop: 6, fontSize: 13, color: "#4b5563", lineHeight: 1.5 }}>
            This program is available to employees who already have qualified health coverage.
            Please confirm your current coverage status below to continue.
          </div>

          <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>
            Qualified coverage may include employer coverage, a spouse/parent plan, an ACA exchange
            plan (if not receiving a subsidy), TRICARE, or Medicare Part A or C.
            <strong style={{ color: "#111827" }}>
              {" "}Medicaid is not considered qualified coverage.
            </strong>
          </div>
        </>
      ) : (
        <>
          <div
            style={{
              fontSize: 12,
              color: "#6b7280",
              letterSpacing: 0.4,
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Insurance affirmation
          </div>

          <div style={{ fontSize: 13, color: "#4b5563", lineHeight: 1.5 }}>
            <strong style={{ color: "#111827" }}>
              You must have some form of qualified health insurance to participate in this program
            </strong>
            . Qualified coverage may include employer coverage, spouse/parent plan, ACA exchange
            (if not receiving a subsidy), TRICARE, or Medicare Part A or C.{" "}
            <strong style={{ color: "#111827" }}>
              Medicaid is not considered qualified health insurance.
            </strong>
          </div>
        </>
      )}

      {isOptedOut ? (
        <div style={{ marginTop: 12, fontSize: 13, color: "#991b1b" }}>
          You are currently opted out. Questions?{" "}
          <strong style={{ color: "#111827" }}>{supportEmail}</strong>
        </div>
      ) : (
        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          <label style={optionRowStyle}>
            <input
              type="checkbox"
              checked={selection === "yes"}
              disabled={busy}
              onChange={() => handleSelect("yes")}
              style={getCheckboxStyle(selection === "yes", busy)}
            />
            <div>
              <div style={{ fontWeight: 600, color: "#111827" }}>
                I have qualified health insurance
              </div>
            </div>
          </label>

          <label style={optionRowStyle}>
            <input
              type="checkbox"
              checked={selection === "no"}
              disabled={busy}
              onChange={() => handleSelect("no")}
              style={getCheckboxStyle(selection === "no", busy)}
            />
            <div>
              <div style={{ fontWeight: 600, color: "#111827" }}>
                I do not have qualified health insurance
              </div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                Selecting this will opt you out.
              </div>
            </div>
          </label>
        </div>
      )}
    </div>
  );
}