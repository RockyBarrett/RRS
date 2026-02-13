"use client";

import React from "react";

export default function EmailStatusPill({
  status,
  email,
}: {
  status: "approved" | "pending" | "not_connected";
  email?: string | null;
}) {
  if (status === "approved") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 10px",
          borderRadius: 999,
          border: "1px solid #d1fae5",
          background: "#ecfdf5",
          color: "#065f46",
          fontWeight: 900,
          fontSize: 12,
          whiteSpace: "nowrap",
        }}
        title={email ? `Connected as ${email}` : "Email connected"}
      >
        <span style={{ width: 8, height: 8, borderRadius: 999, background: "#10b981" }} />
        Email connected
        {email ? (
          <>
            <span style={{ fontWeight: 700, color: "#064e3b" }}>·</span>
            <span style={{ fontWeight: 700, color: "#064e3b" }}>{email}</span>
          </>
        ) : null}
      </span>
    );
  }

  if (status === "pending") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 10px",
          borderRadius: 999,
          border: "1px solid #fde68a",
          background: "#fffbeb",
          color: "#92400e",
          fontWeight: 900,
          fontSize: 12,
          whiteSpace: "nowrap",
        }}
        title={email ? `Pending approval for ${email}` : "Pending approval"}
      >
        <span style={{ width: 8, height: 8, borderRadius: 999, background: "#f59e0b" }} />
        Pending approval
        {email ? (
          <>
            <span style={{ fontWeight: 700, color: "#92400e" }}>·</span>
            <span style={{ fontWeight: 700, color: "#92400e" }}>{email}</span>
          </>
        ) : null}
      </span>
    );
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 10px",
        borderRadius: 999,
        border: "1px solid #fecaca",
        background: "#fef2f2",
        color: "#991b1b",
        fontWeight: 900,
        fontSize: 12,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 999, background: "#ef4444" }} />
      Email not connected
    </span>
  );
}