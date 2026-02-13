import { NextResponse } from "next/server";

export const runtime = "nodejs";

function cookieSecureFlag() {
  return process.env.NODE_ENV === "production" ? "; Secure" : "";
}

function clearCookie(res: NextResponse, name: string) {
  res.headers.append("Set-Cookie", `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${cookieSecureFlag()}`);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const returnTo = url.searchParams.get("returnTo") || "/login";

  const res = NextResponse.redirect(new URL(returnTo, req.url));
  clearCookie(res, "rrs_oauth_return_to");
  clearCookie(res, "rrs_oauth_flow");
  clearCookie(res, "rrs_oauth_employer_id");
  clearCookie(res, "rrs_ms_oauth_state");
  return res;
}