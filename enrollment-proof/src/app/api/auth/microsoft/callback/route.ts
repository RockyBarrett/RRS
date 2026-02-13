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

async function refreshMsAccessToken(refreshToken: string) {
  const tenant = process.env.MICROSOFT_TENANT_ID!;
  const res = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      scope: "https://graph.microsoft.com/.default",
    }),
  });
}
