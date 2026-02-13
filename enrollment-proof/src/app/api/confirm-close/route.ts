import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const now = new Date().toISOString();

    // 1️⃣ Get employee first (so we have employee_id + employer_id)
    const { data: employee, error: findError } = await supabaseServer
      .from("employees")
      .select("id, employer_id")
      .eq("token", token)
      .maybeSingle();

    if (findError || !employee) {
      throw new Error("Employee not found");
    }

    // 2️⃣ Update confirm_closed_at timestamp (only if not already set)
    const { error: updateError } = await supabaseServer
      .from("employees")
      .update({ confirm_closed_at: now })
      .eq("id", employee.id)
      .is("confirm_closed_at", null); // prevents overwriting original timestamp

    if (updateError) throw updateError;

    // 3️⃣ Insert event log
    const { error: eventError } = await supabaseServer
      .from("events")
      .insert({
        employee_id: employee.id,
        employer_id: employee.employer_id,
        event_type: "confirm_closed",
        created_at: now,
      });

    if (eventError) throw eventError;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to record confirm close" },
      { status: 500 }
    );
  }
}