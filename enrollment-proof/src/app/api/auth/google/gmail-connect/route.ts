import { NextResponse } from "next/server";

export const runtime = "nodejs";

function cookieSecureFlag() {
  return process.env.NODE_ENV === "production" ? "; Secure" : "";
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  const returnTo = url.searchParams.get("returnTo") || "/hr";
  const employerId = url.searchParams.get("employerId") || "";

  const res = NextResponse.redirect(buildGoogleAuthUrl());

  // where to send the user after callback
  res.headers.append(
    "Set-Cookie",
    `rrs_oauth_return_to=${encodeURIComponent(returnTo)}; Path=/; HttpOnly; SameSite=Lax${cookieSecureFlag()}`
  );

  // flow marker (employer-scoped)
  res.headers.append(
    "Set-Cookie",
    `rrs_oauth_flow=gmail_employer; Path=/; HttpOnly; SameSite=Lax${cookieSecureFlag()}`
  );

  // employer context so callback can set employers.sender_email
  if (employerId) {
    res.headers.append(
      "Set-Cookie",
      `rrs_oauth_employer_id=${encodeURIComponent(employerId)}; Path=/; HttpOnly; SameSite=Lax${cookieSecureFlag()}`
    );
  }

  return res;
}

function buildGoogleAuthUrl() {
  const scope = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/gmail.send",
  ].join(" ");

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
    response_type: "code",
    scope,
    access_type: "offline",
    prompt: "consent",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}