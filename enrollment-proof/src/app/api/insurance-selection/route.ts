import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  try {
    const { token, selection } = await req.json();

    if (!token || !selection) {
      return NextResponse.json({ error: "Missing token/selection" }, { status: 400 });
    }

    if (selection !== "yes" && selection !== "no") {
      return NextResponse.json({ error: "Invalid selection" }, { status: 400 });
    }

    const now = new Date().toISOString();

    const { data: employee, error: findError } = await supabaseServer
      .from("employees")
      .select("id, employer_id")
      .eq("token", token)
      .maybeSingle();

    if (findError || !employee) throw new Error("Employee not found");

    // Always update selection + selected_at (this can change if they toggle back)
    const { error: updateError } = await supabaseServer
      .from("employees")
      .update({
        insurance_selection: selection,
        insurance_selected_at: now,
      })
      .eq("id", employee.id);

    if (updateError) throw updateError;

    const { error: eventError } = await supabaseServer.from("events").insert({
      employee_id: employee.id,
      employer_id: employee.employer_id,
      event_type: selection === "yes" ? "insurance_yes" : "insurance_no",
      created_at: now,
    });

    if (eventError) throw eventError;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to record insurance selection" },
      { status: 500 }
    );
  }
}