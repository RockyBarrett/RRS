import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

type TokenResponse = {
  token_type?: string;
  scope?: string;
  expires_in?: number;
  ext_expires_in?: number;
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
};

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

async function exchangeMicrosoftCodeForToken(code: string, redirectUri: string) {
  const tenant = mustEnv("MICROSOFT_TENANT_ID");
  const client_id = mustEnv("MICROSOFT_CLIENT_ID");
  const client_secret = mustEnv("MICROSOFT_CLIENT_SECRET");

  const res = await fetch(
    `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id,
        client_secret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        // v2 requires scopes; match what you used in login:
        scope: "offline_access https://graph.microsoft.com/.default",
      }),
    }
  );

  const data = (await res.json()) as TokenResponse;

  if (!res.ok || data.error) {
    throw new Error(data.error_description || data.error || `Token exchange failed (${res.status})`);
  }
  if (!data.access_token) {
    throw new Error("Token exchange missing access_token");
  }
  return data;
}

/**
 * GET /api/auth/microsoft/callback
 * Next 16 expects params to be a Promise in dynamic segments, but this route has no params.
 */
export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl;

    const error = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");
    if (error) {
      const to = new URL("/login", url.origin);
      to.searchParams.set("error", error);
      if (errorDescription) to.searchParams.set("error_description", errorDescription);
      return NextResponse.redirect(to);
    }

    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state"); // if you use it

    if (!code) {
      const to = new URL("/login", url.origin);
      to.searchParams.set("error", "missing_code");
      return NextResponse.redirect(to);
    }

    // IMPORTANT: use your production redirect URI (matches env var)
    // If you have MICROSOFT_REDIRECT_URI set, use that; otherwise fall back to derived origin.
    const redirectUri =
      process.env.MICROSOFT_REDIRECT_URI || `${url.origin}/api/auth/microsoft/callback`;

    const token = await exchangeMicrosoftCodeForToken(code, redirectUri);

    // Store tokens in Supabase
    // ✅ Change these to match YOUR schema
    const sb = supabaseServer;

    // Example table name + columns (edit as needed):
    // table: microsoft_tokens
    // columns: access_token, refresh_token, expires_in, scope, token_type, updated_at
    //
    // If you link tokens to a user/session via "state", do it here.
    // For now we'll upsert a single row keyed by "state" if present, else a singleton key.
    const tokenKey = state || "default";

    const { error: upsertErr } = await sb
      .from("microsoft_tokens")
      .upsert(
        {
          key: tokenKey,
          access_token: token.access_token,
          refresh_token: token.refresh_token ?? null,
          expires_in: token.expires_in ?? null,
          scope: token.scope ?? null,
          token_type: token.token_type ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );

    if (upsertErr) {
      throw new Error(`Supabase upsert failed: ${upsertErr.message}`);
    }

    // Redirect somewhere sensible after connect
    const to = new URL("/admin", url.origin);
    to.searchParams.set("connected", "microsoft");
    return NextResponse.redirect(to);
  } catch (e: any) {
    const to = new URL("/login", request.nextUrl.origin);
    to.searchParams.set("error", "microsoft_callback_failed");
    to.searchParams.set("message", e?.message || "Unknown error");
    return NextResponse.redirect(to);
  }
}
