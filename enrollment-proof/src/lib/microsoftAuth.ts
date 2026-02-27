// /src/lib/microsoftAuth.ts
import { supabaseServer } from "@/lib/supabaseServer";

const MICROSOFT_TENANT = (process.env.MICROSOFT_TENANT || "organizations").trim();
export const MICROSOFT_TOKEN_URL = `https://login.microsoftonline.com/${encodeURIComponent(
  MICROSOFT_TENANT
)}/oauth2/v2.0/token`;

function requiredEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export function isoFromExpiresIn(expiresInSeconds: number) {
  const ms = Math.max(0, Number(expiresInSeconds || 0)) * 1000;
  return new Date(Date.now() + ms).toISOString();
}

export function isExpiredSoon(expiresAt: string | null | undefined, skewMs = 60_000) {
  if (!expiresAt) return true;
  const t = new Date(String(expiresAt)).getTime();
  if (Number.isNaN(t)) return true;
  return Date.now() > t - skewMs;
}

/**
 * Refresh Entra (work/school) access token using refresh_token
 */
export async function refreshMicrosoftAccessToken(refreshToken: string) {
  const client_id = requiredEnv("MICROSOFT_CLIENT_ID");
  const client_secret = requiredEnv("MICROSOFT_CLIENT_SECRET");

  const res = await fetch(MICROSOFT_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id,
      client_secret,
      grant_type: "refresh_token",
      refresh_token: String(refreshToken),

      // ✅ Keep this aligned with what your app actually needs.
      // For login-only: no Mail.Send
      scope: "openid profile email offline_access User.Read Mail.Send",
    }),
  });

  const json = await res.json().catch(() => ({} as any));
  if (!res.ok || !json.access_token) {
    throw new Error(json?.error_description || json?.error || "Failed to refresh Microsoft access token");
  }

  return {
    access_token: String(json.access_token),
    refresh_token: json.refresh_token ? String(json.refresh_token) : undefined, // sometimes rotated
    expires_in: Number(json.expires_in || 0),
    scope: json.scope ? String(json.scope) : undefined,
    token_type: json.token_type ? String(json.token_type) : "Bearer",
  };
}

/**
 * Ensure a Microsoft account row has a valid access token.
 * Updates microsoft_accounts if it refreshes (and supports refresh_token rotation).
 */
export async function ensureMicrosoftAccessToken(args: {
  userEmail: string;
  accessToken: string | null | undefined;
  refreshToken: string;
  expiresAt: string | null | undefined;
}) {
  const userEmail = String(args.userEmail || "").trim().toLowerCase();
  if (!userEmail) throw new Error("ensureMicrosoftAccessToken: missing userEmail");
  if (!args.refreshToken) throw new Error("ensureMicrosoftAccessToken: missing refreshToken");

  if (!args.accessToken || isExpiredSoon(args.expiresAt)) {
    const refreshed = await refreshMicrosoftAccessToken(args.refreshToken);

    const nextExpiresAt = isoFromExpiresIn(refreshed.expires_in);
    const nextRefreshToken = refreshed.refresh_token || args.refreshToken;

    const { error } = await supabaseServer
      .from("microsoft_accounts")
      .update({
        access_token: refreshed.access_token,
        refresh_token: nextRefreshToken,
        expires_at: nextExpiresAt,
        scope: refreshed.scope || null,
      })
      .eq("user_email", userEmail);

    if (error) {
      throw new Error(`Failed to persist refreshed Microsoft token: ${error.message}`);
    }

    return { access_token: refreshed.access_token, expires_at: nextExpiresAt };
  }

  return { access_token: String(args.accessToken), expires_at: String(args.expiresAt) };
}