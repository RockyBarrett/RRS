import { supabaseServer } from "@/lib/supabaseServer";
import { ensureActivePlanYear } from "@/lib/planYear";

/**
 * Ensures employee_plan_year rows exist for the employer’s ACTIVE plan year.
 * Safe to run repeatedly (idempotent).
 */
export async function ensureEmployeePlanYearForEmployees(opts: {
  employerId: string;
  effectiveDate: string;     // YYYY-MM-DD (used only if plan year doesn’t exist yet)
  lengthMonths?: number;     // default 12
  employeeIds: string[];
}): Promise<{ planYearId: string; ensured: number }> {
  const { employerId, employeeIds } = opts;
  const lengthMonths = opts.lengthMonths ?? 12;

  if (!employeeIds.length) return { planYearId: "", ensured: 0 };

  // Ensure active plan year exists
  const planYear = await ensureActivePlanYear({
    employerId,
    effectiveDate: opts.effectiveDate,
    lengthMonths,
  });

  // Upsert minimal rows so we DO NOT overwrite statuses/overrides
  const rows = employeeIds.map((employee_id) => ({
    employee_id,
    plan_year_id: planYear.id,
  }));

  // Upsert is safe here because we only provide the keys (no status fields)
  const { error } = await supabaseServer
    .from("employee_plan_year")
    .upsert(rows, { onConflict: "employee_id,plan_year_id" });

  if (error) throw new Error(error.message);

  return { planYearId: planYear.id, ensured: rows.length };
}