import { NextResponse } from "next/server";

export const runtime = "nodejs";

function cookieSecureFlag() {
  return process.env.NODE_ENV === "production" ? "; Secure" : "";
}

function clearCookie(res: NextResponse, name: string) {
  res.headers.append(
    "Set-Cookie",
    `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${cookieSecureFlag()}`
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const returnTo = url.searchParams.get("returnTo") || "/login";

  const res = NextResponse.redirect(new URL(returnTo, req.url));

  // ✅ Clear your app sessions
  clearCookie(res, "rrs_hr_session");
  clearCookie(res, "rrs_admin_session"); // harmless if you don't use it yet

  // ✅ Clear OAuth helper cookies (also harmless if missing)
  clearCookie(res, "rrs_oauth_return_to");
  clearCookie(res, "rrs_oauth_flow");
  clearCookie(res, "rrs_oauth_role");
  clearCookie(res, "rrs_oauth_employer_id");

  return res;
}