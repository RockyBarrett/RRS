// /src/app/api/auth/microsoft/callback/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import crypto from "crypto";

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

function cookieSecureFlag() {
  return process.env.NODE_ENV === "production" ? "; Secure" : "";
}

function getCookie(req: Request, name: string) {
  const cookie = req.headers.get("cookie") || "";
  const parts = cookie.split(";").map((p) => p.trim());
  const hit = parts.find((p) => p.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.split("=").slice(1).join("=")) : null;
}

function clearCookie(res: NextResponse, name: string) {
  res.headers.append(
    "Set-Cookie",
    `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${cookieSecureFlag()}`
  );
}

function safeReturnTo(path: string) {
  if (!path.startsWith("/")) return "/login";
  if (path.startsWith("//")) return "/login";
  return path;
}

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function isoFromExpiresIn(expiresInSeconds: number | undefined) {
  const ms = Math.max(0, Number(expiresInSeconds || 0)) * 1000;
  return new Date(Date.now() + ms).toISOString();
}

function makeSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

async function getHrUserIdFromSession(req: Request) {
  const token = getCookie(req, "rrs_hr_session");
  if (!token) return null;

  const { data } = await supabaseServer
    .from("hr_sessions")
    .select("hr_user_id, expires_at")
    .eq("session_token", token)
    .maybeSingle();

  if (!data?.hr_user_id) return null;

  const exp = new Date(String((data as any).expires_at || "")).getTime();
  if (exp && Date.now() > exp) return null;

  return String((data as any).hr_user_id);
}

async function getAdminUserIdFromSession(req: Request) {
  const token = getCookie(req, "rrs_admin_session");
  if (!token) return null;

  const { data } = await supabaseServer
    .from("admin_sessions")
    .select("admin_user_id, expires_at")
    .eq("session_token", token)
    .maybeSingle();

  if (!data?.admin_user_id) return null;

  const exp = new Date(String((data as any).expires_at || "")).getTime();
  if (exp && Date.now() > exp) return null;

  return String((data as any).admin_user_id);
}

async function exchangeMicrosoftCodeForToken(code: string, redirectUri: string) {
  // ✅ match /login + /connect: multi-tenant by default
  const tenant = (process.env.MICROSOFT_TENANT || "organizations").trim();

  const client_id = mustEnv("MICROSOFT_CLIENT_ID");
  const client_secret = mustEnv("MICROSOFT_CLIENT_SECRET");

  const res = await fetch(
    `https://login.microsoftonline.com/${encodeURIComponent(
      tenant
    )}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id,
        client_secret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        // ✅ IMPORTANT: do NOT pass scope here.
        // Microsoft will issue tokens for the scopes granted during /authorize
        // (i.e., /login vs /connect).
      }),
    }
  );

  const data = (await res.json().catch(() => ({} as any))) as TokenResponse;

  if (!res.ok || data.error) {
    throw new Error(
      data.error_description || data.error || `Token exchange failed (${res.status})`
    );
  }
  if (!data.access_token) throw new Error("Token exchange missing access_token");

  return data;
}

async function fetchMicrosoftProfile(accessToken: string) {
  const res = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const json = await res.json().catch(() => ({} as any));
  if (!res.ok) {
    throw new Error(json?.error?.message || "Failed to fetch Microsoft profile");
  }

  const email =
    (json?.mail as string | undefined) ||
    (json?.userPrincipalName as string | undefined) ||
    "";

  const displayName = (json?.displayName as string | undefined) || null;

  return {
    email: String(email).trim().toLowerCase(),
    name: displayName ? String(displayName).trim() : null,
  };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    // Read flow + context early so even OAuth errors can return properly
    const rawFlow = (getCookie(req, "rrs_oauth_flow") || "ms_login").toLowerCase();

    // ✅ Treat "ms_email_sender" as the employer sender-connect flow
    const flow = rawFlow === "ms_email_sender" ? "ms_employer" : rawFlow;

    const returnToCookie = getCookie(req, "rrs_oauth_return_to");
    const defaultReturnTo =
      flow === "ms_admin" ? "/admin" : flow === "ms_employer" ? "/hr" : "/login";
    const returnTo = safeReturnTo(returnToCookie || defaultReturnTo);

    const employerId = getCookie(req, "rrs_oauth_employer_id"); // required for ms_employer sender connect

    // If Microsoft sent an OAuth error (user canceled OR admin approval required)
    const oauthErr = url.searchParams.get("error");
    const oauthErrDesc = url.searchParams.get("error_description");
    if (oauthErr) {
      // ✅ For sender connect flows, go back to employer page with "pending/error" indicator
      if (flow === "ms_employer") {
        const to = new URL(returnTo, url.origin);

        // If they hit "Return to app without granting consent" or admin approval is required,
        // the best UX is "pending approval" with a hint.
        to.searchParams.set("ms_sender_status", "pending");
        if (oauthErr) to.searchParams.set("ms_error", oauthErr);
        if (oauthErrDesc) to.searchParams.set("ms_error_description", oauthErrDesc);

        const res = NextResponse.redirect(to);
        clearCookie(res, "rrs_oauth_return_to");
        clearCookie(res, "rrs_oauth_flow");
        clearCookie(res, "rrs_oauth_employer_id");
        return res;
      }

      // For login/admin flows, keep your existing behavior (send to login with error)
      const to = new URL("/login", url.origin);
      to.searchParams.set("error", oauthErr);
      if (oauthErrDesc) to.searchParams.set("error_description", oauthErrDesc);
      return NextResponse.redirect(to);
    }

    const code = url.searchParams.get("code");
    if (!code) {
      // Same: sender connect should go back with a visible error
      if (flow === "ms_employer") {
        const to = new URL(returnTo, url.origin);
        to.searchParams.set("ms_sender_status", "pending");
        to.searchParams.set("ms_error", "missing_code");
        const res = NextResponse.redirect(to);
        clearCookie(res, "rrs_oauth_return_to");
        clearCookie(res, "rrs_oauth_flow");
        clearCookie(res, "rrs_oauth_employer_id");
        return res;
      }

      const to = new URL("/login", url.origin);
      to.searchParams.set("error", "missing_code");
      return NextResponse.redirect(to);
    }

    const redirectUri =
      process.env.MICROSOFT_REDIRECT_URI || `${url.origin}/api/auth/microsoft/callback`;

    const tokens = await exchangeMicrosoftCodeForToken(code, redirectUri);
    const profile = await fetchMicrosoftProfile(String(tokens.access_token));
    if (!profile.email) {
      throw new Error("Microsoft profile missing email (mail/userPrincipalName).");
    }

    const expiresAt = isoFromExpiresIn(tokens.expires_in);

    // ----------------------------
    // MS EMPLOYER FLOW (HR only)  (includes ms_email_sender)
    // ----------------------------
    if (flow === "ms_employer") {
      const hrUserId = await getHrUserIdFromSession(req);
     if (!hrUserId) {
  const to = new URL(returnTo, url.origin);
  to.searchParams.set("ms_sender_status", "pending");
  to.searchParams.set("ms_error", "hr_session_required");
  to.searchParams.set(
    "ms_error_description",
    "Your Flow session cookie was not available during Microsoft connect. This is usually caused by a domain mismatch (www vs non-www or a different redirect URL)."
  );

  const res = NextResponse.redirect(to);
  clearCookie(res, "rrs_oauth_return_to");
  clearCookie(res, "rrs_oauth_flow");
  clearCookie(res, "rrs_oauth_employer_id");
  return res;
}
      if (!employerId) {
        const to = new URL(returnTo, url.origin);
        to.searchParams.set("ms_sender_status", "pending");
        to.searchParams.set("ms_error", "missing_employer_context");
        return NextResponse.redirect(to);
      }

      // Preserve refresh token if not returned (Microsoft sometimes omits)
      const { data: existing } = await supabaseServer
        .from("microsoft_accounts")
        .select("refresh_token")
        .eq("user_email", profile.email)
        .eq("employer_id", employerId)
        .maybeSingle();

      const refreshToStore =
        (tokens.refresh_token && String(tokens.refresh_token).trim()) ||
        (existing?.refresh_token ? String((existing as any).refresh_token) : null);

      if (!refreshToStore) {
        const to = new URL(returnTo, url.origin);
        to.searchParams.set("ms_sender_status", "pending");
        to.searchParams.set(
          "ms_error",
          "missing_refresh_token"
        );
        const res = NextResponse.redirect(to);
        clearCookie(res, "rrs_oauth_return_to");
        clearCookie(res, "rrs_oauth_flow");
        clearCookie(res, "rrs_oauth_employer_id");
        return res;
      }

      // ✅ NOTE: removed connected_by_hr_user_id to avoid schema mismatch errors
      const { error: upErr } = await supabaseServer
        .from("microsoft_accounts")
        .upsert(
          {
            user_email: profile.email,
            access_token: tokens.access_token,
            refresh_token: refreshToStore,
            expires_at: expiresAt,
            scope: tokens.scope ? String(tokens.scope) : null,
            status: "approved",
            employer_id: employerId,
          },
          { onConflict: "user_email,employer_id" }
        );

      if (upErr) throw new Error(upErr.message);

      const to = new URL(returnTo, url.origin);
      to.searchParams.set("ms_sender_status", "approved");
      to.searchParams.set("ms_sender_email", profile.email);

      const res = NextResponse.redirect(to);
      clearCookie(res, "rrs_oauth_return_to");
      clearCookie(res, "rrs_oauth_flow");
      clearCookie(res, "rrs_oauth_employer_id");
      return res;
    }

    // ----------------------------
    // MS ADMIN FLOW (Admin only)
    // ----------------------------
    if (flow === "ms_admin") {
      const adminUserId = await getAdminUserIdFromSession(req);
      if (!adminUserId) {
        return NextResponse.json(
          { error: "Admin session required to connect admin sender." },
          { status: 401 }
        );
      }

      const { data: existing } = await supabaseServer
        .from("microsoft_accounts")
        .select("refresh_token")
        .eq("user_email", profile.email)
        .is("employer_id", null)
        .maybeSingle();

      const refreshToStore =
        (tokens.refresh_token && String(tokens.refresh_token).trim()) ||
        (existing?.refresh_token ? String((existing as any).refresh_token) : null);

      if (!refreshToStore) {
        return NextResponse.json(
          {
            error:
              "Microsoft did not return refresh_token. Reconnect and ensure offline_access scope.",
          },
          { status: 400 }
        );
      }

      // ✅ NOTE: removed connected_by_admin_user_id to avoid schema mismatch errors
      const { error: upErr } = await supabaseServer
        .from("microsoft_accounts")
        .upsert(
          {
            user_email: profile.email,
            access_token: tokens.access_token,
            refresh_token: refreshToStore,
            expires_at: expiresAt,
            scope: tokens.scope ? String(tokens.scope) : null,
            status: "approved",
            employer_id: null,
          },
          { onConflict: "user_email" }
        );

      if (upErr) throw new Error(upErr.message);

      const to = new URL(returnTo, url.origin);
      to.searchParams.set("ms_sender_status", "approved");
      to.searchParams.set("ms_sender_email", profile.email);

      const res = NextResponse.redirect(to);
      clearCookie(res, "rrs_oauth_return_to");
      clearCookie(res, "rrs_oauth_flow");
      return res;
    }

    // ----------------------------
    // MS LOGIN FLOW (Admin or HR)
    // ----------------------------

    const email = profile.email;

    const { data: adminRow } = await supabaseServer
      .from("admin_users")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    const isAdmin = !!adminRow;

    if (isAdmin) {
      const adminSessionToken = makeSessionToken();
      const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);

      const { error: adminSessErr } = await supabaseServer.from("admin_sessions").insert({
        admin_user_id: (adminRow as any).id,
        session_token: adminSessionToken,
        expires_at: expires.toISOString(),
      });

      if (adminSessErr) throw new Error(adminSessErr.message);

      const res = NextResponse.redirect(new URL("/admin", url.origin));

      res.headers.append(
        "Set-Cookie",
        `rrs_admin_session=${encodeURIComponent(
          adminSessionToken
        )}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${
          60 * 60 * 24 * 14
        }${cookieSecureFlag()}`
      );

      clearCookie(res, "rrs_oauth_return_to");
      clearCookie(res, "rrs_oauth_flow");
      clearCookie(res, "rrs_oauth_employer_id");
      return res;
    }

    const { data: hrUser, error: hrErr } = await supabaseServer
      .from("hr_users")
      .upsert({ email, display_name: profile.name }, { onConflict: "email" })
      .select("id, email")
      .single();

    if (hrErr || !hrUser) throw new Error(hrErr?.message || "Failed to create HR user");

    const sessionToken = makeSessionToken();
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);

    const { error: sessErr } = await supabaseServer.from("hr_sessions").insert({
      hr_user_id: hrUser.id,
      session_token: sessionToken,
      expires_at: expires.toISOString(),
    });

    if (sessErr) throw new Error(sessErr.message);

    const res = NextResponse.redirect(new URL("/hr", url.origin));

    res.headers.append(
      "Set-Cookie",
      `rrs_hr_session=${encodeURIComponent(
        sessionToken
      )}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${
        60 * 60 * 24 * 14
      }${cookieSecureFlag()}`
    );

    clearCookie(res, "rrs_oauth_return_to");
    clearCookie(res, "rrs_oauth_flow");
    clearCookie(res, "rrs_oauth_employer_id");
    return res;
  } catch (err: any) {
    const to = new URL("/login", new URL(req.url).origin);
    to.searchParams.set("error", "microsoft_callback_failed");
    to.searchParams.set("message", err?.message || "Unknown error");
    return NextResponse.redirect(to);
  }
}
