import { supabaseServer } from "@/lib/supabaseServer";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const runtime = "nodejs";

type EmployeeStatus = "Pending" | "Active" | "Opted out";

type EmployeeRow = {
  employee_ref: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  token: string;
  eligible: boolean;
  opted_out_at: string | null;
  viewed: boolean;
  noticeLink: string;
  status: EmployeeStatus;
};

function csvEscape(value: unknown) {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function normalizeBoolean(value: string | null): boolean | undefined {
  if (!value) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function compareValues(a: unknown, b: unknown, dir: "asc" | "desc" = "asc") {
  const av = a == null ? "" : String(a).toLowerCase();
  const bv = b == null ? "" : String(b).toLowerCase();

  if (av < bv) return dir === "asc" ? -1 : 1;
  if (av > bv) return dir === "asc" ? 1 : -1;
  return 0;
}

function formatDate(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatExportTimestamp() {
  return new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function latestEventAt(activity: any[], type: string): string | null {
  const hit = (activity ?? []).find((x) => x.event_type === type);
  return hit?.created_at ?? null;
}

function hasViewedNotice(
  e: {
    notice_viewed_at?: string | null;
    learn_more_viewed_at?: string | null;
    terms_viewed_at?: string | null;
    confirm_closed_at?: string | null;
    insurance_selected_at?: string | null;
    opted_out_at?: string | null;
  },
  activity: any[]
) {
  return !!(
    e.notice_viewed_at ||
    e.learn_more_viewed_at ||
    e.terms_viewed_at ||
    e.confirm_closed_at ||
    e.insurance_selected_at ||
    e.opted_out_at ||
    latestEventAt(activity, "page_view") ||
    latestEventAt(activity, "learn_more_view") ||
    latestEventAt(activity, "confirm_closed") ||
    latestEventAt(activity, "confirm_close") ||
    latestEventAt(activity, "acknowledged_closed") ||
    latestEventAt(activity, "opt_out") ||
    latestEventAt(activity, "opt_in")
  );
}

function getStatusRank(status: EmployeeStatus) {
  const rank: Record<EmployeeStatus, number> = {
    Active: 0,
    "Opted out": 1,
    Pending: 2,
  };
  return rank[status] ?? 999;
}

function buildTableRows(employees: EmployeeRow[]) {
  return employees.map((e) => ({
    "Employee Ref": e.employee_ref,
    "First Name": e.first_name,
    "Last Name": e.last_name,
    Email: e.email,
    Phone: e.phone,
    Eligible: e.eligible ? "Yes" : "No",
    Viewed: e.viewed ? "Yes" : "No",
    "Opted Out At": formatDate(e.opted_out_at),
    Status: e.status,
    "Notice Link": e.noticeLink,
  }));
}

function normalizeStatusFilter(value: string | null): EmployeeStatus | undefined {
  if (!value) return undefined;
  if (value === "Pending" || value === "Active" || value === "Opted out") {
    return value;
  }
  return undefined;
}

function buildCsv(headers: string[], rows: unknown[][]) {
  return (
    headers.join(",") +
    "\n" +
    rows.map((r) => r.map(csvEscape).join(",")).join("\n")
  );
}

function makeSummarySheet(params: {
  employerName: string;
  exportedAt: string;
  total: number;
  active: number;
  optedOut: number;
  pending: number;
  format: string;
  sort: string;
  dir: "asc" | "desc";
  statusFilter?: EmployeeStatus;
  eligibleFilter?: boolean;
  viewedFilter?: boolean;
}) {
  const {
    employerName,
    exportedAt,
    total,
    active,
    optedOut,
    pending,
    format,
    sort,
    dir,
    statusFilter,
    eligibleFilter,
    viewedFilter,
  } = params;

  const rows = [
    ["Employee Status Report"],
    [""],
    ["Employer", employerName],
    ["Exported", exportedAt],
    ["Format", format.toUpperCase()],
    ["Sort", `${sort} (${dir})`],
    [""],
    ["Status Filter", statusFilter ?? "All"],
    ["Eligible Filter", eligibleFilter === undefined ? "All" : eligibleFilter ? "Yes" : "No"],
    ["Viewed Filter", viewedFilter === undefined ? "All" : viewedFilter ? "Yes" : "No"],
    [""],
    ["Total Employees", total],
    ["Active", active],
    ["Opted out", optedOut],
    ["Pending", pending],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws["!cols"] = [{ wch: 20 }, { wch: 28 }];

  return ws;
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await ctx.params;
  const { searchParams } = new URL(req.url);

  const format = (searchParams.get("format") || "csv").toLowerCase();
  const statusFilter = normalizeStatusFilter(searchParams.get("status"));
  const eligibleFilter = normalizeBoolean(searchParams.get("eligible"));
  const viewedFilter = normalizeBoolean(searchParams.get("viewed"));

  const defaultSort = format === "pdf" ? "status" : "last_name";
  const sort = searchParams.get("sort") || defaultSort;
  const dir = searchParams.get("dir") === "desc" ? "desc" : "asc";

  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

  const { data: employer, error: employerErr } = await supabaseServer
    .from("employers")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();

  if (employerErr || !employer) {
    return new Response("Employer not found", { status: 404 });
  }

  const { data: employeesRaw, error: empErr } = await supabaseServer
  .from("employees")
  .select(`
    employee_ref,
    first_name,
    last_name,
    email,
    phone,
    token,
    eligible,
    opted_out_at,
    notice_sent_at,
    notice_viewed_at,
    learn_more_viewed_at,
    terms_viewed_at,
    confirm_closed_at,
    insurance_selected_at,
    events ( event_type, created_at )
  `)
  .eq("employer_id", id);

  if (empErr) {
    return new Response(`Error loading employees: ${empErr.message}`, {
      status: 500,
    });
  }

  let employees: EmployeeRow[] = (employeesRaw ?? []).map((e: any) => {
  const activity = Array.isArray(e.events) ? e.events : [];

  const viewed = hasViewedNotice(
    {
      notice_viewed_at: e.notice_viewed_at ?? null,
      learn_more_viewed_at: e.learn_more_viewed_at ?? null,
      terms_viewed_at: e.terms_viewed_at ?? null,
      confirm_closed_at: e.confirm_closed_at ?? null,
      insurance_selected_at: e.insurance_selected_at ?? null,
      opted_out_at: e.opted_out_at ?? null,
    },
    activity
  );

  const noticeLink = e.token ? `${baseUrl}/notice/${e.token}` : "";

  const status: EmployeeStatus = e.opted_out_at
    ? "Opted out"
    : viewed
    ? "Active"
    : "Pending";

  return {
    employee_ref: e.employee_ref ?? "",
    first_name: e.first_name ?? "",
    last_name: e.last_name ?? "",
    email: e.email ?? "",
    phone: e.phone ?? "",
    token: e.token ?? "",
    eligible: !!e.eligible,
    opted_out_at: e.opted_out_at ?? null,
    viewed,
    noticeLink,
    status,
  };
});

  if (statusFilter) {
    employees = employees.filter((e) => e.status === statusFilter);
  }

  if (eligibleFilter !== undefined) {
    employees = employees.filter((e) => e.eligible === eligibleFilter);
  }

  if (viewedFilter !== undefined) {
    employees = employees.filter((e) => e.viewed === viewedFilter);
  }

  employees.sort((a, b) => {
    switch (sort) {
      case "first_name":
        return compareValues(a.first_name, b.first_name, dir);
      case "email":
        return compareValues(a.email, b.email, dir);
      case "phone":
        return compareValues(a.phone, b.phone, dir);
      case "eligible":
        return compareValues(String(a.eligible), String(b.eligible), dir);
      case "viewed":
        return compareValues(String(a.viewed), String(b.viewed), dir);
      case "status": {
        const diff = getStatusRank(a.status) - getStatusRank(b.status);
        if (diff !== 0) return dir === "asc" ? diff : -diff;

        const last = compareValues(a.last_name, b.last_name, "asc");
        if (last !== 0) return last;

        return compareValues(a.first_name, b.first_name, "asc");
      }
      case "opted_out_at":
        return compareValues(a.opted_out_at, b.opted_out_at, dir);
      case "last_name":
      default: {
        const last = compareValues(a.last_name, b.last_name, dir);
        if (last !== 0) return last;

        return compareValues(a.first_name, b.first_name, dir);
      }
    }
  });

  const safeName = (employer.name || "employer")
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

  const exportRows = buildTableRows(employees);
  const exportedAt = formatExportTimestamp();
  const activeCount = employees.filter((e) => e.status === "Active").length;
  const optedOutCount = employees.filter((e) => e.status === "Opted out").length;
  const pendingCount = employees.filter((e) => e.status === "Pending").length;

  if (format === "xlsx") {
    const wb = XLSX.utils.book_new();

    const summaryWs = makeSummarySheet({
      employerName: employer.name || "Employer",
      exportedAt,
      total: employees.length,
      active: activeCount,
      optedOut: optedOutCount,
      pending: pendingCount,
      format,
      sort,
      dir,
      statusFilter,
      eligibleFilter,
      viewedFilter,
    });

    const employeesWs = XLSX.utils.json_to_sheet(exportRows);

    employeesWs["!cols"] = [
      { wch: 18 },
      { wch: 16 },
      { wch: 18 },
      { wch: 32 },
      { wch: 18 },
      { wch: 10 },
      { wch: 10 },
      { wch: 24 },
      { wch: 14 },
      { wch: 48 },
    ];

    const range = XLSX.utils.decode_range(employeesWs["!ref"] || "A1");
    employeesWs["!autofilter"] = {
      ref: XLSX.utils.encode_range(range),
    };

    // Optional freeze pane metadata for some spreadsheet apps
    (employeesWs as any)["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };

    XLSX.utils.book_append_sheet(wb, summaryWs, "Report");
    XLSX.utils.book_append_sheet(wb, employeesWs, "Employees");

    const buffer = XLSX.write(wb, {
      type: "buffer",
      bookType: "xlsx",
    });

    return new Response(buffer, {
      status: 200,
      headers: {
        "content-type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename="${safeName}_employee_status_report.xlsx"`,
        "cache-control": "no-store",
      },
    });
  }

  if (format === "pdf") {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "a4",
    });

    doc.setFontSize(15);
    doc.text(`${employer.name} — Employee Status Report`, 40, 38);

    doc.setFontSize(9);
    doc.text(`Exported: ${exportedAt}`, 40, 56);
    doc.text(
      `Rows: ${employees.length}   Active: ${activeCount}   Opted out: ${optedOutCount}   Pending: ${pendingCount}`,
      40,
      70
    );

    autoTable(doc, {
      startY: 84,
      head: [[
        "First Name",
        "Last Name",
        "Email",
        "Phone",
        "Eligible",
        "Viewed",
        "Status",
        "Opted Out At",
      ]],
      body: employees.map((e) => [
        e.first_name,
        e.last_name,
        e.email,
        e.phone,
        e.eligible ? "Yes" : "No",
        e.viewed ? "Yes" : "No",
        e.status,
        formatDate(e.opted_out_at),
      ]),
      styles: {
        fontSize: 8,
        cellPadding: 4,
        overflow: "linebreak",
        valign: "middle",
      },
      headStyles: {
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 80 },
        2: { cellWidth: 180 },
        3: { cellWidth: 95 },
        4: { cellWidth: 50 },
        5: { cellWidth: 50 },
        6: { cellWidth: 70 },
        7: { cellWidth: 110 },
      },
      didDrawPage: () => {
        const pageNumber = doc.getCurrentPageInfo().pageNumber;
        const totalPages = doc.getNumberOfPages();
        const pageSize = doc.internal.pageSize;
        const pageWidth = pageSize.getWidth();
        const pageHeight = pageSize.getHeight();

        doc.setFontSize(8);
        doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - 70, pageHeight - 18);
      },
    });

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${safeName}_employee_status_report.pdf"`,
        "cache-control": "no-store",
      },
    });
  }

  const headers = [
    "employee_ref",
    "first_name",
    "last_name",
    "email",
    "phone",
    "eligible",
    "viewed",
    "opted_out_at",
    "status",
    "notice_link",
  ];

  const rows = employees.map((e) => [
    e.employee_ref,
    e.first_name,
    e.last_name,
    e.email,
    e.phone,
    e.eligible ? "Yes" : "No",
    e.viewed ? "Yes" : "No",
    formatDate(e.opted_out_at),
    e.status,
    e.noticeLink,
  ]);

  const csv = buildCsv(headers, rows);

  return new Response(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${safeName}_employee_status_report.csv"`,
      "cache-control": "no-store",
    },
  });
}