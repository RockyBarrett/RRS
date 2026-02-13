"use client";

import { useMemo, useState } from "react";

type LinkRow = {
  email: string;
  first_name: string;
  last_name: string;
  token: string;
  notice_link: string;
  eligible: boolean;
};

type ImportCounts = {
  inserted?: number;
  updated?: number;
  unchanged?: number;
  skipped?: number;
  skippedDuplicates?: number;
  upsertErrors?: number;
};

type ImportResult = {
  ok?: boolean;
  dryRun?: boolean;
  employer?: { id: string; name: string };
  counts?: ImportCounts;
  links?: LinkRow[];
  error?: string;
};

export default function UploadClient({ employerId }: { employerId: string }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);

  // store the last uploaded CSV text so we can confirm without re-uploading
  const [csvText, setCsvText] = useState<string>("");

  const hasPreview = !!result?.counts && result?.dryRun === true;
  const canConfirm = hasPreview && !busy && csvText.length > 0;
  const canDownloadLinks = links.length > 0;

  const csvOut = useMemo(() => {
    const headers = ["email", "first_name", "last_name", "eligible", "token", "notice_link"];
    const escape = (s: any) => {
      const v = s == null ? "" : String(s);
      if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
      return v;
    };
    const rows = (links ?? []).map((r) =>
      [r.email, r.first_name, r.last_name, r.eligible ? "true" : "false", r.token, r.notice_link]
        .map(escape)
        .join(",")
    );
    return headers.join(",") + "\n" + rows.join("\n");
  }, [links]);

  function formatCounts(prefix: string, counts?: ImportCounts) {
    const c = counts || {};
    const skippedTotal = (c.skipped ?? 0) + (c.skippedDuplicates ?? 0);
    return `${prefix}${c.inserted ?? 0} inserted · ${c.updated ?? 0} updated · ${
      c.unchanged ?? 0
    } unchanged · ${skippedTotal} skipped`;
  }

  async function runImport(dryRun: boolean, csv: string, name?: string) {
    setBusy(true);
    setMsg(null);
    setLinks([]);
    setResult(null);

    try {
      const res = await fetch(`/api/admin/employers/${employerId}/import`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ csvText: csv, dryRun }),
      });

      const data: ImportResult = await res.json().catch(() => ({} as any));
      setResult(data);

      if (!res.ok || data.ok === false) {
        throw new Error(data?.error || "Import failed");
      }

      if (dryRun) {
        setMsg(formatCounts("PREVIEW: ", data.counts));
        setLinks([]); // no links in preview
      } else {
        setMsg(formatCounts("", data.counts));
        setLinks(data.links ?? []);
      }

      if (name) setFileName(name);
    } catch (err: any) {
      setMsg(err?.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    const text = await f.text();
    setCsvText(text);
    setFileName(f.name);

    // Always preview first
    await runImport(true, text, f.name);

    // allow choosing same file again later
    e.target.value = "";
  }

  async function onConfirmImport() {
    if (!csvText) return;
    await runImport(false, csvText, fileName ?? undefined);
  }

  function downloadLinksCSV() {
    const blob = new Blob([csvOut], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `notice_links_${employerId}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <input type="file" accept=".csv,text/csv" onChange={onPickFile} />
        {fileName && <span style={{ opacity: 0.8 }}>{fileName}</span>}
        {busy && <strong>Working…</strong>}
      </div>

      {msg && (
        <div style={{ marginTop: 12, padding: 12, background: "#fafafa", borderRadius: 12 }}>
          {msg}
        </div>
      )}

      {result?.counts && (
        <pre
          style={{
            marginTop: 10,
            padding: 12,
            background: "#fff",
            border: "1px solid #eee",
            borderRadius: 10,
            fontSize: 12,
            overflowX: "auto",
          }}
        >
{JSON.stringify(result.counts, null, 2)}
        </pre>
      )}

      {/* Confirm button appears only after preview */}
      {hasPreview && (
        <div style={{ marginTop: 14, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={onConfirmImport}
            disabled={!canConfirm}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #ccc",
              fontWeight: 900,
              cursor: canConfirm ? "pointer" : "not-allowed",
            }}
          >
            Confirm Import
          </button>

          <span style={{ opacity: 0.8 }}>
            This will apply the changes shown in the preview.
          </span>
        </div>
      )}

      {/* Links only after real import */}
      {canDownloadLinks && (
        <div style={{ marginTop: 14, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={downloadLinksCSV}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #ccc",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Download Notice Links CSV
          </button>
          <span style={{ opacity: 0.8 }}>
            Links generated: <strong>{links.length}</strong>
          </span>
        </div>
      )}

      {links.length > 0 && (
        <div style={{ marginTop: 16, border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: 12, fontWeight: 800, background: "#fafafa" }}>
            Generated Links (preview)
          </div>
          {links.slice(0, 10).map((r) => (
            <div key={r.token} style={{ padding: 12, borderTop: "1px solid #eee" }}>
              <div style={{ fontWeight: 800 }}>{r.email}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>{r.notice_link}</div>
            </div>
          ))}
          {links.length > 10 && (
            <div style={{ padding: 12, borderTop: "1px solid #eee", opacity: 0.8 }}>
              Showing first 10 of {links.length}.
            </div>
          )}
        </div>
      )}
    </div>
  );
}