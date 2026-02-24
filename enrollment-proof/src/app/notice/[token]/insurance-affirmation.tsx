"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

type Props = {
  token: string;
  isOptedOut: boolean;
  supportEmail: string;
};

export default function InsuranceAffirmation({
  token,
  isOptedOut,
  supportEmail,
}: Props) {
  const router = useRouter();

  const [selection, setSelection] = React.useState<"yes" | "no">("yes");
  const [busy, setBusy] = React.useState(false);

  // ✅ Keep UI in sync with server truth after router.refresh()
  // If opted out => show "no" selected; if not opted out => default to "yes"
  React.useEffect(() => {
    setSelection(isOptedOut ? "no" : "yes");
  }, [isOptedOut]);

  async function handleSelect(next: "yes" | "no") {
    if (busy || isOptedOut) return;

    await fetch("/api/insurance-selection", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ token, selection: next }),
});

    if (next === "yes") {
      setSelection("yes");
      return;
    }

    const ok = window.confirm(
      "If you do not have qualified health insurance, you must opt out of this program.\n\nDo you want to opt out now?"
    );

    if (!ok) {
      setSelection("yes");
      return;
    }

    setBusy(true);
    setSelection("no");

    try {
      const res = await fetch("/api/opt-out", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Opt-out failed");

      // ✅ This triggers server re-fetch so isOptedOut updates
      router.refresh();
    } catch (err) {
      alert("Something went wrong while opting out. Please contact support.");
      setSelection("yes");
    } finally {
      setBusy(false);
    }
  }

  // --- Custom Checkbox Styling (NO shorthand border) ---
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
    borderColor: "#5d83a5ff", // unchecked outline
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
      . Qualified coverage may include employer coverage, spouse/parent plan, ACA
        exchange (if not receiving a subsidy), TRICARE, or Medicare Part A or C.{" "}
        <strong style={{ color: "#111827" }}>
          Medicaid is not considered qualified health insurance.
        </strong>
      </div>

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
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                No further action is required.
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