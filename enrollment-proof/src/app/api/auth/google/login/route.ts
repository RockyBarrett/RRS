import { NextResponse } from "next/server";

export const runtime = "nodejs";

function cookieSecureFlag() {
  return process.env.NODE_ENV === "production" ? "; Secure" : "";
}

function safeReturnTo(path: string) {
  if (!path.startsWith("/")) return "/login";
  if (path.startsWith("//")) return "/login";
  return path;
}

function buildGoogleAuthUrl() {
  const scope = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    // NOTE: login does NOT need gmail.send
  ].join(" ");

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI!, // your callback
    response_type: "code",
    scope,
    access_type: "offline",
    prompt: "consent",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  const role = (url.searchParams.get("role") || "hr").toLowerCase();
  const returnToRaw =
    url.searchParams.get("returnTo") ||
    (role === "admin" ? "/admin" : "/hr");

  const returnTo = safeReturnTo(returnToRaw);

  const res = NextResponse.redirect(buildGoogleAuthUrl());

  // Where to send user after callback
  res.headers.append(
    "Set-Cookie",
    `rrs_oauth_return_to=${encodeURIComponent(returnTo)}; Path=/; HttpOnly; SameSite=Lax${cookieSecureFlag()}`
  );

  // Tell callback this is a LOGIN flow (not gmail connect)
  res.headers.append(
    "Set-Cookie",
    `rrs_oauth_flow=login; Path=/; HttpOnly; SameSite=Lax${cookieSecureFlag()}`
  );

  // Optional: let callback know which role to create session for
  res.headers.append(
    "Set-Cookie",
    `rrs_oauth_role=${encodeURIComponent(role)}; Path=/; HttpOnly; SameSite=Lax${cookieSecureFlag()}`
  );

  return res;
}