import { supabaseServer } from "@/lib/supabaseServer";

export type PlanYear = {
  id: string;
  employer_id: string;
  name: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  status: "active" | "closed";
};

export async function getActivePlanYear(employerId: string): Promise<PlanYear | null> {
  const { data, error } = await supabaseServer
    .from("plan_years")
    .select("id, employer_id, name, start_date, end_date, status")
    .eq("employer_id", employerId)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as any) ?? null;
}

// Adds months safely (handles month length differences)
function addMonths(date: Date, months: number) {
  const d = new Date(date.getTime());
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);

  // If month rollover changed the day (e.g., Jan 31 + 1 month), clamp to last day
  if (d.getDate() !== day) {
    d.setDate(0);
  }
  return d;
}

function toISODate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function ensureActivePlanYear(opts: {
  employerId: string;
  effectiveDate: string;      // YYYY-MM-DD
  lengthMonths?: number;      // default 12
  name?: string;              // optional override
}): Promise<PlanYear> {
  const existing = await getActivePlanYear(opts.employerId);
  if (existing) return existing;

  const lengthMonths = opts.lengthMonths ?? 12;

  const start = new Date(`${opts.effectiveDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) {
    throw new Error("Invalid effectiveDate (expected YYYY-MM-DD)");
  }

  const end = addMonths(start, lengthMonths);
  // End date should be the day before the next plan-year start
  end.setDate(end.getDate() - 1);

  const start_date = toISODate(start);
  const end_date = toISODate(end);

  const name =
    opts.name ??
    `${start_date} → ${end_date} Plan Year`;

  // Insert as active (unique index prevents multiple actives)
  const { data, error } = await supabaseServer
    .from("plan_years")
    .insert({
      employer_id: opts.employerId,
      name,
      start_date,
      end_date,
      status: "active",
    })
    .select("id, employer_id, name, start_date, end_date, status")
    .single();

  if (error) throw new Error(error.message);
  return data as any;
}