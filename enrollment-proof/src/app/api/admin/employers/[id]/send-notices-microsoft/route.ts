import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

function isUUID(v: any) {
  return typeof v === "string" && /^[0-9a-fA-F-]{36}$/.test(v);
}

function b64url(input: string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

type MsTokenResponse = {
  token_type?: string;
  scope?: string;
  expires_in?: number;
  ext_expires_in?: number;
  access_token?: string;
  refresh_token?: string;
  error?: string;
  error_description?: string;
};

async function refreshMsAccessToken(refreshToken: string) {
  const tenant = process.env.MICROSOFT_TENANT_ID;
  const client_id = process.env.MICROSOFT_CLIENT_ID;
  const client_secret = process.env.MICROSOFT_CLIENT_SECRET;

  if (!tenant || !client_id || !client_secret) {
    throw new Error("Missing Microsoft env vars (MICROSOFT_TENANT_ID/CLIENT_ID/CLIENT_SECRET).");
  }

  const res = await fetch(
    `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id,
        client_secret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        scope: "https://graph.microsoft.com/.default",
      }),
    }
  );

  const data = (await res.json()) as MsTokenResponse;

  if (!res.ok || data.error) {
    throw new Error(data.error_description || data.error || `Microsoft token refresh failed (${res.status}).`);
  }

  if (!data.access_token) {
    throw new Error("Microsoft token refresh response missing access_token.");
  }

  return data;
}

/**
 * POST /api/admin/employers/[id]/send-notices-microsoft
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const employerId = params?.id;

    if (!isUUID(employerId)) {
      return NextResponse.json({ ok: false, error: "Invalid employer id" }, { status: 400 });
    }

    // Optional: parse request body (keep it flexible)
    let body: any = null;
    try {
      body = await req.json();
    } catch {
      // body optional
    }

    const sb = supabaseServer;

    // TODO: Replace with your actual table/column names.
    // Example placeholder query:
    // const { data: ms, error } = await sb
    //   .from("microsoft_tokens")
    //   .select("refresh_token")
    //   .eq("employer_id", employerId)
    //   .single();

    // For now, just return a safe response so the build passes and the endpoint exists.
    // Once deployed, we’ll wire the real send logic.
    return NextResponse.json({
      ok: true,
      employerId,
      message: "Endpoint deployed. Send logic to be wired next.",
      received: body,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
