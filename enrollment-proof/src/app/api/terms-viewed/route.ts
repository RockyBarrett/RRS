import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const now = new Date().toISOString();

    const { data: employee, error: findError } = await supabaseServer
      .from("employees")
      .select("id, employer_id, terms_viewed_at")
      .eq("token", token)
      .maybeSingle();

    if (findError || !employee) throw new Error("Employee not found");

    // Update first-time timestamp only
    if (!employee.terms_viewed_at) {
      const { error: updateError } = await supabaseServer
        .from("employees")
        .update({ terms_viewed_at: now })
        .eq("id", employee.id);

      if (updateError) throw updateError;
    }

    // Always log the event (you may want this even if already opened once)
    const { error: eventError } = await supabaseServer.from("events").insert({
      employee_id: employee.id,
      employer_id: employee.employer_id,
      event_type: "terms_viewed",
      created_at: now,
    });

    if (eventError) throw eventError;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to record terms view" },
      { status: 500 }
    );
  }
}