import React from "react";

/* =========================
   Card styles
   ========================= */

export const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 16,
  border: "1px solid #e2e8f0",
  boxShadow: "0 10px 25px rgba(15, 23, 42, 0.08)",
};

export const cardPad: React.CSSProperties = {
  padding: 20,
};

/* =========================
   Text styles
   ========================= */

export const subtleText: React.CSSProperties = {
  color: "#64748b", // slate-500
};

/* =========================
   Button styles
   ========================= */

export const buttonStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  fontWeight: 700,
  fontSize: 13,
  background: "#ffffff",
  color: "#0f172a",
  cursor: "pointer",
  transition: "all 0.15s ease",
};

export const buttonPrimaryStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "#3E6F9F",          // refined SaaS blue
  color: "#ffffff",
  border: "1px solid #3E6F9F",    // match border to background
  boxShadow: "0 1px 2px rgba(0,0,0,0.08)", 
  transition: "all 0.15s ease"
};