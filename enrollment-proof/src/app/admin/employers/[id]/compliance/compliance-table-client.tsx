"use client";

import * as React from "react";
import { cardStyle, subtleText, buttonStyle, buttonPrimaryStyle } from "@/app/admin/_ui";

type Row = {
  employee_id: string;
  name: string;
  email: string;
  last_login_at: string | null;
  status: "Compliant" | "Not compliant" | "Overridden";
  portal_url: string | null;
  last_reminder_at: string | null; // ✅ NEW
};

type Props = {
  employerId: string;
  planYearId: string;
  latestRunLabel: string;
  rows: Row[];
  employerName: string;
  supportEmail: string;
};

function fmtDateTime(ts: string | null | undefined) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

function StatusPill({ status }: { status: Row["status"] }) {
  const isCompliant = status === "Compliant";
  const isOverridden = status === "Overridden";

  const bg = isCompliant ? "#ecfdf5" : isOverridden ? "#f5f3ff" : "#fef2f2";
  const border = isCompliant ? "#a7f3d0" : isOverridden ? "#ddd6fe" : "#fecaca";
  const text = isCompliant ? "#065f46" : isOverridden ? "#5b21b6" : "#991b1b";
  const dot = isCompliant ? "#10b981" : isOverridden ? "#8b5cf6" : "#ef4444";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 999,
        border: `1px solid ${border}`,
        background: bg,
        color: text,
        fontWeight: 900,
        fontSize: 12,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 999, background: dot }} />
      {status}
    </span>
  );
}

function MissingPill() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid #fed7aa",
        background: "#fff7ed",
        color: "#9a3412",
        fontWeight: 900,
        fontSize: 12,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 999, background: "#f97316" }} />
      Missing link
    </span>
  );
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(17,24,39,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 820,
          background: "#fff",
          borderRadius: 18,
          border: "1px solid #e5e7eb",
          boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: 16,
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ fontWeight: 900, color: "#111827" }}>{title}</div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              padding: "6px 10px",
              cursor: "pointer",
              fontWeight: 900,
            }}
          >
            Close
          </button>
        </div>
        <div style={{ padding: 16 }}>{children}</div>
      </div>
    </div>
  );
}

function buildReminderEmail(opts: {
  employeeName: string;
  portalLink: string;
  employerName: string;
  supportEmail: string;
}) {
  const firstName = (opts.employeeName || "").split(" ")[0].trim() || "there";

  const subject = `Bar-All Benefits: Please log in to your Attentive portal`;

  const text = `Hi ${firstName},

Bar-All’s new plan year is underway, and we’re reaching out to remind you to log in to your Attentive benefits portal.

Did you know? Through Attentive you already have access to:
• 24/7 telemedicine
• A top-tier EAP (employee assistance program)
• Virtual counseling resources
• Preventive care support — all at no cost to you

Logging in ensures:
- Your benefits access continues uninterrupted
- You remain compliant for the current plan year
- You can view and use available preventive care benefits

Please complete your login using your personal secure link:

${opts.portalLink}

If you’ve already completed this step, you can ignore this message.

Questions or need help? Contact:
${opts.supportEmail}

Best regards,
${opts.employerName} Benefits Team
`;

  return { subject, text };
}

export default function ComplianceTableClient({
  employerId,
  planYearId,
  rows,
  employerName,
  supportEmail,
}: Props) {
  const [filter, setFilter] = React.useState<"All" | "Not compliant" | "Compliant" | "Overridden">("All");
  const [sending, setSending] = React.useState(false);
  const [sentMsg, setSentMsg] = React.useState<string | null>(null);

  // Preview modal state
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [previewTitle, setPreviewTitle] = React.useState("Email Preview");
  const [previewTo, setPreviewTo] = React.useState<string[]>([]);
  const [previewEmployeeIds, setPreviewEmployeeIds] = React.useState<string[]>([]);
  const [previewSubject, setPreviewSubject] = React.useState("");
  const [previewBody, setPreviewBody] = React.useState("");
  const [previewEditMode, setPreviewEditMode] = React.useState(true);

  const filtered = React.useMemo(() => {
    if (filter === "All") return rows;
    return rows.filter((r) => r.status === filter);
  }, [rows, filter]);

  const noncompliantRows = React.useMemo(() => {
    return rows.filter((r) => r.status === "Not compliant");
  }, [rows]);

  // hard rule: only send if portal_url exists
  const noncompliantSendable = React.useMemo(() => {
    return noncompliantRows.filter((r) => !!r.portal_url);
  }, [noncompliantRows]);

  const noncompliantIds = React.useMemo(() => {
    return noncompliantSendable.map((r) => r.employee_id);
  }, [noncompliantSendable]);

  const missingLinkCount = React.useMemo(() => {
    return noncompliantRows.filter((r) => !r.portal_url).length;
  }, [noncompliantRows]);

  async function sendReminder(employeeIds: string[]) {
    setSending(true);
    setSentMsg(null);

    try {
      const res = await fetch(`/api/admin/employers/${employerId}/compliance/send-reminders`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          plan_year_id: planYearId,
          employee_ids: employeeIds,
        }),
      });

      const raw = await res.text();

let data: any = null;
try {
  data = raw ? JSON.parse(raw) : null;
} catch {
  // not JSON, keep raw
}

if (!res.ok) {
  const msg = data?.error || data?.message || raw || `Send failed (${res.status})`;
  throw new Error(msg);
}

      const skipped = Number(data?.skippedMissingLink ?? 0);
      const sent = Number(data?.sent ?? 0);

      setSentMsg(
        skipped > 0
          ? `Sent ${sent} reminder(s). Skipped ${skipped} (missing portal link).`
          : `Sent ${sent} reminder(s).`
      );

      // NOTE: Page is server-rendered; the new timestamps will appear on refresh.
      // If you want “instant” update, we can add router.refresh() here.
    } catch (e: any) {
      setSentMsg(e?.message || "Something went wrong.");
    } finally {
      setSending(false);
    }
  }

  function openPreviewForOne(employeeId: string) {
    const row = rows.find((x) => x.employee_id === employeeId);
    if (!row) return;

    if (!row.portal_url) {
      setSentMsg("Cannot preview/send: missing Attentive portal link (re-import report).");
      return;
    }

    const email = buildReminderEmail({
      employeeName: row.name,
      portalLink: row.portal_url,
      employerName,
      supportEmail,
    });

    setPreviewTitle(`Preview: Reminder to ${row.email}`);
    setPreviewTo([row.email]);
    setPreviewEmployeeIds([row.employee_id]);
    setPreviewSubject(email.subject);
    setPreviewBody(email.text);
    setPreviewOpen(true);
  }

  function openPreviewForBulk() {
    if (noncompliantIds.length === 0) {
      setSentMsg(
        missingLinkCount > 0
          ? `0 sendable employees. ${missingLinkCount} noncompliant employee(s) missing portal links.`
          : "No sendable noncompliant employees."
      );
      return;
    }

    setPreviewTitle(`Preview: Send to ${noncompliantIds.length} noncompliant employee(s)`);
    setPreviewTo(noncompliantSendable.map((r) => r.email));
    setPreviewEmployeeIds(noncompliantIds);

    setPreviewSubject(`Bar-All Benefits: Please log in to your Attentive portal`);
    setPreviewBody(
      `Hi there,

(Each employee will receive the full email with their unique portal link.)

Questions or need help? Contact:
${supportEmail}

Best regards,
${employerName} Benefits Team`
    );

    setPreviewOpen(true);
  }

  const pillStyle = (active: boolean) => ({
    borderRadius: 999,
    padding: "8px 12px",
    border: `1px solid ${active ? "#111827" : "#e5e7eb"}`,
    background: active ? "#ffffff" : "#f9fafb",
    fontWeight: 900 as const,
    cursor: "pointer",
    fontSize: 13,
    color: "#111827",
  });

  return (
    <div>
      {/* Filter + bulk actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button style={pillStyle(filter === "All")} onClick={() => setFilter("All")}>
            All
          </button>
          <button style={pillStyle(filter === "Not compliant")} onClick={() => setFilter("Not compliant")}>
            Not compliant
          </button>
          <button style={pillStyle(filter === "Compliant")} onClick={() => setFilter("Compliant")}>
            Compliant
          </button>
          <button style={pillStyle(filter === "Overridden")} onClick={() => setFilter("Overridden")}>
            Overridden
          </button>

          {filter === "Not compliant" && missingLinkCount > 0 && (
            <div style={{ display: "flex", alignItems: "center", marginLeft: 6 }}>
              <MissingPill />
              <span style={{ ...subtleText, marginLeft: 8, fontSize: 12 }}>
                {missingLinkCount} missing portal link(s)
              </span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={openPreviewForBulk}
            disabled={noncompliantIds.length === 0}
            style={{
              ...buttonStyle,
              fontWeight: 900,
              opacity: noncompliantIds.length === 0 ? 0.5 : 1,
              cursor: noncompliantIds.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            Preview bulk
          </button>

          <button
            onClick={() => sendReminder(noncompliantIds)}
            disabled={sending || noncompliantIds.length === 0}
            style={{
              ...buttonStyle,
              fontWeight: 900,
              opacity: sending || noncompliantIds.length === 0 ? 0.5 : 1,
              cursor: sending || noncompliantIds.length === 0 ? "not-allowed" : "pointer",
            }}
            title={
              noncompliantIds.length === 0 && missingLinkCount > 0
                ? "Missing portal links — re-import report"
                : undefined
            }
          >
            {sending ? "Sending…" : "Send reminders (noncompliant)"}
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f9fafb" }}>
              <th style={th}>Name</th>
              <th style={th}>Email</th>
              <th style={th}>Status</th>
              <th style={th}>Last login</th>
              <th style={th}>Portal link</th>
              <th style={th}>Last reminder</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((r, idx) => {
              const canRemind = r.status === "Not compliant" && !!r.portal_url;

              return (
                <tr
                  key={`${r.employee_id}-${r.email}`}
                  style={{
                    borderTop: "1px solid #e5e7eb",
                    background: idx % 2 === 0 ? "#ffffff" : "#fcfcfd",
                  }}
                >
                  <td style={{ padding: "14px 16px", fontWeight: 800, color: "#111827" }}>
                    {r.name || "(No name)"}
                  </td>

                  <td style={{ padding: "14px 16px", color: "#111827" }}>{r.email}</td>

                  <td style={{ padding: "14px 16px" }}>
                    <StatusPill status={r.status} />
                  </td>

                  <td style={{ padding: "14px 16px", color: "#111827" }}>{fmtDateTime(r.last_login_at)}</td>

                  {/* Portal link */}
                  <td style={{ padding: "14px 16px" }}>
                    {r.portal_url ? (
                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <a
  href={r.portal_url}
  target="_blank"
  rel="noreferrer"
  style={{
    ...subtleText,
    fontWeight: 900,
    fontSize: 15,
    textDecoration: "none",
    whiteSpace: "nowrap",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  }}
>
  <span>Open</span>
  <span aria-hidden>→</span>
</a>

                        <button
                          onClick={async () => {
                            const ok = await copyToClipboard(r.portal_url!);
                            setSentMsg(ok ? "Copied portal link." : "Copy failed.");
                          }}
                          style={{ ...buttonStyle, fontWeight: 900, padding: "8px 12px" }}
                        >
                          Copy
                        </button>
                      </div>
                    ) : (
                      <MissingPill />
                    )}
                  </td>

                  {/* Last reminder */}
                  <td style={{ padding: "14px 16px", color: "#111827" }}>
                    {fmtDateTime(r.last_reminder_at)}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <button
                        onClick={() => openPreviewForOne(r.employee_id)}
                        disabled={!canRemind}
                        style={{
                          ...buttonStyle,
                          fontWeight: 900,
                          opacity: canRemind ? 1 : 0.55,
                          cursor: canRemind ? "pointer" : "not-allowed",
                        }}
                        title={!r.portal_url ? "Missing portal link — re-import report" : undefined}
                      >
                        Preview
                      </button>

                      <button
                        onClick={() => sendReminder([r.employee_id])}
                        disabled={sending || !canRemind}
                        style={{
                          ...buttonPrimaryStyle,
                          fontWeight: 900,
                          whiteSpace: "nowrap" as const,
                          opacity: sending || !canRemind ? 0.55 : 1,
                          cursor: sending || !canRemind ? "not-allowed" : "pointer",
                        }}
                        title={!r.portal_url ? "Missing portal link — re-import report" : undefined}
                      >
                        {sending && canRemind ? "Sending…" : "Send reminder"}
                      </button>

                      {r.status === "Compliant" && <div style={{ ...subtleText, fontSize: 12 }}>Not needed</div>}
                      {r.status === "Overridden" && <div style={{ ...subtleText, fontSize: 12 }}>Overridden</div>}
                      {r.status === "Not compliant" && !r.portal_url && (
                        <div style={{ ...subtleText, fontSize: 12 }}>Missing portal link</div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 16, ...subtleText }}>
                  No rows match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {sentMsg && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 12,
            background: sentMsg.startsWith("Sent") || sentMsg.startsWith("Copied") ? "#ecfdf5" : "#fef2f2",
            border: sentMsg.startsWith("Sent") || sentMsg.startsWith("Copied") ? "1px solid #a7f3d0" : "1px solid #fecaca",
            color: sentMsg.startsWith("Sent") || sentMsg.startsWith("Copied") ? "#065f46" : "#991b1b",
            fontWeight: 800,
          }}
        >
          {sentMsg}
        </div>
      )}

      {/* Preview Modal */}
<Modal open={previewOpen} title={previewTitle} onClose={() => setPreviewOpen(false)}>
  <div style={{ display: "grid", gap: 14 }}>
    {/* TO */}
    <div>
      <div style={{ ...subtleText, fontSize: 12, marginBottom: 6 }}>To</div>
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 12,
          background: "#f8fafc",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 12,
          color: "#111827",
          maxHeight: 120,
          overflow: "auto",
          whiteSpace: "pre-wrap",
        }}
      >
        {previewTo.join("\n")}
      </div>
    </div>

    {/* SUBJECT */}
    <div>
      <div style={{ ...subtleText, fontSize: 12, marginBottom: 6 }}>Subject</div>
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 12,
          background: "#ffffff",
          fontWeight: 900,
          color: "#111827",
        }}
      >
        {previewSubject || "—"}
      </div>
    </div>

    {/* BODY + TOGGLE */}
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          marginBottom: 6,
        }}
      >
        <div style={{ ...subtleText, fontSize: 12 }}>Body</div>

        <button
          type="button"
          onClick={() => setPreviewEditMode((v: boolean) => !v)}
          style={{
            ...buttonStyle,
            padding: "6px 10px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 900,
          }}
        >
          {previewEditMode ? "Preview" : "Edit"}
        </button>
      </div>

      {previewEditMode ? (
        <textarea
          value={previewBody}
          onChange={(e) => setPreviewBody(e.target.value)}
          style={{
            width: "100%",
            minHeight: 260,
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 14,
            fontSize: 14,
            lineHeight: 1.65,
            fontFamily:
              "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto",
            background: "#ffffff",
            color: "#111827",
            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.04)",
            resize: "vertical",
          }}
        />
      ) : (
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 14,
            background: "#ffffff",
            color: "#111827",
            fontSize: 14,
            lineHeight: 1.65,
            whiteSpace: "pre-wrap",
          }}
        >
          {previewBody || "—"}
        </div>
      )}
    </div>

    {/* ACTIONS */}
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
      <button onClick={() => setPreviewOpen(false)} style={buttonStyle}>
        Close
      </button>

      <button
        onClick={async () => {
          await sendReminder(previewEmployeeIds);
          setPreviewOpen(false);
        }}
        disabled={sending || previewEmployeeIds.length === 0}
        style={{
          ...buttonPrimaryStyle,
          fontWeight: 900,
          opacity: sending || previewEmployeeIds.length === 0 ? 0.6 : 1,
          cursor: sending || previewEmployeeIds.length === 0 ? "not-allowed" : "pointer",
        }}
      >
        {sending ? "Sending…" : "Send now"}
      </button>
    </div>

    <div style={{ ...subtleText, fontSize: 12, lineHeight: 1.5 }}>
      Tip: You can edit the body above. This preview content will be sent as-is.
    </div>
  </div>
</Modal>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 16px",
  fontSize: 12,
  color: "#374151",
};