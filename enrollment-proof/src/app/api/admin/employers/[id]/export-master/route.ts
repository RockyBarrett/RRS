import { supabaseServer } from "@/lib/supabaseServer";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

type ExportStatus = "New" | "Sent" | "Opened" | "Confirmed" | "Opted out";

function formatDate(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatDateTime(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
}

function dollarsFromCents(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "";
  return (value / 100).toFixed(2);
}

function latestEventAt(activity: any[], type: string): string | null {
  const hit = (activity ?? []).find((x) => x.event_type === type);
  return hit?.created_at ?? null;
}

function getLifecycleStatus(
  e: {
    opted_out_at?: string | null;
    confirm_closed_at?: string | null;
    notice_viewed_at?: string | null;
    notice_sent_at?: string | null;
  },
  activity: any[]
): ExportStatus {
  const isCurrentlyOptedOut = !!e.opted_out_at;

  const lastOptOut = latestEventAt(activity, "opt_out");
  const lastOptIn = latestEventAt(activity, "opt_in");
  const eventSaysOptedOut =
    !!lastOptOut &&
    (!lastOptIn || new Date(lastOptOut).getTime() > new Date(lastOptIn).getTime());

  const optedOutFinal = isCurrentlyOptedOut || (!isCurrentlyOptedOut && eventSaysOptedOut);
  if (optedOutFinal) return "Opted out";

  if (
    e.confirm_closed_at ||
    !!latestEventAt(activity, "confirm_closed") ||
    !!latestEventAt(activity, "confirm_close") ||
    !!latestEventAt(activity, "acknowledged_closed")
  ) {
    return "Confirmed";
  }

  if (e.notice_viewed_at || !!latestEventAt(activity, "page_view")) {
    return "Opened";
  }

  if (e.notice_sent_at || !!latestEventAt(activity, "enrollment_notice_sent")) {
    return "Sent";
  }

  return "New";
}

function firstTruthy(...values: Array<string | null | undefined>) {
  for (const v of values) {
    if (v) return v;
  }
  return null;
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id: employerId } = await ctx.params;
  const { searchParams } = new URL(req.url);

  const only = (searchParams.get("only") || "").trim().toLowerCase();
  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

  const { data: employer, error: employerErr } = await supabaseServer
    .from("employers")
    .select("id, name")
    .eq("id", employerId)
    .maybeSingle();

  if (employerErr || !employer) {
    return new Response("Employer not found", { status: 404 });
  }

  const { data: employeesRaw, error: empErr } = await supabaseServer
    .from("employees")
    .select(`
      first_name,
      last_name,
      monthly_savings_cents,
      annual_savings_cents,
      full_address,
      city,
      state,
      zip,
      email,
      phone,
      birth_date,
      hire_date,
      ssn_last4,
      has_health_insurance,
      insurance_source,
      token,
      opted_out_at,
      notice_sent_at,
      notice_viewed_at,
      confirm_closed_at,
      insurance_selected_at,
      learn_more_viewed_at,
      terms_viewed_at,
      events ( event_type, created_at )
    `)
    .eq("employer_id", employerId)
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (empErr) {
    return new Response(`Error loading employees: ${empErr.message}`, {
      status: 500,
    });
  }

  let rows = (employeesRaw ?? []).map((e: any) => {
    const activity = Array.isArray(e.events) ? e.events : [];

    const status = getLifecycleStatus(
      {
        opted_out_at: e.opted_out_at ?? null,
        confirm_closed_at: e.confirm_closed_at ?? null,
        notice_viewed_at: e.notice_viewed_at ?? null,
        notice_sent_at: e.notice_sent_at ?? null,
      },
      activity
    );

    const openedAt = firstTruthy(
      e.notice_viewed_at ?? null,
      latestEventAt(activity, "page_view")
    );

    const confirmedAt = firstTruthy(
      e.confirm_closed_at ?? null,
      latestEventAt(activity, "confirm_closed"),
      latestEventAt(activity, "confirm_close"),
      latestEventAt(activity, "acknowledged_closed")
    );

    const rawOptedOutAt = firstTruthy(
  e.opted_out_at ?? null,
  latestEventAt(activity, "opt_out")
);

const optedOutAt = status === "Opted out" ? rawOptedOutAt : null;

    const sentAt = firstTruthy(
      e.notice_sent_at ?? null,
      latestEventAt(activity, "enrollment_notice_sent")
    );

    const exportedHasInsurance =
  (e.has_health_insurance ?? "").trim() ||
  (status === "Confirmed" || status === "Opened" ? "YES" : "");

    const noticeLink = e.token ? `${baseUrl}/notice/${e.token}` : "";

    return {
      "First Name": e.first_name ?? "",
      "Last Name": e.last_name ?? "",
      "Monthly Savings": dollarsFromCents(e.monthly_savings_cents),
      "Annual Savings": dollarsFromCents(e.annual_savings_cents),
      "Street Address": e.full_address ?? "",
      "City": e.city ?? "",
      "State": e.state ?? "",
      "Zip": e.zip ?? "",
      "Email": e.email ?? "",
      "Phone": e.phone ?? "",
      "Birth Date": formatDate(e.birth_date ?? null),
      "Hire Date": formatDate(e.hire_date ?? null),
      "Last 4 SS#": e.ssn_last4 ?? "",
      "Have Any Health Ins. *    YES/NO": exportedHasInsurance,
      "* If Known - Through Company, Through Spouse, Medicare, Tricare, ACA, Other ": e.insurance_source ?? "",
      "Status": status,
      "Sent At": formatDateTime(sentAt),
      "Opened At": formatDateTime(openedAt),
      "Confirmed At": formatDateTime(confirmedAt),
      "Opted Out At": formatDateTime(optedOutAt),
      "Notice Link": noticeLink,
    };
  });

  if (only === "active" || only === "confirmed") {
    rows = rows.filter((r) => r.Status === "Confirmed");
  } else if (only === "opened") {
    rows = rows.filter((r) => r.Status === "Opened");
  } else if (only === "sent") {
    rows = rows.filter((r) => r.Status === "Sent");
  } else if (only === "not-opted-out") {
    rows = rows.filter((r) => r.Status !== "Opted out");
  } else if (only === "opted-out") {
    rows = rows.filter((r) => r.Status === "Opted out");
  } else if (only === "pending" || only === "new") {
    rows = rows.filter((r) => r.Status === "New");
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  ws["!cols"] = [
    { wch: 16 }, // First Name
    { wch: 18 }, // Last Name
    { wch: 16 }, // Monthly Savings
    { wch: 16 }, // Annual Savings
    { wch: 28 }, // Street Address
    { wch: 18 }, // City
    { wch: 10 }, // State
    { wch: 10 }, // Zip
    { wch: 30 }, // Email
    { wch: 18 }, // Phone
    { wch: 14 }, // Birth Date
    { wch: 14 }, // Hire Date
    { wch: 12 }, // Last 4 SS#
    { wch: 22 }, // Health Ins
    { wch: 42 }, // Insurance source
    { wch: 14 }, // Status
    { wch: 22 }, // Sent At
    { wch: 22 }, // Opened At
    { wch: 22 }, // Confirmed At
    { wch: 22 }, // Opted Out At
    { wch: 48 }, // Notice Link
  ];

  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
  ws["!autofilter"] = {
    ref: XLSX.utils.encode_range(range),
  };

  (ws as any)["!freeze"] = {
    xSplit: 0,
    ySplit: 1,
    topLeftCell: "A2",
    activePane: "bottomLeft",
    state: "frozen",
  };

  XLSX.utils.book_append_sheet(wb, ws, "Master Enrollment Data");

  const buffer = XLSX.write(wb, {
    type: "buffer",
    bookType: "xlsx",
  });

  const safeName = (employer.name || "employer")
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

  const suffix =
    only === "active" || only === "confirmed"
      ? "_confirmed_only"
      : only === "opened"
      ? "_opened_only"
      : only === "sent"
      ? "_sent_only"
      : only === "not-opted-out"
      ? "_not_opted_out"
      : only === "opted-out"
      ? "_opted_out"
      : only === "pending" || only === "new"
      ? "_new_only"
      : "";

  return new Response(buffer, {
    status: 200,
    headers: {
      "content-type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${safeName}_master_enrollment_data${suffix}.xlsx"`,
      "cache-control": "no-store",
    },
  });
}