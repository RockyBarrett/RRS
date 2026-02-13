"use client";

import React, { useEffect, useMemo, useState } from "react";
import CopyButton from "./copy-button";
import { subtleText, buttonStyle, buttonPrimaryStyle } from "@/app/admin/_ui";
import { useRouter } from "next/navigation";
import ViewTracker from "@/app/notice/[token]/view-tracker";

type Employee = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  token: string;
  opted_out_at: string | null;
  eligible?: boolean | null;
  notice_sent_at?: string | null;
  notice_viewed_at?: string | null;
  learn_more_viewed_at?: string | null;
  terms_viewed_at?: string | null;
  confirm_closed_at?: string | null;
  insurance_selection?: "yes" | "no" | null;
  insurance_selected_at?: string | null;
};

type EventRow = {
  id: string;
  employee_id: string;
  event_type: string;
  created_at: string;
};

type TemplateRow = {
  id: string;
  name: string;
  subject: string;
  body: string;
};

type StatusType = "new" | "sent" | "opened" | "acknowledged" | "opted_out";

function StatusPill({ status }: { status: StatusType }) {
  const cfg: Record<
    StatusType,
    { label: string; bg: string; border: string; text: string }
  > = {
    new: { label: "New", bg: "#f9fafb", border: "#e5e7eb", text: "#374151" },
    sent: { label: "Sent", bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
    opened: { label: "Opened", bg: "#dbeafe", border: "#93c5fd", text: "#1d4ed8" },
    acknowledged: { label: "Acknowledged", bg: "#ecfdf5", border: "#a7f3d0", text: "#065f46" },
    opted_out: { label: "Opted out", bg: "#fff7ed", border: "#fed7aa", text: "#9a3412" },
  };

  const c = cfg[status];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 999,
        border: `1px solid ${c.border}`,
        background: c.bg,
        color: c.text,
        fontWeight: 900,
        fontSize: 12,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
      title={c.label}
    >
      <span style={{ width: 8, height: 8, borderRadius: 999, background: c.text }} />
      {c.label}
    </span>
  );
}

function labelEvent(t: string) {
  if (t === "page_view") return "Viewed notice";
  if (t === "learn_more_view") return "Viewed learn more";
  if (t === "opt_in") return "Opted in";
  if (t === "opt_out") return "Opted out";
  if (t === "enrollment_notice_sent") return "Enrollment notice sent";
  if (t === "enrollment_notice_failed") return "Enrollment notice failed";
  return t.replaceAll("_", " ");
}

function fmtDateTime(ts: string) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

function fmtShort(ts: string | null | undefined) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

function latestEventAt(activity: EventRow[], type: string): string | null {
  const hit = (activity ?? []).find((x) => x.event_type === type);
  return hit?.created_at ?? null; // your activity is already sorted newest-first
}

function getLifecycleStatus(e: Employee, activity: EventRow[]): StatusType {
  // Highest priority wins (NOT most recent)

  // ✅ CURRENT TRUTH: if opted_out_at is set, they're opted out.
  // If opted_out_at is NULL, they are NOT opted out (even if opt_out exists historically).
  const isCurrentlyOptedOut = !!e.opted_out_at;

  // Optional: if you *also* support opt_in events and want event-based truth:
  // consider "opted out" only if last opt_out is after last opt_in.
  const lastOptOut = latestEventAt(activity, "opt_out");
  const lastOptIn = latestEventAt(activity, "opt_in");
  const eventSaysOptedOut =
    !!lastOptOut && (!lastOptIn || new Date(lastOptOut).getTime() > new Date(lastOptIn).getTime());

  // Use employee truth first; fall back to events only if you want.
  const optedOutFinal = isCurrentlyOptedOut || (!isCurrentlyOptedOut && eventSaysOptedOut);

  if (optedOutFinal) return "opted_out";

  // ✅ Acknowledged
  if (
    (e as any).confirm_closed_at ||
    !!latestEventAt(activity, "confirm_closed") ||
    !!latestEventAt(activity, "confirm_close") ||
    !!latestEventAt(activity, "acknowledged_closed")
  ) {
    return "acknowledged";
  }

  // ✅ Opened
  if ((e as any).notice_viewed_at || !!latestEventAt(activity, "page_view")) {
    return "opened";
  }

  // ✅ Sent
  if ((e as any).notice_sent_at || !!latestEventAt(activity, "enrollment_notice_sent")) {
    return "sent";
  }

  return "new";
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

export default function EmployeeTableClient({
  employerId,
  employerName = "Employer",
  supportEmail = "support@company.com",
  employees,
  events,
  baseUrl,
  templates,
}: {
  employerId: string;
  employerName?: string;
  supportEmail?: string;
  employees: Employee[];
  events: EventRow[];
  baseUrl: string;
  templates: TemplateRow[];
}) {
  const router = useRouter();

  const [openId, setOpenId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // bulk
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  // template selection
  const defaultTemplateId = (templates ?? [])[0]?.id ?? "";
  const [bulkTemplateId, setBulkTemplateId] = useState<string>(defaultTemplateId);
  const [rowTemplateIds, setRowTemplateIds] = useState<Record<string, string>>({});

  // Preview modal state
const [previewOpen, setPreviewOpen] = useState(false);
const [previewTitle, setPreviewTitle] = useState("Email Preview");
const [previewTo, setPreviewTo] = useState<string[]>([]);
const [previewEmployeeIds, setPreviewEmployeeIds] = useState<string[]>([]);
const [previewTemplateId, setPreviewTemplateId] = useState<string>(""); // ✅ new
const [previewSubject, setPreviewSubject] = useState("");
const [previewBody, setPreviewBody] = useState("");
const [previewEditMode, setPreviewEditMode] = useState(true);

  // If templates arrive later, set defaults once
  useEffect(() => {
    if (!bulkTemplateId && (templates ?? []).length > 0) {
      setBulkTemplateId((templates ?? [])[0].id);
    }
    // also set per-row defaults if empty (optional)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates]);

  function getRowTemplateId(employeeId: string) {
    return rowTemplateIds[employeeId] ?? defaultTemplateId;
  }

  const eventsByEmployee = useMemo(() => {
    const m = new Map<string, EventRow[]>();
    for (const ev of events ?? []) {
      const arr = m.get(ev.employee_id) ?? [];
      arr.push(ev);
      m.set(ev.employee_id, arr);
    }
    for (const [k, arr] of m.entries()) {
      arr.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
      m.set(k, arr);
    }
    return m;
  }, [events]);

  const viewedSet = useMemo(() => {
    const s = new Set<string>();
    for (const ev of events ?? []) {
      if (ev.event_type === "page_view") s.add(ev.employee_id);
    }
    return s;
  }, [events]);

  function toggle(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  function getLastEnrollmentNoticeSentAt(employeeId: string): string | null {
    const arr = eventsByEmployee.get(employeeId) ?? [];
    const ev = arr.find((x) => x.event_type === "enrollment_notice_sent");
    return ev?.created_at ?? null;
  }

  const eligibleActiveEmployees = useMemo(() => {
    return (employees ?? []).filter((e) => {
      const eligible = e.eligible !== false;
      const active = !e.opted_out_at;
      const hasBasics = !!e.email && !!e.token;
      return eligible && active && hasBasics;
    });
  }, [employees]);

  async function sendEnrollmentNotice(employeeId: string, templateId: string) {
    setSendingId(employeeId);
    setToast(null);

    try {
      const res = await fetch(`/api/admin/employers/${employerId}/enrollment/send`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ employee_id: employeeId, template_id: templateId }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Send failed");

      setToast("Sent enrollment notice.");
      router.refresh();
    } catch (e: any) {
      setToast(e?.message || "Send failed.");
    } finally {
      setSendingId(null);
    }
  }

 async function sendBulkEnrollmentNotices(
  employeeIds: string[],
  templateIdOverride?: string,
  overrides?: { subject?: string; body?: string }
) {
  setBulkBusy(true);
  setToast(null);

  const templateToUse = templateIdOverride || bulkTemplateId;

  try {
    const res = await fetch(`/api/admin/employers/${employerId}/enrollment/send`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        employee_ids: employeeIds,
        template_id: templateToUse,
        subject_override: overrides?.subject ?? null,
        body_override: overrides?.body ?? null,
      }),
    });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Bulk send failed");

      const attempted = Number(data?.attempted ?? employeeIds.length);
      const sent = Number(data?.sent ?? 0);

      setToast(`Bulk send complete: ${sent}/${attempted} sent.`);
      setBulkOpen(false);
      router.refresh();
    } catch (e: any) {
      setToast(e?.message || "Bulk send failed.");
    } finally {
      setBulkBusy(false);
    }
  }

  // --------------------
  // Template helpers
  // --------------------
  function getTemplateById(id: string) {
    return (templates ?? []).find((t) => t.id === id) || null;
  }

  function applyVars(template: string, e: Employee) {
    const first = (e.first_name ?? "").trim();
    const last = (e.last_name ?? "").trim();

    const noticeLink = `${baseUrl}/notice/${e.token}`;
    const learnMoreLink = `${baseUrl}/notice/${e.token}/learn-more`;

    return (template || "")
      .replaceAll("{{employee.first_name}}", first || "there")
      .replaceAll("{{employee.last_name}}", last)
      .replaceAll("{{employee.email}}", e.email)
      .replaceAll("{{employer.name}}", employerName)
      .replaceAll("{{employer.support_email}}", supportEmail)
      .replaceAll("{{links.notice}}", noticeLink)
      .replaceAll("{{links.learn_more}}", learnMoreLink);
  }

  // --------------------
  // Preview handlers
  // --------------------
  function openPreviewForOne(e: Employee, templateId: string) {
  const t = getTemplateById(templateId);
  if (!t) {
    setToast("Select a template first.");
    return;
  }

  setPreviewTitle(`Preview: ${t.name} → ${e.email}`);
  setPreviewTo([e.email]);
  setPreviewEmployeeIds([e.id]);
  setPreviewTemplateId(templateId); // ✅ NEW: remember which template this preview represents
  setPreviewSubject(applyVars(t.subject, e));
  setPreviewBody(applyVars(t.body, e));
  setPreviewOpen(true);
}

function openPreviewForBulk() {
  if (eligibleActiveEmployees.length === 0) {
    setToast("No eligible active employees to send.");
    return;
  }

  const t = getTemplateById(bulkTemplateId);
  if (!t) {
    setToast("Select a bulk template first.");
    return;
  }

  const sample = eligibleActiveEmployees[0];

  setPreviewTitle(`Preview: ${t.name} → ${eligibleActiveEmployees.length} employee(s)`);
  setPreviewTo(eligibleActiveEmployees.map((x) => x.email));
  setPreviewEmployeeIds(eligibleActiveEmployees.map((x) => x.id));
  setPreviewTemplateId(bulkTemplateId); // ✅ NEW: bulk preview uses bulk template
  setPreviewSubject(applyVars(t.subject, sample));
  setPreviewBody(
    applyVars(t.body, sample) +
      `\n\n---\nPreview shown using ${sample.email}. Each employee receives their own personalized version.`
  );

  setPreviewOpen(true);
}

  return (
    <div>
      {/* Bulk actions header */}
      <div
        style={{
          padding: 14,
          borderBottom: "1px solid #e5e7eb",
          background: "#ffffff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontWeight: 900 }}>Employees</div>
          <div style={{ ...subtleText, fontSize: 13 }}>{eligibleActiveEmployees.length} eligible + active</div>
        </div>

        {/* Bulk template selector */}
        <select
          value={bulkTemplateId}
          onChange={(e) => setBulkTemplateId(e.target.value)}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            background: "#ffffff",
            fontWeight: 800,
            fontSize: 13,
            color: "#111827",
            maxWidth: 280,
          }}
          title="Choose which template to send"
        >
          {(templates ?? []).length === 0 ? (
            <option value="">No templates</option>
          ) : (
            (templates ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))
          )}
        </select>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={openPreviewForBulk}
            disabled={!bulkTemplateId || eligibleActiveEmployees.length === 0}
            style={{
              ...buttonStyle,
              fontWeight: 900,
              opacity: !bulkTemplateId || eligibleActiveEmployees.length === 0 ? 0.55 : 1,
              cursor: !bulkTemplateId || eligibleActiveEmployees.length === 0 ? "not-allowed" : "pointer",
              padding: "10px 14px",
            }}
            title={!bulkTemplateId ? "Select a template first" : "Preview bulk email"}
          >
            Preview bulk
          </button>

          <button
            onClick={() => setBulkOpen(true)}
            disabled={!bulkTemplateId || eligibleActiveEmployees.length === 0}
            style={{
              ...buttonPrimaryStyle,
              opacity: !bulkTemplateId || eligibleActiveEmployees.length === 0 ? 0.55 : 1,
              cursor: !bulkTemplateId || eligibleActiveEmployees.length === 0 ? "not-allowed" : "pointer",
              padding: "10px 14px",
            }}
            title={!bulkTemplateId ? "Select a template first" : "Send to all eligible active employees"}
          >
            Send notices (bulk)
          </button>
        </div>
      </div>

            {/* Table */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f9fafb" }}>
            <th style={th}>Name</th>
            <th style={th}>Email</th>
            <th style={th}>Status</th>
            <th style={th}>Notice link</th>
            <th style={th}>Activity</th>
            <th style={th}>Enrollment</th>
          </tr>
        </thead>

        <tbody>
  {(employees ?? []).map((e, idx) => {
    const name =
      `${e.first_name ?? ""} ${e.last_name ?? ""}`.trim() || "(No name)";

    const optedOut = !!e.opted_out_at;
    const activity = eventsByEmployee.get(e.id) ?? [];
    const status = getLifecycleStatus(e, activity);

    const link = `${baseUrl}/notice/${e.token}?admin=1`;
    const isOpen = openId === e.id;

    const lastSentAt = getLastEnrollmentNoticeSentAt(e.id);
    const isSending = sendingId === e.id;

    const eligible = e.eligible !== false;
    const canSend = !!e.email && !!e.token && eligible && !optedOut && !isSending;

    const rowTemplateId = getRowTemplateId(e.id);

            return (
              <React.Fragment key={e.id}>
                <tr
                  style={{
                    borderTop: "1px solid #e5e7eb",
                    background: idx % 2 === 0 ? "#ffffff" : "#fcfcfd",
                  }}
                >
                  <td style={tdStrong}>{name}</td>
                  <td style={td}>{e.email}</td>

                  <td style={{ padding: "14px 16px" }}>
                    <StatusPill status={status} />
                  </td>

                  {/* Notice link */}
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <CopyButton text={link} />
                      <a href={link} target="_blank" rel="noreferrer" style={{ ...subtleText, fontWeight: 900 }}>
                        Open →
                      </a>
                    </div>
                  </td>

                  {/* Activity */}
                  <td style={{ padding: "14px 16px" }}>
                    <button
                      onClick={() => toggle(e.id)}
                      style={{
                        background: "#f9fafb",
                        border: "1px solid #e5e7eb",
                        borderRadius: 999,
                        padding: "6px 10px",
                        fontWeight: 900,
                        fontSize: 12,
                        cursor: "pointer",
                        color: "#111827",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                      title="View activity"
                    >
                      Details
                      <span
                        style={{
                          display: "inline-block",
                          transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                          transition: "transform 150ms ease",
                          fontSize: 14,
                          lineHeight: 1,
                          opacity: 0.9,
                        }}
                      >
                        ▸
                      </span>
                    </button>
                  </td>

                  {/* Enrollment */}
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <select
                        value={rowTemplateId}
                        onChange={(ev) => setRowTemplateIds((prev) => ({ ...prev, [e.id]: ev.target.value }))}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 12,
                          border: "1px solid #e5e7eb",
                          background: "#ffffff",
                          fontWeight: 800,
                          fontSize: 13,
                          color: "#111827",
                        }}
                        title="Choose template for this employee"
                      >
                        {(templates ?? []).length === 0 ? (
                          <option value="">No templates</option>
                        ) : (
                          (templates ?? []).map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))
                        )}
                      </select>

                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <button
                          onClick={() => openPreviewForOne(e, rowTemplateId)}
                          disabled={!canSend || !rowTemplateId}
                          style={{
                            ...buttonStyle,
                            fontWeight: 900,
                            opacity: canSend && rowTemplateId ? 1 : 0.55,
                            cursor: canSend && rowTemplateId ? "pointer" : "not-allowed",
                          }}
                          title={
                            !rowTemplateId
                              ? "Select a template first"
                              : optedOut
                              ? "Employee opted out"
                              : !eligible
                              ? "Employee marked ineligible"
                              : undefined
                          }
                        >
                          Preview
                        </button>

                        <button
                          onClick={() => sendEnrollmentNotice(e.id, rowTemplateId)}
                          disabled={!canSend || !rowTemplateId}
                          style={{
                            ...buttonPrimaryStyle,
                            fontWeight: 900,
                            opacity: canSend && rowTemplateId ? 1 : 0.55,
                            cursor: canSend && rowTemplateId ? "pointer" : "not-allowed",
                          }}
                          title={
                            !rowTemplateId
                              ? "Select a template first"
                              : optedOut
                              ? "Employee opted out"
                              : !eligible
                              ? "Employee marked ineligible"
                              : undefined
                          }
                        >
                          {isSending ? "Sending…" : "Send notice"}
                        </button>
                      </div>

                      <div style={{ ...subtleText, fontSize: 12 }}>
                        Last sent: <strong style={{ color: "#111827" }}>{fmtShort(lastSentAt)}</strong>
                      </div>
                    </div>
                  </td>
                </tr>

                {isOpen && (
                  <tr>
                    <td colSpan={6} style={{ padding: 16, background: "#f9fafb", borderTop: "1px solid #e5e7eb" }}>
                      <div
                        style={{
                          background: "#ffffff",
                          border: "1px solid #e5e7eb",
                          borderRadius: 12,
                          padding: 14,
                        }}
                      >

                       <div
  style={{
    marginBottom: 12,
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 14,
  }}
>
  <div style={{ fontWeight: 900, marginBottom: 10 }}>Notice Activity</div>

  <div style={{ display: "grid", rowGap: 8, fontSize: 13 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <div style={subtleText}>Notice sent</div>
      <div style={{ fontWeight: 900, color: "#111827" }}>{fmtShort(e.notice_sent_at ?? null)}</div>
    </div>

    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <div style={subtleText}>Notice opened</div>
      <div style={{ fontWeight: 900, color: "#111827" }}>{fmtShort(e.notice_viewed_at ?? null)}</div>
    </div>

    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <div style={subtleText}>Learn more opened</div>
      <div style={{ fontWeight: 900, color: "#111827" }}>{fmtShort(e.learn_more_viewed_at ?? null)}</div>
    </div>

    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <div style={subtleText}>Terms expanded</div>
      <div style={{ fontWeight: 900, color: "#111827" }}>{fmtShort(e.terms_viewed_at ?? null)}</div>
    </div>

    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <div style={subtleText}>Insurance selected</div>
      <div style={{ fontWeight: 900, color: "#111827" }}>
        {e.insurance_selection ? e.insurance_selection.toUpperCase() : "—"}
        {e.insurance_selected_at ? ` • ${fmtShort(e.insurance_selected_at)}` : ""}
      </div>
    </div>

    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <div style={subtleText}>Acknowledged closed</div>
      <div style={{ fontWeight: 900, color: "#111827" }}>{fmtShort(e.confirm_closed_at ?? null)}</div>
    </div>

    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <div style={subtleText}>Opted out</div>
      <div style={{ fontWeight: 900, color: "#111827" }}>{fmtShort(e.opted_out_at ?? null)}</div>
    </div>
  </div>
</div>

                        <div style={{ fontWeight: 900, marginBottom: 8 }}>Activity</div>

                        {activity.length === 0 && !e.opted_out_at ? (
                          <div style={{ ...subtleText }}>No activity yet.</div>
                        ) : (
                          <ul style={{ margin: 0, paddingLeft: 18 }}>
                            {activity.map((ev) => (
                              <li key={ev.id} style={{ marginBottom: 6 }}>
                                <strong>{labelEvent(ev.event_type)}</strong> — {fmtDateTime(ev.created_at)}
                              </li>
                            ))}

                            {e.opted_out_at && !activity.some((x) => x.event_type === "opt_out") && (
                              <li>
                                <strong>Opted out</strong> — {fmtDateTime(e.opted_out_at)}
                              </li>
                            )}
                          </ul>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}

          {(employees ?? []).length === 0 && (
            <tr>
              <td colSpan={6} style={{ padding: 16, ...subtleText }}>
                No employees yet. Click <strong style={{ color: "#111827" }}>Upload CSV</strong> to add employees.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Toast */}
      {toast && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 12,
            background: toast.toLowerCase().includes("complete") || toast.toLowerCase().includes("sent") ? "#ecfdf5" : "#fef2f2",
            border: toast.toLowerCase().includes("complete") || toast.toLowerCase().includes("sent") ? "1px solid #a7f3d0" : "1px solid #fecaca",
            color: toast.toLowerCase().includes("complete") || toast.toLowerCase().includes("sent") ? "#065f46" : "#991b1b",
            fontWeight: 800,
          }}
        >
          {toast}
        </div>
      )}

      {/* Bulk confirm modal */}
      <Modal
        open={bulkOpen}
        title="Send notices to all eligible employees?"
        onClose={() => (bulkBusy ? null : setBulkOpen(false))}
      >
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ ...subtleText, lineHeight: 1.6 }}>
            This will send the enrollment notice email to{" "}
            <strong style={{ color: "#111827" }}>{eligibleActiveEmployees.length}</strong> employee(s) for{" "}
            <strong style={{ color: "#111827" }}>{employerName}</strong>.
          </div>

          <div style={{ ...subtleText, fontSize: 13 }}>
            Only employees who are <strong style={{ color: "#111827" }}>eligible</strong>, not opted out, and have an email + token will be included.
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
            <button
              onClick={() => setBulkOpen(false)}
              disabled={bulkBusy}
              style={{
                ...buttonStyle,
                opacity: bulkBusy ? 0.6 : 1,
                cursor: bulkBusy ? "not-allowed" : "pointer",
              }}
            >
              Cancel
            </button>

            <button
              onClick={() => sendBulkEnrollmentNotices(eligibleActiveEmployees.map((e) => e.id))}
              disabled={bulkBusy || eligibleActiveEmployees.length === 0 || !bulkTemplateId}
              style={{
                ...buttonPrimaryStyle,
                opacity: bulkBusy || eligibleActiveEmployees.length === 0 || !bulkTemplateId ? 0.6 : 1,
               
                cursor: bulkBusy || eligibleActiveEmployees.length === 0 ? "not-allowed" : "pointer",
              }}
            >
              {bulkBusy ? "Sending…" : "Send now"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Preview modal */}
<Modal
  open={previewOpen}
  title={previewTitle}
  onClose={() => setPreviewOpen(false)}
>
  <div style={{ display: "grid", gap: 12 }}>
    <div>
      <div style={{ ...subtleText, fontSize: 12, marginBottom: 6 }}>To</div>
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 12,
          background: "#f9fafb",
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

    <div>
      <div style={{ ...subtleText, fontSize: 12, marginBottom: 6 }}>Subject</div>
      <input
        value={previewSubject}
        onChange={(e) => setPreviewSubject(e.target.value)}
        style={{
          width: "100%",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 12,
          background: "#ffffff",
          fontWeight: 900,
          color: "#111827",
          fontSize: 13,
        }}
      />
    </div>

    <div>
      <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 6,
    }}
  >
    <div style={{ ...subtleText, fontSize: 12 }}>Body</div>

    <button
      type="button"
      onClick={() => setPreviewEditMode((v) => !v)}
      style={{
        border: "1px solid #e5e7eb",
        background: "#ffffff",
        borderRadius: 999,
        padding: "6px 10px",
        fontWeight: 900,
        fontSize: 12,
        cursor: "pointer",
        color: "#111827",
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
      border: "1px solid #e2e8f0",
      borderRadius: 14,
      padding: 20,
      fontSize: 14,
      lineHeight: 1.7,
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
      border: "1px solid #e2e8f0",
      borderRadius: 14,
      padding: 20,
      background: "#ffffff",
      color: "#111827",
      fontSize: 14,
      lineHeight: 1.7,
      fontFamily:
        "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto",
      whiteSpace: "pre-wrap",
      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    }}
  >
    {previewBody || "—"}
  </div>
)}
</div>

    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
      <button onClick={() => setPreviewOpen(false)} style={buttonStyle}>
        Close
      </button>

      <button
        onClick={async () => {
          if (!previewTemplateId) {
            setToast("Select a template first.");
            return;
          }

          await sendBulkEnrollmentNotices(previewEmployeeIds, previewTemplateId, {
            subject: previewSubject,
            body: previewBody,
          });

          setPreviewOpen(false);
        }}
        disabled={bulkBusy || previewEmployeeIds.length === 0}
        style={{
          ...buttonPrimaryStyle,
          fontWeight: 900,
          opacity: bulkBusy || previewEmployeeIds.length === 0 ? 0.6 : 1,
          cursor: bulkBusy || previewEmployeeIds.length === 0 ? "not-allowed" : "pointer",
        }}
      >
        {bulkBusy ? "Sending…" : "Send now"}
      </button>
    </div>

    <div style={{ ...subtleText, fontSize: 12, lineHeight: 1.5 }}>
      Tip: You can edit the subject/body above. This preview content will be sent as-is.
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

const td: React.CSSProperties = {
  padding: "14px 16px",
  color: "#111827",
};

const tdStrong: React.CSSProperties = {
  ...td,
  fontWeight: 700,
};

function formatWhen(ts: string | null | undefined) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

function NoticeActivitySummary({
  noticeSentAt,
  noticeViewedAt,
  learnMoreViewedAt,
  termsViewedAt,
  insuranceSelectedAt,
  confirmClosedAt,
  optedOutAt,
}: {
  noticeSentAt?: string | null;
  noticeViewedAt?: string | null;
  learnMoreViewedAt?: string | null;
  termsViewedAt?: string | null;
  insuranceSelectedAt?: string | null;
  confirmClosedAt?: string | null;
  optedOutAt?: string | null;
}) {
  const rows: Array<{ label: string; value: string | null | undefined }> = [
    { label: "Notice sent", value: noticeSentAt },
    { label: "Notice opened", value: noticeViewedAt },
    { label: "Learn more opened", value: learnMoreViewedAt },
    { label: "Terms expanded", value: termsViewedAt },
    { label: "Insurance selected", value: insuranceSelectedAt },
    { label: "Acknowledged closed", value: confirmClosedAt },
    { label: "Opted out", value: optedOutAt },
  ];

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        padding: 16,
        background: "#ffffff",
      }}
    >
      <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 10, color: "#111827" }}>
        Notice Activity
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {rows.map((r) => (
          <div
            key={r.label}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              alignItems: "center",
              gap: 12,
              padding: "2px 0",
            }}
          >
            <div style={{ color: "#6b7280", fontWeight: 700 }}>{r.label}</div>
            <div style={{ color: "#111827", fontWeight: 900, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
              {formatWhen(r.value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}