"use client";

import { useMemo, useState } from "react";
import { buttonPrimaryStyle, buttonStyle, subtleText } from "@/app/admin/_ui";

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  // Convert ArrayBuffer → base64 in the browser
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

type Result = {
  ok: boolean;
  dryRun: boolean;
  plan_year_id: string;
  counts: {
    scanned: number;
    matchedEmployees: number;
    compliantSet: number;
    noncompliantSet: number;
    skippedNoEmail: number;
    skippedNoEmployeeMatch: number;
    skippedOverride: number;
    upserts?: number;
  };
  error?: string;
};

export default function UploadClient({
  employerId,
  planYearId,
}: {
  employerId: string;
  planYearId: string | null;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<Result | null>(null);
  const [imported, setImported] = useState<Result | null>(null);

  const canRun = useMemo(() => !!file && !!planYearId && !busy, [file, planYearId, busy]);

  async function readFileBase64(f: File): Promise<string> {
    const ab = await f.arrayBuffer();
    return arrayBufferToBase64(ab);
  }

  async function run(dryRun: boolean) {
    setMsg(null);
    setImported(null);
    if (!file) return;

    if (!planYearId) {
      setMsg("No active plan year found. Create an active plan year first.");
      return;
    }

    setBusy(true);
    try {
      const fileBase64 = await readFileBase64(file);

      const res = await fetch(`/api/admin/employers/${employerId}/compliance/import`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fileBase64,
          fileName: file.name,
          plan_year_id: planYearId,
          dryRun,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as any;

      if (!res.ok) throw new Error(data?.error || "Import failed");

      const result: Result = data;
      if (dryRun) setPreview(result);
      else setImported(result);
    } catch (e: any) {
      setMsg(e?.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {!planYearId && (
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            marginBottom: 12,
          }}
        >
          <strong style={{ color: "#991b1b" }}>No active plan year found.</strong>{" "}
          <span style={{ color: "#991b1b" }}>
            Create one in Supabase (plan_years table) or we can add a UI create button next.
          </span>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="file"
          accept=".xlsx"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />

        <button
          onClick={() => run(true)}
          disabled={!canRun}
          style={{ ...(canRun ? buttonStyle : buttonStyle), opacity: canRun ? 1 : 0.5 }}
        >
          {busy ? "Working…" : "Preview (dry run)"}
        </button>

        <button
          onClick={() => run(false)}
          disabled={!canRun || !preview}
          style={{
            ...(canRun && preview ? buttonPrimaryStyle : buttonStyle),
            opacity: canRun && preview ? 1 : 0.5,
            cursor: canRun && preview ? "pointer" : "not-allowed",
          }}
          title={!preview ? "Run Preview first" : "Import"}
        >
          {busy ? "Working…" : "Import"}
        </button>
      </div>

      <div style={{ marginTop: 10, ...subtleText, fontSize: 12 }}>
        Tip: Always run <strong>Preview</strong> first to confirm counts before importing.
      </div>

      {msg && (
        <div style={{ marginTop: 12, color: "#b91c1c", fontWeight: 800 }}>
          {msg}
        </div>
      )}

      {preview && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>PREVIEW</div>
          <pre
            style={{
              margin: 0,
              padding: 12,
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              background: "#fafafa",
              overflowX: "auto",
            }}
          >
{JSON.stringify(preview.counts, null, 2)}
          </pre>
        </div>
      )}

      {imported && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>IMPORTED</div>
          <pre
            style={{
              margin: 0,
              padding: 12,
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              background: "#fafafa",
              overflowX: "auto",
            }}
          >
{JSON.stringify(imported.counts, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}