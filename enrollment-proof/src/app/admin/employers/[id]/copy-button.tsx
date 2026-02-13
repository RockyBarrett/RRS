"use client";

import { useState } from "react";

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Fallback if clipboard permissions fail
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  }

  return (
    <button
      onClick={copy}
      style={{
        padding: "8px 10px",
        borderRadius: 10,
        border: "1px solid #ccc",
        cursor: "pointer",
        fontWeight: 700,
        fontSize: 12,
      }}
      title={text}
    >
      {copied ? "Copied ✓" : "Copy link"}
    </button>
  );
}