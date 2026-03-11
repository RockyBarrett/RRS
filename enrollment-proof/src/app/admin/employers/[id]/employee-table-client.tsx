"use client";

import React, { useEffect, useMemo, useState } from "react";
import CopyButton from "./copy-button";
import { subtleText, buttonStyle, buttonPrimaryStyle } from "@/app/admin/_ui";
import { useRouter } from "next/navigation";

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
  body_html?: string | null;
};

type StatusType = "new" | "sent" | "opened" | "confirmed" | "opted_out";
type SortKey = "status" | "name" | "email" | "last_sent" | "last_opened";
type SendGroup = "all" | "unopened" | "opened_no_decision" | "opted_out" | "confirmed_opted_in";

type SmartSendSettings = {
  initialTemplateId: string;
  secondDelayHours: number;
  secondUnopenedTemplateId: string;
  secondOpenedNoDecisionTemplateId: string;
  thirdDelayHours: number;
  thirdUnopenedTemplateId: string;
  thirdOpenedNoDecisionTemplateId: string;
};

function StatusPill({ status }: { status: StatusType }) {
  const cfg: Record<
    StatusType,
    { label: string; bg: string; border: string; text: string }
  > = {
    new: { label: "New", bg: "#f9fafb", border: "#e5e7eb", text: "#374151" },
    sent: { label: "Sent", bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
    opened: { label: "Opened", bg: "#dbeafe", border: "#93c5fd", text: "#1d4ed8" },
    confirmed: { label: "Confirmed", bg: "#ecfdf5", border: "#a7f3d0", text: "#065f46" },
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

function fmtShort(d?: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return String(d);
  }
}

function fmtSmartStatusTime(ts: string | null | undefined) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

function addHours(ts: string | null | undefined, hours: number) {
  if (!ts) return null;
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

function latestEventAt(activity: EventRow[], type: string): string | null {
  const hit = (activity ?? []).find((x) => x.event_type === type);
  return hit?.created_at ?? null;
}

function getLifecycleStatus(e: Employee, activity: EventRow[]): StatusType {
  const isCurrentlyOptedOut = !!e.opted_out_at;

  const lastOptOut = latestEventAt(activity, "opt_out");
  const lastOptIn = latestEventAt(activity, "opt_in");
  const eventSaysOptedOut =
    !!lastOptOut && (!lastOptIn || new Date(lastOptOut).getTime() > new Date(lastOptIn).getTime());

  const optedOutFinal = isCurrentlyOptedOut || (!isCurrentlyOptedOut && eventSaysOptedOut);
  if (optedOutFinal) return "opted_out";

  if (
    e.confirm_closed_at ||
    !!latestEventAt(activity, "confirm_closed") ||
    !!latestEventAt(activity, "confirm_close") ||
    !!latestEventAt(activity, "acknowledged_closed")
  ) {
    return "confirmed";
  }

  if (e.notice_viewed_at || !!latestEventAt(activity, "page_view")) {
    return "opened";
  }

  if (e.notice_sent_at || !!latestEventAt(activity, "enrollment_notice_sent")) {
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
  React.useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

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
        onWheelCapture={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 820,
          maxHeight: "85vh",
          background: "#fff",
          borderRadius: 18,
          border: "1px solid #e5e7eb",
          boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
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
            flexShrink: 0,
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

        <div
          style={{
            padding: 16,
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
          }}
          onWheelCapture={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export default function EmployeeTableClient({
  employerId,
  employerName = "Employer",
  supportEmail = "support@company.com",
  effectiveDate = "",
  optOutDeadline = "",
  employees,
  events,
  baseUrl,
  templates,
  smartSendEnabled = false,
  smartSendStartedAt = "",
}: {
  employerId: string;
  employerName?: string;
  supportEmail?: string;
  effectiveDate?: string;
  optOutDeadline?: string;
  employees: Employee[];
  events: EventRow[];
  baseUrl: string;
  templates: TemplateRow[];
  smartSendEnabled?: boolean;
  smartSendStartedAt?: string;
}) {
  const router = useRouter();

  const [openId, setOpenId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const defaultTemplateId = (templates ?? [])[0]?.id ?? "";
  const [bulkTemplateId, setBulkTemplateId] = useState<string>(defaultTemplateId);
  const [rowTemplateIds, setRowTemplateIds] = useState<Record<string, string>>({});

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState("Email Preview");
  const [previewTo, setPreviewTo] = useState<string[]>([]);
  const [previewEmployeeIds, setPreviewEmployeeIds] = useState<string[]>([]);
  const [previewTemplateId, setPreviewTemplateId] = useState<string>("");
  const [previewSubject, setPreviewSubject] = useState("");
  const [previewBody, setPreviewBody] = useState("");
  const [previewEditMode, setPreviewEditMode] = useState(false);
  const [previewBodyHtml, setPreviewBodyHtml] = useState<string>("");

  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [groupOpen, setGroupOpen] = useState(false);
  const [groupBusy, setGroupBusy] = useState(false);
  const [groupChoice, setGroupChoice] = useState<SendGroup>("unopened");

  const [smartSendOpen, setSmartSendOpen] = useState(false);
  const [smartSendBusy, setSmartSendBusy] = useState(false);

  useEffect(() => {
    if (!bulkTemplateId && (templates ?? []).length > 0) {
      setBulkTemplateId((templates ?? [])[0].id);
    }
  }, [templates, bulkTemplateId]);

  const smartSendDefaults = useMemo(() => {
    const initialTemplateDefault =
      (templates ?? []).find((t) => t.name.toLowerCase().includes("1st")) ??
      (templates ?? [])[0] ??
      null;

    const reviewTemplateDefault =
      (templates ?? []).find((t) => t.name.toLowerCase().includes("please review")) ??
      (templates ?? [])[0] ??
      null;

    const secondNoticeDefault =
      (templates ?? []).find((t) => t.name.toLowerCase().includes("2nd")) ??
      (templates ?? [])[0] ??
      null;

    const finalReminderDefault =
      (templates ?? []).find((t) => t.name.toLowerCase().includes("final reminder")) ??
      (templates ?? [])[0] ??
      null;

    const finalNoticeDefault =
      (templates ?? []).find((t) => t.name.toLowerCase().includes("final notice")) ??
      finalReminderDefault ??
      (templates ?? [])[0] ??
      null;

    return {
      initialTemplateId: initialTemplateDefault?.id ?? "",
      secondDelayHours: 48,
      secondUnopenedTemplateId: reviewTemplateDefault?.id ?? "",
      secondOpenedNoDecisionTemplateId: secondNoticeDefault?.id ?? "",
      thirdDelayHours: 72,
      thirdUnopenedTemplateId: finalReminderDefault?.id ?? "",
      thirdOpenedNoDecisionTemplateId: finalNoticeDefault?.id ?? "",
    };
  }, [templates]);

  const [smartSendSettings, setSmartSendSettings] =
    useState<SmartSendSettings>(smartSendDefaults);

  useEffect(() => {
    if (!(templates ?? []).length) return;

    setSmartSendSettings((prev) => ({
      initialTemplateId: prev.initialTemplateId || smartSendDefaults.initialTemplateId,
      secondDelayHours: prev.secondDelayHours || 48,
      secondUnopenedTemplateId:
        prev.secondUnopenedTemplateId || smartSendDefaults.secondUnopenedTemplateId,
      secondOpenedNoDecisionTemplateId:
        prev.secondOpenedNoDecisionTemplateId ||
        smartSendDefaults.secondOpenedNoDecisionTemplateId,
      thirdDelayHours: prev.thirdDelayHours || 72,
      thirdUnopenedTemplateId:
        prev.thirdUnopenedTemplateId || smartSendDefaults.thirdUnopenedTemplateId,
      thirdOpenedNoDecisionTemplateId:
        prev.thirdOpenedNoDecisionTemplateId ||
        smartSendDefaults.thirdOpenedNoDecisionTemplateId,
    }));
  }, [templates, smartSendDefaults]);

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

  function toggle(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  function getLastEnrollmentNoticeSentAt(employeeId: string): string | null {
    const arr = eventsByEmployee.get(employeeId) ?? [];
    const ev = arr.find((x) => x.event_type === "enrollment_notice_sent");
    return ev?.created_at ?? null;
  }

  function statusRank(s: StatusType) {
    if (s === "confirmed") return 0;
    if (s === "opened") return 1;
    if (s === "sent") return 2;
    if (s === "new") return 3;
    return 4;
  }

  function safeLower(v: string | null | undefined) {
    return String(v || "").trim().toLowerCase();
  }

  function tsToMs(ts: string | null | undefined) {
    if (!ts) return 0;
    const t = new Date(ts).getTime();
    return Number.isNaN(t) ? 0 : t;
  }

  const sortedEmployees = useMemo(() => {
    const arr = [...(employees ?? [])];

    arr.sort((a, b) => {
      const aActivity = eventsByEmployee.get(a.id) ?? [];
      const bActivity = eventsByEmployee.get(b.id) ?? [];

      const aStatus = getLifecycleStatus(a, aActivity);
      const bStatus = getLifecycleStatus(b, bActivity);

      let cmp = 0;

      if (sortKey === "status") {
        cmp = statusRank(aStatus) - statusRank(bStatus);
        if (cmp === 0) cmp = safeLower(a.email).localeCompare(safeLower(b.email));
      } else if (sortKey === "name") {
        const aName = safeLower(`${a.first_name ?? ""} ${a.last_name ?? ""}`.trim());
        const bName = safeLower(`${b.first_name ?? ""} ${b.last_name ?? ""}`.trim());
        cmp = aName.localeCompare(bName);
        if (cmp === 0) cmp = safeLower(a.email).localeCompare(safeLower(b.email));
      } else if (sortKey === "email") {
        cmp = safeLower(a.email).localeCompare(safeLower(b.email));
      } else if (sortKey === "last_sent") {
        const aSent = tsToMs(getLastEnrollmentNoticeSentAt(a.id) || a.notice_sent_at || null);
        const bSent = tsToMs(getLastEnrollmentNoticeSentAt(b.id) || b.notice_sent_at || null);
        cmp = aSent - bSent;
        if (cmp === 0) cmp = safeLower(a.email).localeCompare(safeLower(b.email));
      } else if (sortKey === "last_opened") {
        const aOpen = tsToMs(a.notice_viewed_at || latestEventAt(aActivity, "page_view"));
        const bOpen = tsToMs(b.notice_viewed_at || latestEventAt(bActivity, "page_view"));
        cmp = aOpen - bOpen;
        if (cmp === 0) cmp = safeLower(a.email).localeCompare(safeLower(b.email));
      }

      return sortDir === "asc" ? cmp : -cmp;
    });

    return arr;
  }, [employees, eventsByEmployee, sortKey, sortDir]);

  const eligibleActiveEmployees = useMemo(() => {
    return (employees ?? []).filter((e) => {
      const eligible = e.eligible !== false;
      const active = !e.opted_out_at;
      const hasBasics = !!e.email && !!e.token;
      return eligible && active && hasBasics;
    });
  }, [employees]);

  const initialNoticeAlreadySent = useMemo(() => {
    return (employees ?? []).some((e) => !!e.notice_sent_at);
  }, [employees]);

  const initialNoticeSentCount = useMemo(() => {
  return (employees ?? []).filter((e) => {
    const activity = eventsByEmployee.get(e.id) ?? [];
    return !!e.notice_sent_at || !!latestEventAt(activity, "enrollment_notice_sent");
  }).length;
}, [employees, eventsByEmployee]);

const smartSendInitialQueued = useMemo(() => {
  return (employees ?? []).filter((e) => {
    const eligible = e.eligible !== false;
    const hasBasics = !!e.email && !!e.token;
    const completed = !!e.confirm_closed_at;
    const activity = eventsByEmployee.get(e.id) ?? [];
    const hasBeenSent =
      !!e.notice_sent_at || !!latestEventAt(activity, "enrollment_notice_sent");

    return eligible && hasBasics && !hasBeenSent && !completed;
  }).length;
}, [employees, eventsByEmployee]);

const smartSendUnopenedQueued = useMemo(() => {
  return (employees ?? []).filter((e) => {
    const eligible = e.eligible !== false;
    const hasBasics = !!e.email && !!e.token;
    const completed = !!e.confirm_closed_at;
    const activity = eventsByEmployee.get(e.id) ?? [];

    const hasBeenSent =
      !!e.notice_sent_at || !!latestEventAt(activity, "enrollment_notice_sent");

    const hasBeenViewed =
      !!e.notice_viewed_at || !!latestEventAt(activity, "page_view");

    return eligible && hasBasics && hasBeenSent && !hasBeenViewed && !completed;
  }).length;
}, [employees, eventsByEmployee]);

const smartSendOpenedNoDecisionQueued = useMemo(() => {
  return (employees ?? []).filter((e: any) => {
    const eligible = e.eligible !== false;
    const hasBasics = !!e.email && !!e.token;
    const completed = !!e.confirm_closed_at;
    const activity = eventsByEmployee.get(e.id) ?? [];

    const hasBeenViewed =
      !!e.notice_viewed_at || !!latestEventAt(activity, "page_view");

    return eligible && hasBasics && hasBeenViewed && !completed && !e.election;
  }).length;
}, [employees, eventsByEmployee]);

const smartSendSecondScheduledAt = useMemo(() => {
  if (!smartSendStartedAt) return null;
  return addHours(smartSendStartedAt, smartSendSettings.secondDelayHours);
}, [smartSendStartedAt, smartSendSettings.secondDelayHours]);

const smartSendThirdScheduledAt = useMemo(() => {
  if (!smartSendStartedAt) return null;
  const second = addHours(smartSendStartedAt, smartSendSettings.secondDelayHours);
  return addHours(second, smartSendSettings.thirdDelayHours);
}, [smartSendStartedAt, smartSendSettings.secondDelayHours, smartSendSettings.thirdDelayHours]);

const smartSendInitialSentAt = useMemo(() => {
  const sentTimes = (employees ?? [])
    .map((e) => {
      const activity = eventsByEmployee.get(e.id) ?? [];
      return (
        e.notice_sent_at ||
        latestEventAt(activity, "smart_send_initial_sent") ||
        latestEventAt(activity, "enrollment_notice_sent") ||
        null
      );
    })
    .filter(Boolean) as string[];

  if (!sentTimes.length) return null;
  sentTimes.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  return sentTimes[0];
}, [employees, eventsByEmployee]);

const smartSendUnopenedSentAt = useMemo(() => {
  const sentTimes = (employees ?? [])
    .map((e) => {
      const activity = eventsByEmployee.get(e.id) ?? [];
      return latestEventAt(activity, "smart_send_second_unopened_sent");
    })
    .filter(Boolean) as string[];

  if (!sentTimes.length) return null;
  sentTimes.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  return sentTimes[0];
}, [employees, eventsByEmployee]);

const smartSendOpenedNoDecisionSentAt = useMemo(() => {
  const sentTimes = (employees ?? [])
    .map((e) => {
      const activity = eventsByEmployee.get(e.id) ?? [];
      return latestEventAt(activity, "smart_send_second_opened_sent");
    })
    .filter(Boolean) as string[];

  if (!sentTimes.length) return null;
  sentTimes.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  return sentTimes[0];
}, [employees, eventsByEmployee]);

const smartSendUnopenedNextAt = useMemo(() => {
  const candidates = (employees ?? [])
    .map((e) => {
      const eligible = e.eligible !== false;
      const hasBasics = !!e.email && !!e.token;
      const completed = !!e.confirm_closed_at;
      if (!eligible || !hasBasics || completed) return null;

      const activity = eventsByEmployee.get(e.id) ?? [];
      const hasBeenSent =
        !!e.notice_sent_at || !!latestEventAt(activity, "enrollment_notice_sent");
      const hasBeenViewed =
        !!e.notice_viewed_at || !!latestEventAt(activity, "page_view");
      const alreadySentSecond = !!latestEventAt(activity, "smart_send_second_unopened_sent");

      if (!hasBeenSent || hasBeenViewed || alreadySentSecond) return null;

      const sourceTs =
        e.notice_sent_at || latestEventAt(activity, "enrollment_notice_sent") || null;

      return addHours(sourceTs, smartSendSettings.secondDelayHours);
    })
    .filter(Boolean) as string[];

  if (!candidates.length) return null;
  candidates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  return candidates[0];
}, [employees, eventsByEmployee, smartSendSettings.secondDelayHours]);

const smartSendOpenedNoDecisionNextAt = useMemo(() => {
  const candidates = (employees ?? [])
    .map((e: any) => {
      const eligible = e.eligible !== false;
      const hasBasics = !!e.email && !!e.token;
      const completed = !!e.confirm_closed_at;
      if (!eligible || !hasBasics || completed || e.election) return null;

      const activity = eventsByEmployee.get(e.id) ?? [];
      const hasBeenViewed =
        !!e.notice_viewed_at || !!latestEventAt(activity, "page_view");
      const alreadySentSecond = !!latestEventAt(activity, "smart_send_second_opened_sent");

      if (!hasBeenViewed || alreadySentSecond) return null;

      const sourceTs =
        e.notice_viewed_at || latestEventAt(activity, "page_view") || null;

      return addHours(sourceTs, smartSendSettings.secondDelayHours);
    })
    .filter(Boolean) as string[];

  if (!candidates.length) return null;
  candidates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  return candidates[0];
}, [employees, eventsByEmployee, smartSendSettings.secondDelayHours]);

  function fmtSmartSendStarted(ts: string | null | undefined) {
    if (!ts) return "—";
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return String(ts);
    }
  }

  function groupLabel(g: SendGroup) {
    if (g === "all") return "All employees";
    if (g === "unopened") return "Unopened (sent, not opened)";
    if (g === "opened_no_decision") return "Opened, no decision";
    if (g === "opted_out") return "Opted out";
    return "Confirmed / Opted in";
  }

  function matchesGroup(status: StatusType, g: SendGroup) {
    if (g === "all") return true;
    if (g === "unopened") return status === "sent";
    if (g === "opened_no_decision") return status === "opened";
    if (g === "opted_out") return status === "opted_out";
    return status === "confirmed";
  }

  const groupStats = useMemo(() => {
    const result: Record<SendGroup, { count: number; ids: string[] }> = {
      all: { count: 0, ids: [] },
      unopened: { count: 0, ids: [] },
      opened_no_decision: { count: 0, ids: [] },
      opted_out: { count: 0, ids: [] },
      confirmed_opted_in: { count: 0, ids: [] },
    };

    for (const e of employees ?? []) {
      const activity = eventsByEmployee.get(e.id) ?? [];
      const status = getLifecycleStatus(e, activity);

      (Object.keys(result) as SendGroup[]).forEach((g) => {
        if (matchesGroup(status, g)) {
          result[g].count += 1;
          result[g].ids.push(e.id);
        }
      });
    }

    return result;
  }, [employees, eventsByEmployee]);

  async function sendByGroup(g: SendGroup) {
    if (!bulkTemplateId) {
      setToast("Select a template first.");
      return;
    }

    setGroupBusy(true);
    setToast(null);

    try {
      const res = await fetch(`/api/admin/employers/${employerId}/enrollment/send`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ template_id: bulkTemplateId, group: g }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Send failed");

      const attempted = Number(data?.attempted ?? groupStats[g].count);
      const sent = Number(data?.sent ?? 0);

      setToast(`${groupLabel(g)}: ${sent}/${attempted} sent.`);
      setGroupOpen(false);
      router.refresh();
    } catch (e: any) {
      setToast(e?.message || "Send failed.");
    } finally {
      setGroupBusy(false);
    }
  }

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

  function getTemplateById(id: string) {
    return (templates ?? []).find((t) => t.id === id) || null;
  }

  function noticeButtonHtml(href: string, label = "Review Notice") {
    const safeHref = String(href || "");
    const safeLabel = String(label || "Review Notice");

    return `
<div style="margin: 12px 0 18px 0;">
  <a href="${safeHref}"
     style="display:inline-block;padding:12px 22px;border-radius:12px;
            background:#355A7C;color:#ffffff;text-decoration:none;
            font-weight:800;font-size:14px;">
    ${safeLabel} →
  </a>
</div>`.trim();
  }

  function applyVars(template: string, e: Employee) {
    const first = (e.first_name ?? "").trim();
    const last = (e.last_name ?? "").trim();

    const noticeLink = `${baseUrl}/notice/${e.token}`;
    const learnMoreLink = `${baseUrl}/notice/${e.token}/learn-more`;

    const noticeButton = noticeButtonHtml(noticeLink, "Review Notice");

    return (template || "")
      .replaceAll("{{employee.first_name}}", first || "there")
      .replaceAll("{{employee.last_name}}", last)
      .replaceAll("{{employee.email}}", e.email)
      .replaceAll("{{employer.name}}", employerName)
      .replaceAll("{{employer.support_email}}", supportEmail)
      .replaceAll("{{program.effective_date}}", effectiveDate || "")
      .replaceAll("{{program.opt_out_deadline}}", optOutDeadline || "")
      .replaceAll("{{links.notice}}", noticeLink)
      .replaceAll("{{links.notice_url}}", noticeLink)
      .replaceAll("{{links.notice_button}}", noticeButton)
      .replaceAll("{{links.learn_more}}", learnMoreLink);
  }

  function openPreviewForOne(e: Employee, templateId: string) {
    const t = getTemplateById(templateId);
    if (!t) {
      setToast("Select a template first.");
      return;
    }

    setPreviewTitle(`Preview: ${t.name} → ${e.email}`);
    setPreviewTo([e.email]);
    setPreviewEmployeeIds([e.id]);
    setPreviewTemplateId(templateId);
    setPreviewSubject(applyVars(t.subject ?? "", e));
    setPreviewBody(applyVars(t.body ?? "", e));
    setPreviewBodyHtml(applyVars(String(t.body_html ?? ""), e));
    setPreviewOpen(true);
  }

  function openPreviewForGroup(g: SendGroup) {
    const ids = groupStats[g]?.ids ?? [];
    if (ids.length === 0) {
      setToast("No employees in this group.");
      return;
    }

    const t = getTemplateById(bulkTemplateId);
    if (!t) {
      setToast("Select a template first.");
      return;
    }

    const sample =
      (employees ?? []).find((x: Employee) => x.id === ids[0]) || (employees ?? [])[0];

    if (!sample) {
      setToast("No employees found.");
      return;
    }

    setPreviewTitle(`Preview: ${t.name} → ${groupLabel(g)} (${ids.length})`);
    setPreviewTo(
      (employees ?? [])
        .filter((x: Employee) => ids.includes(x.id))
        .map((x: Employee) => x.email)
    );
    setPreviewEmployeeIds(ids);
    setPreviewTemplateId(bulkTemplateId);
    setPreviewSubject(applyVars(t.subject ?? "", sample));

    const text =
      applyVars(t.body ?? "", sample) +
      `\n\n---\nPreview shown using ${sample.email}. Each employee receives their own personalized version.`;

    setPreviewBody(text);
    setPreviewBodyHtml(applyVars(String(t.body_html ?? ""), sample));
    setPreviewOpen(true);
  }

    return (
    <div>
      {smartSendEnabled && (
        <div
          style={{
            marginBottom: 14,
            border: "1px solid #dbeafe",
            background: "#f8fbff",
            borderRadius: 16,
            padding: 16,
            display: "grid",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontWeight: 900, color: "#111827", fontSize: 16 }}>
                Smart Send Active
              </div>
              <div style={{ ...subtleText, marginTop: 4, lineHeight: 1.5 }}>
                Flow is monitoring employee activity and will skip anyone who has already confirmed and closed.
              </div>
            </div>

            <button
              onClick={() => setSmartSendOpen(true)}
              style={{
                ...buttonStyle,
                fontWeight: 900,
                whiteSpace: "nowrap",
              }}
            >
              Edit Smart Send
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
            }}
          >
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                background: "#ffffff",
                padding: 12,
              }}
            >
              <div style={{ ...subtleText, fontSize: 12 }}>Started</div>
              <div style={{ marginTop: 4, fontWeight: 900, color: "#111827" }}>
                {fmtSmartSendStarted(smartSendStartedAt)}
              </div>
            </div>

            <div
  style={{
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    background: "#ffffff",
    padding: 12,
  }}
>
  <div style={{ ...subtleText, fontSize: 12 }}>Initial notice</div>
  <div style={{ marginTop: 4, fontWeight: 900, color: "#111827", fontSize: 22 }}>
    {smartSendInitialQueued > 0 ? smartSendInitialQueued : initialNoticeSentCount}
  </div>
  <div style={{ ...subtleText, fontSize: 12, marginTop: 6 }}>
    {smartSendInitialQueued > 0
      ? `Sending at: ${fmtSmartStatusTime(new Date().toISOString())}`
      : `Sent: ${fmtSmartStatusTime(smartSendInitialSentAt)}`}
  </div>
</div>

            <div
  style={{
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    background: "#ffffff",
    padding: 12,
  }}
>
  <div style={{ ...subtleText, fontSize: 12 }}>Unopened reminder</div>
  <div style={{ marginTop: 4, fontWeight: 900, color: "#111827", fontSize: 22 }}>
    {smartSendUnopenedQueued}
  </div>
  <div style={{ ...subtleText, fontSize: 12, marginTop: 6 }}>
    {smartSendUnopenedQueued > 0
  ? `Sending at: ${fmtSmartStatusTime(smartSendSecondScheduledAt)}`
  : `Sent: ${fmtSmartStatusTime(smartSendUnopenedSentAt)}`}
  </div>
</div>

            <div
  style={{
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    background: "#ffffff",
    padding: 12,
  }}
>
  <div style={{ ...subtleText, fontSize: 12 }}>Opened, no decision</div>
  <div style={{ marginTop: 4, fontWeight: 900, color: "#111827", fontSize: 22 }}>
    {smartSendOpenedNoDecisionQueued}
  </div>
  <div style={{ ...subtleText, fontSize: 12, marginTop: 6 }}>
    {smartSendOpenedNoDecisionQueued > 0
  ? `Sending at: ${fmtSmartStatusTime(smartSendSecondScheduledAt)}`
  : `Sent: ${fmtSmartStatusTime(smartSendOpenedNoDecisionSentAt)}`}
  </div>
</div>
          </div>
        </div>
      )}

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
          <div style={{ ...subtleText, fontSize: 13 }}>
            {eligibleActiveEmployees.length} eligible + active
          </div>
        </div>

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

        <select
          value={groupChoice}
          onChange={(e) => setGroupChoice(e.target.value as SendGroup)}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            background: "#ffffff",
            fontWeight: 900,
            fontSize: 13,
            color: "#111827",
            maxWidth: 220,
          }}
          title="Choose a status group"
        >
          <option value="all">All employees</option>
          <option value="unopened">Unopened</option>
          <option value="opened_no_decision">Opened, no decision</option>
          <option value="opted_out">Opted out</option>
          <option value="confirmed_opted_in">Confirmed / Opted in</option>
        </select>

        <button
          onClick={() => {
            const ids = groupStats[groupChoice]?.ids ?? [];
            if (ids.length === 0) {
              setToast("No employees in this group.");
              return;
            }
            openPreviewForGroup(groupChoice);
          }}
          disabled={!bulkTemplateId || (groupStats[groupChoice]?.count ?? 0) === 0}
          style={{
            ...buttonStyle,
            fontWeight: 900,
            opacity: !bulkTemplateId || (groupStats[groupChoice]?.count ?? 0) === 0 ? 0.55 : 1,
            cursor:
              !bulkTemplateId || (groupStats[groupChoice]?.count ?? 0) === 0
                ? "not-allowed"
                : "pointer",
            padding: "10px 14px",
          }}
        >
          Preview
        </button>

        <button
          onClick={() => setGroupOpen(true)}
          disabled={!bulkTemplateId || groupStats[groupChoice].count === 0}
          style={{
            ...buttonPrimaryStyle,
            opacity: !bulkTemplateId || groupStats[groupChoice].count === 0 ? 0.55 : 1,
            cursor:
              !bulkTemplateId || groupStats[groupChoice].count === 0 ? "not-allowed" : "pointer",
            padding: "10px 14px",
          }}
        >
          Send notices
        </button>

                <button
          onClick={() => setSmartSendOpen(true)}
          style={{
            ...buttonStyle,
            background: smartSendBusy ? "#e5e7eb" : "#8ce176ff",
            fontWeight: 900,
            padding: "10px 14px",
          }}
          title="Configure Smart Send"
        >
          Smart Send Scheduler
        </button>

        <div
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              background: "#ffffff",
              fontWeight: 900,
              fontSize: 13,
              color: "#111827",
              maxWidth: 220,
            }}
            title="Sort employees"
          >
            <option value="status">Sort by: Status</option>
            <option value="name">Sort by: Name</option>
            <option value="email">Sort by: Email</option>
            <option value="last_sent">Sort by: Last sent</option>
            <option value="last_opened">Sort by: Last opened</option>
          </select>

          <button
            type="button"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            style={{
              ...buttonStyle,
              fontWeight: 900,
              padding: "10px 12px",
            }}
            title={`Direction: ${sortDir.toUpperCase()}`}
          >
            {sortDir === "asc" ? "↑" : "↓"}
          </button>
        </div>
      </div>

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
          {(sortedEmployees ?? []).map((e, idx) => {
            const name = `${e.first_name ?? ""} ${e.last_name ?? ""}`.trim() || "(No name)";
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

                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <CopyButton text={link} />
                      <a
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        style={{ ...subtleText, fontWeight: 900 }}
                      >
                        Open →
                      </a>
                    </div>
                  </td>

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

                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <select
                        value={rowTemplateId}
                        onChange={(ev) =>
                          setRowTemplateIds((prev) => ({ ...prev, [e.id]: ev.target.value }))
                        }
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
                    <td
                      colSpan={6}
                      style={{
                        padding: 16,
                        background: "#f9fafb",
                        borderTop: "1px solid #e5e7eb",
                      }}
                    >
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
                              <div style={{ fontWeight: 900, color: "#111827" }}>
                                {fmtShort(e.notice_sent_at ?? null)}
                              </div>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                              <div style={subtleText}>Notice opened</div>
                              <div style={{ fontWeight: 900, color: "#111827" }}>
                                {fmtShort(e.notice_viewed_at ?? null)}
                              </div>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                              <div style={subtleText}>Learn more opened</div>
                              <div style={{ fontWeight: 900, color: "#111827" }}>
                                {fmtShort(e.learn_more_viewed_at ?? null)}
                              </div>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                              <div style={subtleText}>Terms expanded</div>
                              <div style={{ fontWeight: 900, color: "#111827" }}>
                                {fmtShort(e.terms_viewed_at ?? null)}
                              </div>
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
                              <div style={{ fontWeight: 900, color: "#111827" }}>
                                {fmtShort(e.confirm_closed_at ?? null)}
                              </div>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                              <div style={subtleText}>Opted out</div>
                              <div style={{ fontWeight: 900, color: "#111827" }}>
                                {fmtShort(e.opted_out_at ?? null)}
                              </div>
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

      {toast && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 12,
            background:
              toast.toLowerCase().includes("complete") || toast.toLowerCase().includes("sent")
                ? "#ecfdf5"
                : "#fef2f2",
            border:
              toast.toLowerCase().includes("complete") || toast.toLowerCase().includes("sent")
                ? "1px solid #a7f3d0"
                : "1px solid #fecaca",
            color:
              toast.toLowerCase().includes("complete") || toast.toLowerCase().includes("sent")
                ? "#065f46"
                : "#991b1b",
            fontWeight: 800,
          }}
        >
          {toast}
        </div>
      )}

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
            Only employees who are <strong style={{ color: "#111827" }}>eligible</strong>, not opted out,
            and have an email + token will be included.
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
                  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto",
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
                  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                }}
              >
                {previewBodyHtml && previewBodyHtml.trim().length ? (
                  <div
                    style={{ lineHeight: 1.7 }}
                    dangerouslySetInnerHTML={{ __html: previewBodyHtml }}
                  />
                ) : (
                  <div style={{ whiteSpace: "pre-wrap" }}>{previewBody || "—"}</div>
                )}
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

      <Modal
        open={groupOpen}
        title="Send by status group?"
        onClose={() => (groupBusy ? null : setGroupOpen(false))}
      >
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ ...subtleText, lineHeight: 1.6 }}>
            You’re about to send the selected template to{" "}
            <strong style={{ color: "#111827" }}>{groupStats[groupChoice].count}</strong> employee(s)
            in <strong style={{ color: "#111827" }}>{groupLabel(groupChoice)}</strong>.
          </div>

          <div style={{ ...subtleText, fontSize: 13 }}>
            Template:{" "}
            <strong style={{ color: "#111827" }}>
              {(templates ?? []).find((t) => t.id === bulkTemplateId)?.name ?? "Selected template"}
            </strong>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
            <button
              onClick={() => setGroupOpen(false)}
              disabled={groupBusy}
              style={{
                ...buttonStyle,
                opacity: groupBusy ? 0.6 : 1,
                cursor: groupBusy ? "not-allowed" : "pointer",
              }}
            >
              Cancel
            </button>

            <button
              onClick={() => sendByGroup(groupChoice)}
              disabled={groupBusy || groupStats[groupChoice].count === 0 || !bulkTemplateId}
              style={{
                ...buttonPrimaryStyle,
                opacity: groupBusy || groupStats[groupChoice].count === 0 || !bulkTemplateId ? 0.6 : 1,
                cursor: groupBusy || groupStats[groupChoice].count === 0 ? "not-allowed" : "pointer",
              }}
            >
              {groupBusy ? "Sending…" : "Send now"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={smartSendOpen}
        title="Smart Send"
        onClose={() => (smartSendBusy ? null : setSmartSendOpen(false))}
      >
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ ...subtleText, lineHeight: 1.65 }}>
            Automatically send the initial notice and follow-up reminders using the employer’s
            connected email. Flow stops sending once an employee confirms and closes.
          </div>

          <div
            style={{
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: 14,
              padding: 14,
            }}
          >
            <div style={{ fontWeight: 900, color: "#111827", marginBottom: 6 }}>
              Initial Notice
            </div>

            <div style={{ ...subtleText, fontSize: 13, marginBottom: 12 }}>
              {initialNoticeAlreadySent
                ? `Already sent to ${initialNoticeSentCount} employee(s). Smart Send will continue with reminders only.`
                : "Will send to all eligible employees who have not yet received the first notice."}
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <div>
                <div style={{ ...subtleText, fontSize: 12, marginBottom: 6 }}>Group</div>
                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    background: "#f9fafb",
                    fontWeight: 900,
                    color: "#111827",
                  }}
                >
                  All
                </div>
              </div>

              <div>
                <div style={{ ...subtleText, fontSize: 12, marginBottom: 6 }}>Template</div>
                <select
                  value={smartSendSettings.initialTemplateId}
                  onChange={(e) =>
                    setSmartSendSettings((prev) => ({
                      ...prev,
                      initialTemplateId: e.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    background: "#ffffff",
                    fontWeight: 800,
                    fontSize: 13,
                    color: "#111827",
                  }}
                >
                  {(templates ?? []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div
            style={{
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: 14,
              padding: 14,
            }}
          >
            <div style={{ fontWeight: 900, color: "#111827", marginBottom: 6 }}>
              First Reminder
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div style={{ ...subtleText, fontSize: 12, marginBottom: 6 }}>Delay (hours)</div>
                <input
                  type="number"
                  min={1}
                  value={smartSendSettings.secondDelayHours}
                  onChange={(e) =>
                    setSmartSendSettings((prev) => ({
                      ...prev,
                      secondDelayHours: Number(e.target.value || 48),
                    }))
                  }
                  style={{
                    width: 120,
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    background: "#ffffff",
                    fontWeight: 800,
                    fontSize: 13,
                    color: "#111827",
                  }}
                />
              </div>

              <div>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Unopened</div>
                <div style={{ ...subtleText, fontSize: 12, marginBottom: 6 }}>Group: Unopened</div>
                <select
                  value={smartSendSettings.secondUnopenedTemplateId}
                  onChange={(e) =>
                    setSmartSendSettings((prev) => ({
                      ...prev,
                      secondUnopenedTemplateId: e.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    background: "#ffffff",
                    fontWeight: 800,
                    fontSize: 13,
                    color: "#111827",
                  }}
                >
                  {(templates ?? []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Opened No Decision</div>
                <div style={{ ...subtleText, fontSize: 12, marginBottom: 6 }}>
                  Group: Opened, no decision
                </div>
                <select
                  value={smartSendSettings.secondOpenedNoDecisionTemplateId}
                  onChange={(e) =>
                    setSmartSendSettings((prev) => ({
                      ...prev,
                      secondOpenedNoDecisionTemplateId: e.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    background: "#ffffff",
                    fontWeight: 800,
                    fontSize: 13,
                    color: "#111827",
                  }}
                >
                  {(templates ?? []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div
            style={{
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: 14,
              padding: 14,
            }}
          >
            <div style={{ fontWeight: 900, color: "#111827", marginBottom: 6 }}>
              Final Reminder
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div style={{ ...subtleText, fontSize: 12, marginBottom: 6 }}>Delay (hours)</div>
                <input
                  type="number"
                  min={1}
                  value={smartSendSettings.thirdDelayHours}
                  onChange={(e) =>
                    setSmartSendSettings((prev) => ({
                      ...prev,
                      thirdDelayHours: Number(e.target.value || 72),
                    }))
                  }
                  style={{
                    width: 120,
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    background: "#ffffff",
                    fontWeight: 800,
                    fontSize: 13,
                    color: "#111827",
                  }}
                />
              </div>

              <div>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Unopened</div>
                <div style={{ ...subtleText, fontSize: 12, marginBottom: 6 }}>Group: Unopened</div>
                <select
                  value={smartSendSettings.thirdUnopenedTemplateId}
                  onChange={(e) =>
                    setSmartSendSettings((prev) => ({
                      ...prev,
                      thirdUnopenedTemplateId: e.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    background: "#ffffff",
                    fontWeight: 800,
                    fontSize: 13,
                    color: "#111827",
                  }}
                >
                  {(templates ?? []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Opened No Decision</div>
                <div style={{ ...subtleText, fontSize: 12, marginBottom: 6 }}>
                  Group: Opened, no decision
                </div>
                <select
                  value={smartSendSettings.thirdOpenedNoDecisionTemplateId}
                  onChange={(e) =>
                    setSmartSendSettings((prev) => ({
                      ...prev,
                      thirdOpenedNoDecisionTemplateId: e.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    background: "#ffffff",
                    fontWeight: 800,
                    fontSize: 13,
                    color: "#111827",
                  }}
                >
                  {(templates ?? []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div style={{ ...subtleText, fontSize: 12, lineHeight: 1.6 }}>
            Smart Send skips employees who have already confirmed and closed.
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => setSmartSendOpen(false)}
              disabled={smartSendBusy}
              style={buttonStyle}
            >
              Cancel
            </button>

            <button
  onClick={async () => {
    setSmartSendBusy(true);
    setToast(null);

    try {
      const res = await fetch(
        `/api/admin/employers/${employerId}/smart-send/start`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(smartSendSettings),
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Failed to start Smart Send");
      }

      setToast("Smart Send activated.");
      setSmartSendOpen(false);

      router.refresh();
    } catch (err: any) {
      setToast(err?.message || "Failed to start Smart Send.");
    } finally {
      setSmartSendBusy(false);
    }
  }}
  disabled={smartSendBusy}
  style={{
  ...buttonPrimaryStyle,
  background: smartSendBusy ? "#e5e7eb" : "#34bd12ff",
  fontWeight: 900,
}}
>
  {smartSendBusy ? "Starting..." : "Start Smart Send"}
</button>
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