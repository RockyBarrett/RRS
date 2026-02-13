import { supabaseServer } from "@/lib/supabaseServer";
import crypto from "crypto";
import { ensureEmployeePlanYearForEmployees } from "@/lib/employeePlanYear";

export const runtime = "nodejs";

type ImportBody = {
  csvText?: string;
  dryRun?: boolean;
};

function token(): string {
  return crypto.randomBytes(16).toString("hex");
}

function normalizeBool(v: string | undefined): boolean {
  const s = (v ?? "").trim().toLowerCase();
  if (s === "") return true;
  return s === "true" || s === "1" || s === "yes" || s === "y";
}

function toCentsFromDollars(v: string | undefined): number | null | undefined {
  // IMPORTANT:
  // - undefined => "not provided" (preserve existing)
  // - null => explicitly provided but invalid/empty (we'll treat empty as undefined)
  if (v === undefined) return undefined;
  const cleaned = String(v).replace(/[$,]/g, "").trim();
  if (cleaned === "") return undefined; // blank => preserve existing
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return undefined; // invalid => preserve existing
  return Math.round(n * 100);
}

function parseCSV(csvText: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const c = csvText[i];
    const next = csvText[i + 1];

    if (inQuotes) {
      if (c === `"` && next === `"`) {
        field += `"`;
        i++;
      } else if (c === `"`) {
        inQuotes = false;
      } else {
        field += c;
      }
      continue;
    }

    if (c === `"`) {
      inQuotes = true;
      continue;
    }

    if (c === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (c === "\n") {
      row.push(field);
      field = "";
      if (row.some((v) => v.trim() !== "")) rows.push(row);
      row = [];
      continue;
    }

    if (c === "\r") continue;
    field += c;
  }

  row.push(field);
  if (row.some((v) => v.trim() !== "")) rows.push(row);

  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim());

  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => (obj[h] = (r[idx] ?? "").trim()));
    return obj;
  });
}

function normEmail(s: string): string {
  return s.trim().toLowerCase();
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

type ExistingEmployee = {
  id: string;
  email: string;
  token: string | null;
  opted_out_at: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  employee_ref: string | null;
  eligible: boolean;
  annual_savings_cents: number | null;
};

type NormalizedInput = {
  employer_id: string;
  email: string;
  employee_ref: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  eligible: boolean;

  // undefined means "not provided" (preserve existing)
  annual_savings_cents?: number | null;
};

type UpsertRow = NormalizedInput & {
  token: string;
  opted_out_at: string | null;
  annual_savings_cents: number | null; // final value written
};

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id: employerId } = await ctx.params;

  let body: ImportBody = {};
  try {
    body = (await req.json()) as ImportBody;
  } catch {}

  const csvText = body.csvText;
  const dryRun = !!body.dryRun;

  if (!csvText || csvText.trim().length < 5) {
    return Response.json({ error: "Missing csvText" }, { status: 400 });
  }

  // ✅ FIX: include effective_date so plan-year sync has the value it needs
  const { data: employer, error: employerErr } = await supabaseServer
    .from("employers")
    .select("id, name, effective_date")
    .eq("id", employerId)
    .maybeSingle();

  if (employerErr || !employer) {
    return Response.json({ error: "Employer not found" }, { status: 404 });
  }

  const rawRows = parseCSV(csvText);

  let skipped = 0;
  let skippedDuplicates = 0;

  const seenEmails = new Set<string>();
  const normalizedInputs: NormalizedInput[] = [];

  for (const r of rawRows) {
    const emailRaw =
      r.email || r.Email || r["Email Address"] || r["email_address"] || "";
    const email = normEmail(emailRaw);

    if (!email) {
      skipped++;
      continue;
    }
    if (seenEmails.has(email)) {
      skippedDuplicates++;
      continue;
    }
    seenEmails.add(email);

    const first_name =
      (r.first_name || r.FirstName || r.first || r["First Name"] || "").trim() ||
      null;
    const last_name =
      (r.last_name || r.LastName || r.last || r["Last Name"] || "").trim() ||
      null;
    const phone =
      (r.phone || r.Phone || r.mobile || r.Mobile || "").trim() || null;

    const employee_ref =
      (r.employee_ref ||
        r.employee_id ||
        r.EmployeeID ||
        r["Employee ID"] ||
        "").trim() || null;

    const eligible =
      r.eligible === undefined || r.eligible === ""
        ? true
        : normalizeBool(r.eligible);

    // savings: preserve if not provided
    const annual_savings_cents =
      r.annual_savings_cents !== undefined && r.annual_savings_cents !== ""
        ? Number(r.annual_savings_cents)
        : toCentsFromDollars(
            r.annual_savings_dollars ||
              r.annual_savings ||
              r["Annual Savings"] ||
              undefined
          );

    normalizedInputs.push({
      employer_id: employerId,
      email,
      employee_ref,
      first_name,
      last_name,
      phone,
      eligible,
      annual_savings_cents:
        annual_savings_cents === undefined ||
        !Number.isFinite(annual_savings_cents as any)
          ? undefined
          : (annual_savings_cents as any),
    });
  }

  // Lookup existing employees
  const emails = normalizedInputs.map((r) => r.email);
  const existingMap = new Map<string, ExistingEmployee>();

  for (const part of chunk(emails, 500)) {
    const { data: existing, error: exErr } = await supabaseServer
      .from("employees")
      .select(
        "id, email, token, opted_out_at, first_name, last_name, phone, employee_ref, eligible, annual_savings_cents"
      )
      .eq("employer_id", employerId)
      .in("email", part);

    if (exErr) {
      return Response.json(
        { error: `Failed loading existing employees: ${exErr.message}` },
        { status: 500 }
      );
    }

    (existing ?? []).forEach((e: any) => {
      existingMap.set(normEmail(e.email), e as ExistingEmployee);
    });
  }

  let inserted = 0;
  let updated = 0;
  let unchanged = 0;

  const upsertRows: UpsertRow[] = normalizedInputs.map((r) => {
    const existing = existingMap.get(r.email);

    const preservedToken = existing?.token || (dryRun ? "" : token());
    const preservedOptedOutAt = existing?.opted_out_at ?? null;

    // ✅ Preserve savings if not provided
    const finalSavings =
      r.annual_savings_cents === undefined
        ? (existing?.annual_savings_cents ?? null)
        : (r.annual_savings_cents ?? null);

    if (!existing) {
      inserted++;
    } else {
      // Only count savings as a "change" if the CSV provided it
      const savingsChanged =
        r.annual_savings_cents !== undefined &&
        (existing.annual_savings_cents ?? null) !== finalSavings;

      const changed =
        (existing.first_name ?? null) !== r.first_name ||
        (existing.last_name ?? null) !== r.last_name ||
        (existing.phone ?? null) !== r.phone ||
        (existing.employee_ref ?? null) !== r.employee_ref ||
        (existing.eligible ?? true) !== r.eligible ||
        savingsChanged;

      if (changed) updated++;
      else unchanged++;
    }

    return {
      employer_id: r.employer_id,
      email: r.email,
      employee_ref: r.employee_ref,
      first_name: r.first_name,
      last_name: r.last_name,
      phone: r.phone,
      eligible: r.eligible,
      annual_savings_cents: finalSavings,
      token: preservedToken,
      opted_out_at: preservedOptedOutAt,
    };
  });

  // Dry run: counts only, no writes, no links
  if (dryRun) {
    return Response.json({
      ok: true,
      dryRun: true,
      employer: { id: employer.id, name: employer.name },
      counts: { inserted, updated, unchanged, skipped, skippedDuplicates },
      links: [],
    });
  }

  // Real import (employees)
  let upsertErrors = 0;
  for (const part of chunk(upsertRows, 500)) {
    const { error: upErr } = await supabaseServer
      .from("employees")
      .upsert(part, { onConflict: "employer_id,email" });

    if (upErr) upsertErrors++;
  }

  if (upsertErrors > 0) {
    return Response.json(
      {
        ok: false,
        error: "One or more upsert batches failed. Check server logs.",
        employer: { id: employer.id, name: employer.name },
        counts: { inserted, updated, unchanged, skipped, skippedDuplicates, upsertErrors },
      },
      { status: 500 }
    );
  }

  // ✅ Plan Year sync: DO NOT fail whole import if this errors
  let planYearSyncError: string | null = null;

  try {
    const { data: affectedEmployees, error: affectedErr } = await supabaseServer
      .from("employees")
      .select("id")
      .eq("employer_id", employerId)
      .in("email", upsertRows.map((r) => r.email));

    if (affectedErr) throw new Error(affectedErr.message);

    const employeeIds = (affectedEmployees ?? []).map((e: any) => e.id);

    const effectiveDate = String((employer as any).effective_date || "").trim();
    if (!effectiveDate) throw new Error("Employer missing effective_date (cannot create plan year).");

    await ensureEmployeePlanYearForEmployees({
      employerId,
      effectiveDate,
      lengthMonths: 12,
      employeeIds,
    });
  } catch (err: any) {
    planYearSyncError = err?.message || "Plan year sync failed.";
  }

  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  const links = upsertRows.map((r) => ({
    email: r.email,
    first_name: r.first_name ?? "",
    last_name: r.last_name ?? "",
    eligible: r.eligible,
    token: r.token,
    notice_link: r.token ? `${baseUrl}/notice/${r.token}` : "",
  }));

  return Response.json({
    ok: true,
    dryRun: false,
    employer: { id: employer.id, name: employer.name },
    counts: { inserted, updated, unchanged, skipped, skippedDuplicates },
    links,
    planYearSyncError,
  });
}