import { NextResponse } from "next/server";

export const runtime = "nodejs";

function cookieSecureFlag() {
  return process.env.NODE_ENV === "production" ? "; Secure" : "";
}

function buildMicrosoftAuthUrl() {
  // ✅ Multi-tenant (same approach as /login)
  // Allows ANY Entra ID (work/school) tenant to connect.
  const tenant = (process.env.MICROSOFT_TENANT || "organizations").trim();

  // ✅ Scopes needed for "send from company email"
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

  return `https://login.microsoftonline.com/${encodeURIComponent(
    tenant
  )}/oauth2/v2.0/authorize?${params.toString()}`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  // Where to send them after callback completes
  const returnTo = url.searchParams.get("returnTo") || "/hr";

  // Which employer they’re connecting email for
  const employerId = url.searchParams.get("employerId") || "";

  const res = NextResponse.redirect(buildMicrosoftAuthUrl());

  // Persist return destination
  res.headers.append(
    "Set-Cookie",
    `rrs_oauth_return_to=${encodeURIComponent(
      returnTo
    )}; Path=/; HttpOnly; SameSite=Lax${cookieSecureFlag()}`
  );

  // ✅ mark flow as MICROSOFT EMAIL SENDER CONNECT (Graph)
  // Your callback MUST branch on this to save tokens into public.microsoft_accounts
  res.headers.append(
    "Set-Cookie",
    `rrs_oauth_flow=ms_email_sender; Path=/; HttpOnly; SameSite=Lax${cookieSecureFlag()}`
  );

  // Persist employer id so callback can store tokens under correct employer
  if (employerId) {
    res.headers.append(
      "Set-Cookie",
      `rrs_oauth_employer_id=${encodeURIComponent(
        employerId
      )}; Path=/; HttpOnly; SameSite=Lax${cookieSecureFlag()}`
    );
  }

  return res;
}