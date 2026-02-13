"use client";

import { useEffect, useRef, useState } from "react";

function formatMoneyFromCents(cents: number) {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(dollars);
}

export default function SavingsAnimated({
  monthlyCents,
  annualCents,
}: {
  monthlyCents: number;
  annualCents: number;
}) {
  const [m, setM] = useState(monthlyCents);
  const [a, setA] = useState(annualCents);

  const prev = useRef({ m: monthlyCents, a: annualCents });
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const startM = prev.current.m;
    const startA = prev.current.a;

    const endM = monthlyCents;
    const endA = annualCents;

    prev.current = { m: endM, a: endA };

    // If nothing changed, skip animation.
    if (startM === endM && startA === endA) return;

    const duration = 550; // ms
    const start = performance.now();

    if (raf.current) cancelAnimationFrame(raf.current);

    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - p, 3);

      const curM = Math.round(startM + (endM - startM) * ease);
      const curA = Math.round(startA + (endA - startA) * ease);

      setM(curM);
      setA(curA);

      if (p < 1) raf.current = requestAnimationFrame(tick);
    };

    raf.current = requestAnimationFrame(tick);

    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [monthlyCents, annualCents]);

  return (
    <div>
      <div style={{ marginTop: 6, fontSize: 34, fontWeight: 900 }}>
        {formatMoneyFromCents(m)}/mo
      </div>
      <div style={{ marginTop: 2, color: "#4b5563" }}>
        ≈ {formatMoneyFromCents(a)}/yr (approx.)
      </div>
    </div>
  );
}