import { NextResponse } from "next/server";

export const runtime = "nodejs";

function cookieSecureFlag() {
  return process.env.NODE_ENV === "production" ? "; Secure" : "";
}

function buildMicrosoftAuthUrl() {
  const tenant = process.env.MICROSOFT_TENANT_ID!;
  const scope = [
    "openid",
    "profile",
    "email",
    "offline_access",
    "User.Read",
    "Mail.Send",
  ].join(" ");

  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!,
    response_type: "code",
    redirect_uri: process.env.MICROSOFT_REDIRECT_URI!,
    response_mode: "query",
    scope,
    prompt: "select_account",
  });

  return `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/authorize?${params.toString()}`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const returnTo = url.searchParams.get("returnTo") || "/admin";

  const res = NextResponse.redirect(buildMicrosoftAuthUrl());

  res.headers.append(
    "Set-Cookie",
    `rrs_oauth_return_to=${encodeURIComponent(returnTo)}; Path=/; HttpOnly; SameSite=Lax${cookieSecureFlag()}`
  );

  res.headers.append(
    "Set-Cookie",
    `rrs_oauth_flow=ms_admin; Path=/; HttpOnly; SameSite=Lax${cookieSecureFlag()}`
  );

  return res;
}