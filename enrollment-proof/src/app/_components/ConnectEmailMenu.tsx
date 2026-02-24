"use client";

import { useEffect, useRef, useState } from "react";

export default function ConnectEmailMenu({
  employerId,
  returnTo,
  variant = "dark",
}: {
  employerId: string;
  returnTo: string;
  variant?: "dark" | "light";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as any)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const btn = {
    padding: "8px 10px",
    borderRadius: 10,
    border: variant === "dark" ? "1px solid #111827" : "1px solid #e5e7eb",
    fontWeight: 900,
    textDecoration: "none",
    fontSize: 13,
    background: variant === "dark" ? "#111827" : "#ffffff",
    color: variant === "dark" ? "#ffffff" : "#111827",
    display: "inline-flex",
    gap: 8,
    alignItems: "center",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  };

  const item = {
    display: "block",
    padding: "10px 12px",
    textDecoration: "none",
    color: "#111827",
    fontWeight: 800,
    fontSize: 13,
  };

  const gmailHref = `/api/auth/google/gmail-connect?returnTo=${encodeURIComponent(
    returnTo
  )}&employerId=${encodeURIComponent(employerId)}`;

  // ✅ FIX: Microsoft "connect email" must use /connect (not /login)
  const msHref = `/api/auth/microsoft/connect?returnTo=${encodeURIComponent(
    returnTo
  )}&employerId=${encodeURIComponent(employerId)}`;

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button type="button" onClick={() => setOpen((v) => !v)} style={btn}>
        Connect Email
        <span style={{ fontWeight: 900, opacity: 0.9 }}>▾</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            width: 220,
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            boxShadow: "0 14px 30px rgba(0,0,0,0.10)",
            overflow: "hidden",
            zIndex: 50,
          }}
        >
          <a href={gmailHref} style={item} onClick={() => setOpen(false)}>
            Connect Gmail
          </a>
          <div style={{ height: 1, background: "#e5e7eb" }} />
          <a href={msHref} style={item} onClick={() => setOpen(false)}>
            Connect Microsoft
          </a>
        </div>
      )}
    </div>
  );
}