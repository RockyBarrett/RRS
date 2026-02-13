import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

function normEmail(v: any) {
  return String(v || "").trim().toLowerCase();
}

async function fetchAssignments(employerId: string) {
  const { data: links, error: linkErr } = await supabaseServer
    .from("hr_user_employers")
    .select("id, hr_user_id")
    .eq("employer_id", employerId)
    .order("created_at", { ascending: false });

  if (linkErr) throw new Error(linkErr.message);

  const hrUserIds = (links ?? []).map((x: any) => String(x.hr_user_id)).filter(Boolean);

  const emailMap = new Map<string, string>();
  if (hrUserIds.length > 0) {
    const { data: hrs, error: hrErr } = await supabaseServer
      .from("hr_users")
      .select("id, email")
      .in("id", hrUserIds);

    if (hrErr) throw new Error(hrErr.message);
    for (const u of hrs ?? []) {
      emailMap.set(String((u as any).id), String((u as any).email || ""));
    }
  }

  return (links ?? []).map((a: any) => ({
    id: String(a.id),
    hr_user_id: String(a.hr_user_id),
    email: emailMap.get(String(a.hr_user_id)) || null,
  }));
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: employerId } = await ctx.params;

  const body = await req.json().catch(() => ({} as any));
  const email = normEmail(body?.email);

  if (!email || !email.includes("@")) {
    return Response.json({ error: "Invalid email" }, { status: 400 });
  }

  // Ensure hr_user exists
  const { data: hrUser, error: hrErr } = await supabaseServer
    .from("hr_users")
    .upsert({ email }, { onConflict: "email" })
    .select("id, email")
    .single();

  if (hrErr || !hrUser) {
    return Response.json({ error: hrErr?.message || "Failed to upsert hr_user" }, { status: 500 });
  }

  // Create association (avoid duplicates by checking first)
  const { data: existing, error: exErr } = await supabaseServer
    .from("hr_user_employers")
    .select("id")
    .eq("hr_user_id", hrUser.id)
    .eq("employer_id", employerId)
    .maybeSingle();

  if (exErr) {
    return Response.json({ error: exErr.message }, { status: 500 });
  }

  if (!existing?.id) {
    const { error: insErr } = await supabaseServer
      .from("hr_user_employers")
      .insert({ hr_user_id: hrUser.id, employer_id: employerId });

    if (insErr) {
      return Response.json({ error: insErr.message }, { status: 500 });
    }
  }

  const assignments = await fetchAssignments(employerId);
  return Response.json({ ok: true, assignments });
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: employerId } = await ctx.params;

  const body = await req.json().catch(() => ({} as any));
  const hr_user_id = String(body?.hr_user_id || "").trim();

  if (!hr_user_id) {
    return Response.json({ error: "Missing hr_user_id" }, { status: 400 });
  }

  const { error } = await supabaseServer
    .from("hr_user_employers")
    .delete()
    .eq("employer_id", employerId)
    .eq("hr_user_id", hr_user_id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const assignments = await fetchAssignments(employerId);
  return Response.json({ ok: true, assignments });
}