import { supabaseServer } from "@/lib/supabaseServer";
import * as XLSX from "xlsx";
import crypto from "crypto";

export const runtime = "nodejs";

type Body = {
  fileBase64?: string;
  fileName?: string;
  plan_year_id?: string;
  dryRun?: boolean;
};

function token(): string {
  return crypto.randomBytes(16).toString("hex");
}

function parseMMDDYYYY(n: number): Date | null {
  const s = String(Math.trunc(n)).padStart(8, "0");
  if (!/^\d{8}$/.test(s)) return null;
  const mm = Number(s.slice(0, 2));
  const dd = Number(s.slice(2, 4));
  const yyyy = Number(s.slice(4, 8));
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yyyy < 2000 || yyyy > 2100) return null;
  return new Date(yyyy, mm - 1, dd, 0, 0, 0);
}

function parseExcelDate(value: any): Date | null {
  if (value == null || value === "") return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  if (typeof value === "number" && Number.isFinite(value)) {
    if (value > 10_000_000) return parseMMDDYYYY(value);
    const d = XLSX.SSF.parse_date_code(value);
    if (!d) return null;
    return new Date(d.y, d.m - 1, d.d, 0, 0, 0);
  }

  const s = String(value).trim();
  if (!s) return null;

  const digits = s.replace(/\D/g, "");
  if (digits.length === 8) {
    const mmdd = parseMMDDYYYY(Number(digits));
    if (mmdd) return mmdd;

    const yyyy = Number(digits.slice(0, 4));
    const mm = Number(digits.slice(4, 6));
    const dd = Number(digits.slice(6, 8));
    if (yyyy >= 2000 && mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
      return new Date(yyyy, mm - 1, dd, 0, 0, 0);
    }
  }

  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d;

  return null;
}

function toIsoStart(d: Date) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0)).toISOString();
}

function normEmail(s: any): string {
  return String(s ?? "").trim().toLowerCase();
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function guessNameFromEmail(email: string): { first_name: string | null; last_name: string | null } {
  const local = (email.split("@")[0] || "").trim();
  if (!local) return { first_name: null, last_name: null };

  const parts = local.split(/[._\-+]+/).filter(Boolean);
  if (parts.length === 0) return { first_name: null, last_name: null };

  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

  if (/\d/.test(parts[0])) return { first_name: null, last_name: null };

  const first = cap(parts[0]);
  const last = parts.length >= 2 ? cap(parts[parts.length - 1]) : null;
  return { first_name: first || null, last_name: last || null };
}

function pickNameFromRow(r: any): { first_name: string | null; last_name: string | null } {
  const rawFirst = String(r["FIRST NAME"] ?? r["First Name"] ?? r["first_name"] ?? r["first"] ?? "").trim();
  const rawLast = String(r["LAST NAME"] ?? r["Last Name"] ?? r["last_name"] ?? r["last"] ?? "").trim();

  if (rawFirst || rawLast) return { first_name: rawFirst || null, last_name: rawLast || null };

  const rawName = String(r["NAME"] ?? r["Name"] ?? r["Employee Name"] ?? "").trim();
  if (rawName) {
    const parts = rawName.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return { first_name: parts[0], last_name: null };
    return { first_name: parts[0], last_name: parts.slice(1).join(" ") };
  }

  return { first_name: null, last_name: null };
}

function pickInvitationUrl(r: any): string | null {
  const v =
    r["INVITATION URL"] ??
    r["Invitation URL"] ??
    r["INVITATION_URL"] ??
    r["invitation_url"] ??
    r["Portal Link"] ??
    r["PORTAL LINK"] ??
    r["LINK"] ??
    r["Link"] ??
    r["Attentive Link"] ??
    r["ATTENTIVE LINK"] ??
    "";

  const s = String(v ?? "").trim();
  return s ? s : null;
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id: employerId } = await ctx.params;

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {}

  const dryRun = !!body.dryRun;

  if (!body.fileBase64) {
    return Response.json({ error: "Missing fileBase64" }, { status: 400 });
  }

  const { data: employer, error: employerErr } = await supabaseServer
    .from("employers")
    .select("id, name")
    .eq("id", employerId)
    .maybeSingle();

  if (employerErr || !employer) {
    return Response.json({ error: "Employer not found" }, { status: 404 });
  }

  // plan year
  let planYearId = body.plan_year_id;

  if (!planYearId) {
    const { data: py } = await supabaseServer
      .from("plan_years")
      .select("id")
      .eq("employer_id", employerId)
      .eq("status", "active")
      .maybeSingle();

    if (!py) {
      return Response.json({ error: "No active plan year found. Create one first." }, { status: 400 });
    }
    planYearId = py.id;
  }

  const { data: planYear, error: pyErr } = await supabaseServer
    .from("plan_years")
    .select("id, start_date, end_date")
    .eq("id", planYearId)
    .maybeSingle();

  if (pyErr || !planYear) {
    return Response.json({ error: "Plan year not found" }, { status: 404 });
  }

  const pyStart = new Date(`${planYear.start_date}T00:00:00Z`).getTime();
  const pyEnd = new Date(`${planYear.end_date}T23:59:59Z`).getTime();

  // parse workbook
  const buf = Buffer.from(body.fileBase64, "base64");
  const wb = XLSX.read(buf, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

  let scanned = 0;
  let inScope = 0;

  let createdEmployees = 0;
  let matchedEmployees = 0;

  let compliantSet = 0;
  let noncompliantSet = 0;

  let skippedNoEmail = 0;
  let skippedNoEmployeeMatch = 0;
  let skippedOverride = 0;

  // roster emails + best name hints
  const reportEmails: string[] = [];
  const nameFromReportByEmail = new Map<string, { first_name: string | null; last_name: string | null }>();

  for (const r of rows) {
    scanned++;
    const email = normEmail(r["EMAIL"] ?? r["Email"] ?? r["email"] ?? r["Email Address"] ?? r["EMAIL ADDRESS"] ?? "");
    if (!email) {
      skippedNoEmail++;
      continue;
    }
    reportEmails.push(email);

    const picked = pickNameFromRow(r);
    if (picked.first_name || picked.last_name) nameFromReportByEmail.set(email, picked);
  }

  const uniqueEmails = Array.from(new Set(reportEmails));
  inScope = uniqueEmails.length;

  // load existing employees
  const existingByEmail = new Map<
    string,
    { id: string; token: string; opted_out_at: string | null; first_name: string | null; last_name: string | null }
  >();

  for (const part of chunk(uniqueEmails, 500)) {
    const { data: existing, error: exErr } = await supabaseServer
      .from("employees")
      .select("id, email, token, opted_out_at, first_name, last_name")
      .eq("employer_id", employerId)
      .in("email", part);

    if (exErr) return Response.json({ error: `Failed loading employees: ${exErr.message}` }, { status: 500 });

    for (const e of existing ?? []) {
      existingByEmail.set(normEmail((e as any).email), {
        id: (e as any).id,
        token: String((e as any).token),
        opted_out_at: (e as any).opted_out_at ?? null,
        first_name: (e as any).first_name ?? null,
        last_name: (e as any).last_name ?? null,
      });
    }
  }

  // seed missing employees + fill blank names
  const employeeUpserts: any[] = [];

  for (const email of uniqueEmails) {
    const existing = existingByEmail.get(email);
    const fromReport = nameFromReportByEmail.get(email) ?? { first_name: null, last_name: null };
    const guessed = guessNameFromEmail(email);

    const finalFirst = fromReport.first_name ?? (existing?.first_name ? existing.first_name : guessed.first_name);
    const finalLast = fromReport.last_name ?? (existing?.last_name ? existing.last_name : guessed.last_name);

    if (!existing) {
      createdEmployees++;
      employeeUpserts.push({
        employer_id: employerId,
        email,
        eligible: true,
        token: dryRun ? "DRY_RUN_TOKEN" : token(), // never null
        first_name: finalFirst,
        last_name: finalLast,
      });
    } else {
      const shouldImprove = (!existing.first_name && !!finalFirst) || (!existing.last_name && !!finalLast);
      if (shouldImprove) {
        employeeUpserts.push({
          employer_id: employerId,
          email,
          eligible: true,
          token: existing.token,
          first_name: existing.first_name ?? finalFirst,
          last_name: existing.last_name ?? finalLast,
        });
      }
    }
  }

  if (!dryRun && employeeUpserts.length > 0) {
    for (const part of chunk(employeeUpserts, 500)) {
      const { error: upErr } = await supabaseServer.from("employees").upsert(part, { onConflict: "employer_id,email" });
      if (upErr)
        return Response.json({ error: `Failed auto-seeding/updating employees: ${upErr.message}` }, { status: 500 });
    }
  }

  // reload employees to get IDs
  const employeeByEmail = new Map<string, { id: string; opted_out_at: string | null }>();
  for (const part of chunk(uniqueEmails, 500)) {
    const { data: empRows, error: empErr } = await supabaseServer
      .from("employees")
      .select("id, email, opted_out_at")
      .eq("employer_id", employerId)
      .in("email", part);

    if (empErr) return Response.json({ error: empErr.message }, { status: 500 });

    for (const e of empRows ?? []) {
      employeeByEmail.set(normEmail((e as any).email), {
        id: (e as any).id,
        opted_out_at: (e as any).opted_out_at ?? null,
      });
    }
  }

  // overrides
  const { data: epyRows, error: epyErr } = await supabaseServer
    .from("employee_plan_year")
    .select("employee_id, override_flag")
    .eq("plan_year_id", planYearId);

  if (epyErr) return Response.json({ error: epyErr.message }, { status: 500 });

  const overrideSet = new Set<string>();
  for (const rr of epyRows ?? []) if ((rr as any).override_flag) overrideSet.add((rr as any).employee_id);

  // build EPY upserts + vendor scope ids
  const upsertsEPY: any[] = [];
  const inScopeEmployeeIds: string[] = [];

  for (const r of rows) {
    const email = normEmail(r["EMAIL"] ?? r["Email"] ?? r["email"] ?? r["Email Address"] ?? r["EMAIL ADDRESS"] ?? "");
    if (!email) continue;

    const emp = employeeByEmail.get(email);
    if (!emp) {
      skippedNoEmployeeMatch++;
      continue;
    }

    // ✅ Pull the personal Attentive link from this row
    const invitationUrl = pickInvitationUrl(r);

    inScopeEmployeeIds.push(emp.id);
    matchedEmployees++;

    // If overridden: record last login + invitation link, but don't change compliance_status automatically
    if (overrideSet.has(emp.id)) {
      const lastLogin = parseExcelDate(r["LAST LOGIN DATE"] ?? r["Last Login Date"] ?? r["LAST_LOGIN_DATE"]);
      upsertsEPY.push({
        employee_id: emp.id,
        plan_year_id: planYearId,
        last_attentive_login_at: lastLogin ? toIsoStart(lastLogin) : null,
        attentive_invitation_url: invitationUrl,
      });
      skippedOverride++;
      continue;
    }

    const lastLogin = parseExcelDate(r["LAST LOGIN DATE"] ?? r["Last Login Date"] ?? r["LAST_LOGIN_DATE"]);

    let compliance_status: "compliant" | "noncompliant" | "opted_out" = "noncompliant";
    let compliant_at: string | null = null;
    let last_attentive_login_at: string | null = null;

    if (emp.opted_out_at) {
      compliance_status = "opted_out";
    } else if (lastLogin) {
      last_attentive_login_at = toIsoStart(lastLogin);
      const t = lastLogin.getTime();
      if (t >= pyStart && t <= pyEnd) {
        compliance_status = "compliant";
        compliant_at = toIsoStart(lastLogin);
      } else {
        compliance_status = "noncompliant";
      }
    } else {
      compliance_status = "noncompliant";
    }

    if (compliance_status === "compliant") compliantSet++;
    if (compliance_status === "noncompliant") noncompliantSet++;

    upsertsEPY.push({
      employee_id: emp.id,
      plan_year_id: planYearId,
      compliance_status,
      last_attentive_login_at,
      compliant_at,

      // ✅ store personal Attentive link from the report
      attentive_invitation_url: invitationUrl,
    });
  }

  const scopeIds = Array.from(new Set(inScopeEmployeeIds));

  if (dryRun) {
    return Response.json({
      ok: true,
      dryRun: true,
      plan_year_id: planYearId,
      counts: {
        scanned,
        inScope,
        createdEmployees,
        matchedEmployees,
        compliantSet,
        noncompliantSet,
        skippedNoEmail,
        skippedNoEmployeeMatch,
        skippedOverride,
      },
    });
  }

  // 1) upsert employee_plan_year
  for (const part of chunk(upsertsEPY, 500)) {
    const { error } = await supabaseServer.from("employee_plan_year").upsert(part, {
      onConflict: "employee_id,plan_year_id",
    });
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }

  // 2) create compliance import run
  const { data: run, error: runErr } = await supabaseServer
    .from("compliance_import_runs")
    .insert({
      employer_id: employerId,
      plan_year_id: planYearId,
      imported_at: new Date().toISOString(),
      source_filename: body.fileName || null,
    })
    .select("id")
    .single();

  if (runErr) return Response.json({ error: runErr.message }, { status: 500 });

  // 3) insert members (vendor scope roster)
  const members = scopeIds.map((employee_id) => ({ run_id: run.id, employee_id }));
  for (const part of chunk(members, 1000)) {
    const { error } = await supabaseServer.from("compliance_import_run_members").insert(part);
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    ok: true,
    dryRun: false,
    plan_year_id: planYearId,
    counts: {
      scanned,
      inScope,
      createdEmployees,
      matchedEmployees,
      compliantSet,
      noncompliantSet,
      skippedNoEmail,
      skippedNoEmployeeMatch,
      skippedOverride,
      upserts: upsertsEPY.length,
      run_id: run.id,
      members: scopeIds.length,
    },
  });
}