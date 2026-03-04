import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

type Body = {
  token: string;
  reason: string;
  notes?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    if (!body?.token) {
      return NextResponse.json({ error: "token_required" }, { status: 400 });
    }
    if (!body?.reason || body.reason.trim().length < 2) {
      return NextResponse.json({ error: "reason_required" }, { status: 400 });
    }

    const supabase = supabaseServer;

    // Make sure token exists; update feedback fields
    const { data, error } = await supabase
      .from("employees")
      .update({
        opt_out_reason: body.reason.trim(),
        opt_out_notes: body.notes?.trim() || null,
        opt_out_feedback_at: new Date().toISOString(),
      })
      .eq("token", body.token)
      .select("id")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "employee_not_found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
}