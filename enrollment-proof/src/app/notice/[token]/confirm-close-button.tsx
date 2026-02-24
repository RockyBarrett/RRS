"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

type Props = {
  token: string;

  enrollmentType?: "passive" | "active" | string;
  election?: "opt_in" | "opt_out" | null;

  // coming from server page.tsx
  insuranceSelection?: "yes" | "no" | null;

  fallbackHref?: string;
};

const LS_KEY = (token: string) => `flow_insurance_selection_${token}`;

export default function ConfirmCloseButton({
  token,
  enrollmentType = "passive",
  election = null,
  insuranceSelection = null,
  fallbackHref = "/",
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const isActiveEnrollment = enrollmentType === "active";

  // Local fallback so UI can unlock instantly even before server props refresh
  const [localInsurance, setLocalInsurance] = React.useState<"yes" | "no" | null>(null);

  React.useEffect(() => {
    // initialize from localStorage
    try {
      const v = localStorage.getItem(LS_KEY(token));
      if (v === "yes" || v === "no") setLocalInsurance(v);
    } catch {
      // ignore
    }

    const handler = (e: Event) => {
      const ce = e as CustomEvent;
      if (!ce?.detail) return;
      if (ce.detail.token !== token) return;
      const sel = ce.detail.selection;
      if (sel === "yes" || sel === "no" || sel === null) setLocalInsurance(sel);
    };

    window.addEventListener("flow:insurance-selection", handler as any);
    return () => window.removeEventListener("flow:insurance-selection", handler as any);
  }, [token]);

  const effectiveInsurance: "yes" | "no" | null = insuranceSelection ?? localInsurance ?? null;

  const missingElection = isActiveEnrollment && !election;
  const missingInsurance = isActiveEnrollment && !effectiveInsurance;

  const blocked = missingElection || missingInsurance;

  function blockedLabel() {
    if (!isActiveEnrollment) return "Confirm & Close";
    if (missingElection && missingInsurance) return "Select insurance + option above";
    if (missingInsurance) return "Select insurance above";
    if (missingElection) return "Select an option above";
    return "Confirm & Close";
  }

  function blockedTitle() {
    if (!isActiveEnrollment) return "Confirm & Close";
    if (missingElection && missingInsurance)
      return "Please select your insurance affirmation and choose Opt In or Opt Out first";
    if (missingInsurance) return "Please select your insurance affirmation first";
    if (missingElection) return "Please select Opt In or Opt Out first";
    return "Confirm & Close";
  }

  async function handleConfirm() {
    if (busy || blocked) return;

    setBusy(true);

    try {
      const res = await fetch("/api/confirm-close", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const json = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(json?.error || "Failed to confirm");

      router.refresh();
      setDone(true);

      window.close();

      setTimeout(() => {
        window.location.replace(fallbackHref);
      }, 350);
    } catch (e: any) {
      alert(e?.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={handleConfirm}
      disabled={busy || done || blocked}
      style={{
        padding: "10px 14px",
        borderRadius: 12,
        borderStyle: "solid",
        borderWidth: 1,
        borderColor: "#e5e7eb",
        background: done ? "#16a34a" : blocked ? "#9ca3af" : "#5da56bff",
        color: "#ffffff",
        fontWeight: 900,
        fontSize: 14,
        cursor: busy || done || blocked ? "not-allowed" : "pointer",
        opacity: blocked ? 0.85 : 1,
      }}
      title={done ? "Confirmed" : blockedTitle()}
    >
      {busy ? "Updating…" : done ? "Confirmed" : blockedLabel()}
    </button>
  );
}