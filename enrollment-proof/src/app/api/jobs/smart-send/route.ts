import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

type EmployerRow = {
  id: string;
  smart_send_enabled: boolean | null;
  smart_send_started_at: string | null;

  smart_send_initial_template_id: string | null;
  smart_send_second_delay_hours: number | null;
  smart_send_second_unopened_template_id: string | null;
  smart_send_second_opened_template_id: string | null;

  smart_send_third_delay_hours: number | null;
  smart_send_third_unopened_template_id: string | null;
  smart_send_third_opened_template_id: string | null;
};

type EmployeeRow = {
  id: string;
  email: string | null;
  token: string | null;
  eligible: boolean | null;
  notice_sent_at: string | null;
  notice_viewed_at: string | null;
  election: string | null;
  opted_out_at: string | null;
  confirm_closed_at: string | null;
};

type SmartEventRow = {
  employee_id: string;
  event_type: string;
  created_at: string;
};

type SendStageEvent =
  | "smart_send_initial_sent"
  | "smart_send_second_unopened_sent"
  | "smart_send_second_opened_sent"
  | "smart_send_third_unopened_sent"
  | "smart_send_third_opened_sent";

function isAuthorized(req: Request) {
  const expected = process.env.SMART_SEND_CRON_SECRET;

  const headerSecret = req.headers.get("x-smart-send-secret");
  if (expected && headerSecret === expected) return true;

  const authHeader = req.headers.get("authorization");
  if (expected && authHeader === `Bearer ${expected}`) return true;

  const vercelCron = req.headers.get("x-vercel-cron");
  if (vercelCron === "1") return true;

  return false;
}

function hoursSince(ts: string | null | undefined) {
  if (!ts) return Number.POSITIVE_INFINITY;
  const ms = new Date(ts).getTime();
  if (Number.isNaN(ms)) return Number.POSITIVE_INFINITY;
  return (Date.now() - ms) / (1000 * 60 * 60);
}

function hasBasics(e: EmployeeRow) {
  return !!e.email && !!e.token && e.eligible !== false;
}

function isComplete(e: EmployeeRow) {
  return !!e.confirm_closed_at;
}

function isUnsent(e: EmployeeRow) {
  return hasBasics(e) && !e.notice_sent_at && !isComplete(e);
}

function isUnopened(e: EmployeeRow) {
  return hasBasics(e) && !!e.notice_sent_at && !e.notice_viewed_at && !isComplete(e);
}

function isOpenedNoDecision(e: EmployeeRow) {
  return hasBasics(e) && !!e.notice_viewed_at && !e.election && !isComplete(e);
}

function hasEvent(rows: SmartEventRow[], eventType: SendStageEvent) {
  return rows.some((r) => r.event_type === eventType);
}

function getEvent(rows: SmartEventRow[], eventType: SendStageEvent) {
  return rows.find((r) => r.event_type === eventType) ?? null;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  const secret = process.env.SMART_SEND_CRON_SECRET!;
  const summary: any[] = [];

  const { data: employers, error: employersErr } = await supabaseServer
    .from("employers")
    .select(`
      id,
      smart_send_enabled,
      smart_send_started_at,
      smart_send_initial_template_id,
      smart_send_second_delay_hours,
      smart_send_second_unopened_template_id,
      smart_send_second_opened_template_id,
      smart_send_third_delay_hours,
      smart_send_third_unopened_template_id,
      smart_send_third_opened_template_id
    `)
    .eq("smart_send_enabled", true);

  if (employersErr) {
    return Response.json({ error: employersErr.message }, { status: 500 });
  }

  for (const employer of (employers ?? []) as EmployerRow[]) {
    const employerId = employer.id;

    const { data: employees, error: employeesErr } = await supabaseServer
      .from("employees")
      .select(`
        id,
        email,
        token,
        eligible,
        notice_sent_at,
        notice_viewed_at,
        election,
        opted_out_at,
        confirm_closed_at
      `)
      .eq("employer_id", employerId);

    if (employeesErr) {
      summary.push({ employerId, error: employeesErr.message });
      continue;
    }

    const employeeIds = (employees ?? []).map((e: any) => e.id).filter(Boolean);

    let smartEvents: SmartEventRow[] = [];
    if (employeeIds.length > 0) {
      const { data, error } = await supabaseServer
        .from("events")
        .select("employee_id, event_type, created_at")
        .eq("employer_id", employerId)
        .in("employee_id", employeeIds)
        .in("event_type", [
          "smart_send_initial_sent",
          "smart_send_second_unopened_sent",
          "smart_send_second_opened_sent",
          "smart_send_third_unopened_sent",
          "smart_send_third_opened_sent",
        ]);

      if (error) {
        summary.push({ employerId, error: error.message });
        continue;
      }

      smartEvents = (data ?? []) as SmartEventRow[];
    }

    const eventsByEmployee = new Map<string, SmartEventRow[]>();
    for (const ev of smartEvents) {
      const arr = eventsByEmployee.get(ev.employee_id) ?? [];
      arr.push(ev);
      eventsByEmployee.set(ev.employee_id, arr);
    }

    const secondDelay = Number(employer.smart_send_second_delay_hours || 48);
    const thirdDelay = Number(employer.smart_send_third_delay_hours || 72);

    const initialCandidates = (employees ?? []).filter((e: any) => {
      const prior = eventsByEmployee.get(e.id) ?? [];
      return isUnsent(e) && !hasEvent(prior, "smart_send_initial_sent");
    });

    const secondUnopenedCandidates = (employees ?? []).filter((e: any) => {
      if (!isUnopened(e)) return false;
      if (hoursSince(e.notice_sent_at) < secondDelay) return false;

      const prior = eventsByEmployee.get(e.id) ?? [];
      return !hasEvent(prior, "smart_send_second_unopened_sent");
    });

    const secondOpenedCandidates = (employees ?? []).filter((e: any) => {
      if (!isOpenedNoDecision(e)) return false;
      if (hoursSince(e.notice_viewed_at) < secondDelay) return false;

      const prior = eventsByEmployee.get(e.id) ?? [];
      return !hasEvent(prior, "smart_send_second_opened_sent");
    });

    const thirdUnopenedCandidates = (employees ?? []).filter((e: any) => {
      if (!isUnopened(e)) return false;

      const prior = eventsByEmployee.get(e.id) ?? [];
      const secondEvent = getEvent(prior, "smart_send_second_unopened_sent");
      if (!secondEvent) return false;
      if (hoursSince(secondEvent.created_at) < thirdDelay) return false;

      return !hasEvent(prior, "smart_send_third_unopened_sent");
    });

    const thirdOpenedCandidates = (employees ?? []).filter((e: any) => {
      if (!isOpenedNoDecision(e)) return false;

      const prior = eventsByEmployee.get(e.id) ?? [];
      const secondEvent = getEvent(prior, "smart_send_second_opened_sent");
      if (!secondEvent) return false;
      if (hoursSince(secondEvent.created_at) < thirdDelay) return false;

      return !hasEvent(prior, "smart_send_third_opened_sent");
    });

    async function sendStage(args: {
      templateId: string | null;
      employees: EmployeeRow[];
      smartEventType: SendStageEvent;
    }) {
      if (!args.templateId || args.employees.length === 0) {
        return { attempted: 0, sent: 0, skipped: args.employees.length };
      }

      const ids = args.employees.map((e) => e.id);

      const res = await fetch(
        `${baseUrl}/api/admin/employers/${employerId}/enrollment/send`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-smart-send-secret": secret,
          },
          body: JSON.stringify({
            employee_ids: ids,
            template_id: args.templateId,
          }),
        }
      );

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        throw new Error(data?.error || `Failed stage ${args.smartEventType}`);
      }

      const failedIds = new Set<string>(
        Array.isArray(data?.failed) ? data.failed.map((f: any) => String(f.employee_id)) : []
      );

      const successfulIds = ids.filter((id) => !failedIds.has(id));

      if (successfulIds.length > 0) {
        const now = new Date().toISOString();
        const { error: insertErr } = await supabaseServer.from("events").insert(
          successfulIds.map((employee_id) => ({
            employer_id: employerId,
            employee_id,
            event_type: args.smartEventType,
            created_at: now,
          }))
        );

        if (insertErr) {
          throw new Error(insertErr.message);
        }
      }

      return {
        attempted: Number(data?.attempted ?? ids.length),
        sent: Number(data?.sent ?? successfulIds.length),
        skipped: 0,
      };
    }

    try {
      const initial = await sendStage({
        templateId: employer.smart_send_initial_template_id,
        employees: initialCandidates as EmployeeRow[],
        smartEventType: "smart_send_initial_sent",
      });

      const secondUnopened = await sendStage({
        templateId: employer.smart_send_second_unopened_template_id,
        employees: secondUnopenedCandidates as EmployeeRow[],
        smartEventType: "smart_send_second_unopened_sent",
      });

      const secondOpened = await sendStage({
        templateId: employer.smart_send_second_opened_template_id,
        employees: secondOpenedCandidates as EmployeeRow[],
        smartEventType: "smart_send_second_opened_sent",
      });

      const thirdUnopened = await sendStage({
        templateId: employer.smart_send_third_unopened_template_id,
        employees: thirdUnopenedCandidates as EmployeeRow[],
        smartEventType: "smart_send_third_unopened_sent",
      });

      const thirdOpened = await sendStage({
        templateId: employer.smart_send_third_opened_template_id,
        employees: thirdOpenedCandidates as EmployeeRow[],
        smartEventType: "smart_send_third_opened_sent",
      });

      summary.push({
        employerId,
        initial,
        secondUnopened,
        secondOpened,
        thirdUnopened,
        thirdOpened,
      });
    } catch (err: any) {
      summary.push({
        employerId,
        error: err?.message || "Smart Send failed",
      });
    }
  }

  return Response.json({ ok: true, summary });
}