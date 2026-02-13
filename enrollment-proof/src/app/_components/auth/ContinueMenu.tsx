"use client";

import { useState, useRef, useEffect } from "react";

type Props = {
  returnTo: string;
  variant?: "dark" | "light";
};

export default function ContinueMenu({ returnTo, variant = "dark" }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isDark = variant === "dark";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          padding: "10px 14px",
          borderRadius: 12,
          border: isDark ? "1px solid #111827" : "1px solid #e5e7eb",
          fontWeight: 900,
          fontSize: 13,
          background: isDark ? "#111827" : "#ffffff",
          color: isDark ? "#ffffff" : "#0f172a",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        Continue ▾
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "110%",
            minWidth: 220,
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            boxShadow: "0 10px 30px rgba(15,23,42,0.12)",
            padding: 8,
            zIndex: 50,
          }}
        >
          <a
            href={`/api/auth/google/login?returnTo=${encodeURIComponent(returnTo)}`}
            style={itemStyle}
          >
            Continue with Google
          </a>

          <a
            href={`/api/auth/microsoft/login?returnTo=${encodeURIComponent(returnTo)}`}
            style={itemStyle}
          >
            Continue with Microsoft
          </a>
        </div>
      )}
    </div>
  );
}

const itemStyle: React.CSSProperties = {
  display: "block",
  padding: "10px 12px",
  borderRadius: 10,
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 700,
  color: "#0f172a",
};