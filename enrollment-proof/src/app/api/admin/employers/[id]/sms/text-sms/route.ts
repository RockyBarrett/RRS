import { supabaseServer } from "@/lib/supabaseServer";
import twilio from "twilio";

export const runtime = "nodejs";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "").trim();
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id: employerId } = await ctx.params;

  if (!accountSid || !authToken || !messagingServiceSid) {
    return Response.json(
      { error: "Missing Twilio environment variables." },
      { status: 500 }
    );
  }

  let body: { employee_id?: string; phone?: string; message?: string } = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const employeeId = String(body.employee_id || "").trim();
  const directPhone = String(body.phone || "").trim();
  const customMessage = String(body.message || "").trim();

  if (!employeeId && !directPhone) {
    return Response.json(
      { error: "Provide employee_id or phone." },
      { status: 400 }
    );
  }

  let employee: any = null;

  if (employeeId) {
    const { data, error } = await supabaseServer
      .from("employees")
      .select("id, first_name, last_name, email, phone, token")
      .eq("employer_id", employerId)
      .eq("id", employeeId)
      .maybeSingle();

    if (error || !data) {
      return Response.json({ error: "Employee not found." }, { status: 404 });
    }

    employee = data;
  }

  const to = normalizePhone(directPhone || employee?.phone || "");
  if (!to) {
    return Response.json({ error: "No phone number found." }, { status: 400 });
  }

  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  const noticeLink =
    employee?.token ? `${baseUrl}/notice/${employee.token}` : "";

  const defaultMessage = employee
    ? `Hi ${employee.first_name || ""}, this is a test enrollment text from Flow. Review your notice here: ${noticeLink}`.trim()
    : "This is a test enrollment text from Flow.";

  const messageBody = customMessage || defaultMessage;

  try {
    const client = twilio(accountSid, authToken);

    const sent = await client.messages.create({
      body: messageBody,
      messagingServiceSid,
      to,
    });

    if (employee?.id) {
      await supabaseServer.from("events").insert({
        employer_id: employerId,
        employee_id: employee.id,
        event_type: "sms_sent",
        created_at: new Date().toISOString(),
        metadata: {
          sid: sent.sid,
          status: sent.status,
          to,
          body: messageBody,
        },
      });
    }

    return Response.json({
      ok: true,
      sid: sent.sid,
      status: sent.status,
      to,
      employee_id: employee?.id ?? null,
    });
  } catch (err: any) {
    return Response.json(
      { error: err?.message || "Failed to send SMS." },
      { status: 500 }
    );
  }
}