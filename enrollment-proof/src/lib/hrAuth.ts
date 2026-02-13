import { supabaseServer } from "@/lib/supabaseServer";

/**
 * HR Auth helper for Server Components + Route Handlers.
 * Reads the HttpOnly cookie `rrs_hr_session`, validates it against `hr_sessions`,
 * and returns the HR user + their employer access list.
 *
 * Tables expected:
 * - hr_users(id, email, created_at, display_name?)
 * - hr_sessions(id, hr_user_id, session_token, created_at, expires_at)
 * - hr_user_employers(id, hr_user_id, employer_id, created_at)
 */

export type HrUser = {
  id: string;
  email: string;
  display_name?: string | null;
};

export type HrSession = {
  id: string;
  hr_user_id: string;
  session_token: string;
  expires_at: string;
};

export type HrAuthContext = {
  user: HrUser;
  session: HrSession;
  employerIds: string[];
};

/** Parse cookies from a Request header string */
function readCookieFromHeader(cookieHeader: string | null, name: string) {
  const cookie = cookieHeader || "";
  const parts = cookie.split(";").map((p) => p.trim());
  const hit = parts.find((p) => p.startsWith(`${name}=`));
  if (!hit) return null;
  return decodeURIComponent(hit.split("=").slice(1).join("="));
}

/**
 * Use this inside Route Handlers:
 *   const auth = await getHrAuthFromRequest(req);
 */
export async function getHrAuthFromRequest(req: Request): Promise<HrAuthContext | null> {
  const token = readCookieFromHeader(req.headers.get("cookie"), "rrs_hr_session");
  if (!token) return null;
  return await getHrAuthFromSessionToken(token);
}

/**
 * Use this inside Server Components:
 *   const auth = await getHrAuthFromCookies(headers().get("cookie") ?? "");
 *
 * (Pass in the cookie string you already have.)
 */
export async function getHrAuthFromCookieString(cookieHeader: string): Promise<HrAuthContext | null> {
  const token = readCookieFromHeader(cookieHeader, "rrs_hr_session");
  if (!token) return null;
  return await getHrAuthFromSessionToken(token);
}

/**
 * Core validator:
 * - session exists
 * - not expired
 * - user exists
 * - load employer access list
 */
export async function getHrAuthFromSessionToken(sessionToken: string): Promise<HrAuthContext | null> {
  const nowIso = new Date().toISOString();

  // 1) Find session
  const { data: sess, error: sessErr } = await supabaseServer
    .from("hr_sessions")
    .select("id, hr_user_id, session_token, expires_at")
    .eq("session_token", sessionToken)
    .maybeSingle();

  if (sessErr || !sess) return null;

  // 2) Validate expiration
  const expiresAt = String((sess as any).expires_at || "");
  if (!expiresAt || expiresAt <= nowIso) return null;

  // 3) Load user
  // If you did NOT add display_name column, Supabase will ignore it if not selected.
  const { data: user, error: userErr } = await supabaseServer
    .from("hr_users")
    .select("id, email, display_name")
    .eq("id", (sess as any).hr_user_id)
    .maybeSingle();

  if (userErr || !user) return null;

  // 4) Load employer access
  const { data: links, error: linkErr } = await supabaseServer
    .from("hr_user_employers")
    .select("employer_id")
    .eq("hr_user_id", (user as any).id);

  if (linkErr) return null;

  const employerIds = (links ?? []).map((r: any) => String(r.employer_id)).filter(Boolean);

  return {
    user: {
      id: String((user as any).id),
      email: String((user as any).email),
      display_name: (user as any).display_name ?? null,
    },
    session: {
      id: String((sess as any).id),
      hr_user_id: String((sess as any).hr_user_id),
      session_token: String((sess as any).session_token),
      expires_at: String((sess as any).expires_at),
    },
    employerIds,
  };
}

/**
 * Convenience guard: call this and throw if not logged in.
 * Great for server pages like /hr
 */
export async function requireHrAuthFromRequest(req: Request): Promise<HrAuthContext> {
  const auth = await getHrAuthFromRequest(req);
  if (!auth) throw new Error("HR session required");
  return auth;
}

/**
 * Helper: attach an employer to an HR user (invite flow)
 */
export async function grantHrUserEmployerAccess(opts: {
  hrUserId: string;
  employerId: string;
}) {
  const { error } = await supabaseServer.from("hr_user_employers").insert({
    hr_user_id: opts.hrUserId,
    employer_id: opts.employerId,
  });

  if (error) throw new Error(error.message);
}