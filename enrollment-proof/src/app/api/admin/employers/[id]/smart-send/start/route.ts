import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: employerId } = await params;

  const body = await req.json().catch(() => ({}));

  const {
    initialTemplateId,
    secondDelayHours,
    secondUnopenedTemplateId,
    secondOpenedNoDecisionTemplateId,
    thirdDelayHours,
    thirdUnopenedTemplateId,
    thirdOpenedNoDecisionTemplateId,
  } = body || {};

  const { error } = await supabaseServer
    .from("employers")
    .update({
      smart_send_enabled: true,
      smart_send_started_at: new Date().toISOString(),

      smart_send_initial_template_id: initialTemplateId,
      smart_send_second_delay_hours: secondDelayHours,
      smart_send_second_unopened_template_id: secondUnopenedTemplateId,
      smart_send_second_opened_template_id: secondOpenedNoDecisionTemplateId,

      smart_send_third_delay_hours: thirdDelayHours,
      smart_send_third_unopened_template_id: thirdUnopenedTemplateId,
      smart_send_third_opened_template_id: thirdOpenedNoDecisionTemplateId,
    })
    .eq("id", employerId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}