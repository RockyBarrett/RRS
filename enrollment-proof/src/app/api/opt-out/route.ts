import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

    const now = new Date().toISOString();

    const { data: employee, error: findError } = await supabaseServer
      .from("employees")
      .select("id, employer_id, opted_out_at")
      .eq("token", token)
      .maybeSingle();

    if (findError || !employee) throw new Error("Employee not found");

    // ✅ Always record election = opt_out
    // Only set opted_out_at the first time (keeps original timestamp)
    const updatePayload: Record<string, any> = { election: "opt_out" };
    if (!employee.opted_out_at) {
      updatePayload.opted_out_at = now;
    }

    const { error: updateError } = await supabaseServer
      .from("employees")
      .update(updatePayload)
      .eq("id", employee.id);

    if (updateError) throw updateError;

    const { error: eventError } = await supabaseServer.from("events").insert({
      employee_id: employee.id,
      employer_id: employee.employer_id,
      event_type: "opt_out",
      created_at: now,
    });

    if (eventError) throw eventError;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Opt-out failed" }, { status: 500 });
  }
}