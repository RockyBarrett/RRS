import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

    const now = new Date().toISOString();

    const { data: employee, error: findError } = await supabaseServer
      .from("employees")
      .select("id, employer_id")
      .eq("token", token)
      .maybeSingle();

    if (findError || !employee) throw new Error("Employee not found");

    // ✅ NEW: record election = opt_in, and clear opted_out_at
    const { error: updateError } = await supabaseServer
      .from("employees")
      .update({ opted_out_at: null, election: "opt_in" })
      .eq("id", employee.id);

    if (updateError) throw updateError;

    const { error: eventError } = await supabaseServer.from("events").insert({
      employee_id: employee.id,
      employer_id: employee.employer_id,
      event_type: "opt_in",
      created_at: now,
    });

    if (eventError) throw eventError;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Opt-in failed" }, { status: 500 });
  }
}