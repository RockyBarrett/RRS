import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import crypto from "crypto";

export const runtime = "nodejs";

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
  if (!path.startsWith("/")) return "/hr";
  if (path.startsWith("//")) return "/hr";
  return path;
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

async function exchangeCodeForTokens(code: string) {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: "authorization_code",
    }),
  });

  const tokens = await tokenRes.json().catch(() => ({} as any));
  if (!tokenRes.ok) {
    throw new Error(tokens?.error_description || tokens?.error || "Token exchange failed");
  }
  if (!tokens.access_token) throw new Error("Missing access_token from Google token exchange.");

  return tokens as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string;
    token_type?: string;
    id_token?: string;
  };
}

async function fetchGoogleProfile(accessToken: string) {
  const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const profile = await profileRes.json().catch(() => ({} as any));
  if (!profileRes.ok || !profile.email) throw new Error("Failed to fetch Google profile email.");

  return {
    email: String(profile.email).trim().toLowerCase(),
    name: profile.name ? String(profile.name).trim() : null,
  };
}

async function updateThenInsertGmailAccount(
  where: { user_email: string; employer_id: string | null },
  patch: any
) {
  let q = supabaseServer
    .from("gmail_accounts")
    .update(patch)
    .eq("user_email", where.user_email);

  if (where.employer_id === null) q = q.is("employer_id", null);
  else q = q.eq("employer_id", where.employer_id);

  const { data: updated, error: updErr } = await q.select("id").maybeSingle();
  if (updErr) throw new Error(updErr.message);

  if (updated?.id) return;

  const { error: insErr } = await supabaseServer.from("gmail_accounts").insert({
    user_email: where.user_email,
    employer_id: where.employer_id,
    ...patch,
  });

  if (insErr) throw new Error(insErr.message);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });

    const flow = (getCookie(req, "rrs_oauth_flow") || "login").toLowerCase();

    const returnToCookie = getCookie(req, "rrs_oauth_return_to");
    const defaultReturnTo = flow.startsWith("gmail") ? "/admin" : "/hr";
    const returnTo = safeReturnTo(returnToCookie || defaultReturnTo);

    const employerIdCookie = getCookie(req, "rrs_oauth_employer_id");

    const tokens = await exchangeCodeForTokens(code);
    const profile = await fetchGoogleProfile(tokens.access_token);
    const email = String(profile.email || "").trim().toLowerCase();

    // Admin allowlist
    const { data: adminRow } = await supabaseServer
      .from("admin_users")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    const isAdmin = !!adminRow;

    const expiresAt = new Date(Date.now() + Number(tokens.expires_in || 0) * 1000).toISOString();
    const adminSystemEmail = String(process.env.ADMIN_SENDER_EMAIL || "").trim().toLowerCase();

    // ----------------------------
    // GMAIL EMPLOYER FLOW (HR only)
    // ----------------------------
    if (flow === "gmail_employer") {
      const hrUserId = await getHrUserIdFromSession(req);
      if (!hrUserId) {
        return NextResponse.json({ error: "HR session required to connect employer sender." }, { status: 401 });
      }

      const employerId = employerIdCookie ? String(employerIdCookie) : null;
      if (!employerId) {
        return NextResponse.json({ error: "Missing employer context for employer sender connect." }, { status: 400 });
      }

      // hard guard: HR can never connect the admin system email
      if (adminSystemEmail && email === adminSystemEmail) {
        return NextResponse.json(
          { error: "This email is reserved for Admin system sending and cannot be connected as an employer sender." },
          { status: 403 }
        );
      }

      // If sender already approved for this (email, employer) allow; otherwise mark pending and redirect
      const { data: existing } = await supabaseServer
        .from("gmail_accounts")
        .select("status")
        .eq("user_email", email)
        .eq("employer_id", employerId)
        .maybeSingle();

      if (existing?.status !== "approved") {
        await updateThenInsertGmailAccount(
          { user_email: email, employer_id: employerId },
          {
            status: "pending",
            requested_by_hr_user_id: hrUserId,
            connected_by_hr_user_id: hrUserId,
            scope: "https://www.googleapis.com/auth/gmail.send openid https://www.googleapis.com/auth/userinfo.email",
            access_token: null,
            refresh_token: null,
            expires_at: null,
          }
        );

        const redirectUrl = new URL(returnTo, req.url);
        redirectUrl.searchParams.set("gmail_sender_status", "pending");
        redirectUrl.searchParams.set("gmail_sender_email", email);

        const res = NextResponse.redirect(redirectUrl);
        clearCookie(res, "rrs_oauth_return_to");
        clearCookie(res, "rrs_oauth_flow");
        clearCookie(res, "rrs_oauth_employer_id");
        return res;
      }

      // approved: store/update tokens (never wipe refresh_token if missing)
      const { data: priorRow } = await supabaseServer
        .from("gmail_accounts")
        .select("refresh_token")
        .eq("user_email", email)
        .eq("employer_id", employerId)
        .maybeSingle();

      const refreshToStore =
        (tokens.refresh_token && String(tokens.refresh_token).trim()) ||
        (priorRow?.refresh_token ? String((priorRow as any).refresh_token) : null);

      if (!refreshToStore) {
        return NextResponse.json(
          { error: "Google did not return refresh_token. Remove app access then reconnect with prompt=consent." },
          { status: 400 }
        );
      }

      await updateThenInsertGmailAccount(
        { user_email: email, employer_id: employerId },
        {
          access_token: tokens.access_token,
          refresh_token: refreshToStore,
          expires_at: expiresAt,
          scope: String(tokens.scope || ""),
          status: "approved",
          connected_by_hr_user_id: hrUserId,
          requested_by_hr_user_id: hrUserId,
        }
      );

      // optionally set employers.sender_email for UI display (not relied on for auth)
      await supabaseServer.from("employers").update({ sender_email: email }).eq("id", employerId);

      const redirectUrl = new URL(returnTo, req.url);
      redirectUrl.searchParams.set("gmail_sender_status", "approved");
      redirectUrl.searchParams.set("gmail_sender_email", email);

      const res = NextResponse.redirect(redirectUrl);
      clearCookie(res, "rrs_oauth_return_to");
      clearCookie(res, "rrs_oauth_flow");
      clearCookie(res, "rrs_oauth_employer_id");
      return res;
    }

    // ----------------------------
    // GMAIL ADMIN/SYSTEM FLOW (Admin only)
    // ----------------------------
    if (flow === "gmail_admin") {
      if (!isAdmin) {
        const redirectUrl = new URL(returnTo, req.url);
        redirectUrl.searchParams.set("gmail_sender_status", "pending");
        redirectUrl.searchParams.set("gmail_sender_email", email);
        redirectUrl.searchParams.set("gmail_sender_note", "Not authorized to connect Admin System Gmail.");
        const res = NextResponse.redirect(redirectUrl);
        clearCookie(res, "rrs_oauth_return_to");
        clearCookie(res, "rrs_oauth_flow");
        return res;
      }

      const adminUserId = await getAdminUserIdFromSession(req);
      if (!adminUserId) {
        return NextResponse.json({ error: "Admin session required to connect admin sender." }, { status: 401 });
      }

      if (adminSystemEmail && email !== adminSystemEmail) {
        const redirectUrl = new URL(returnTo, req.url);
        redirectUrl.searchParams.set("gmail_sender_status", "pending");
        redirectUrl.searchParams.set("gmail_sender_email", email);
        redirectUrl.searchParams.set("gmail_sender_note", "This email is not the configured ADMIN_SENDER_EMAIL.");
        const res = NextResponse.redirect(redirectUrl);
        clearCookie(res, "rrs_oauth_return_to");
        clearCookie(res, "rrs_oauth_flow");
        return res;
      }

      const { data: priorRow } = await supabaseServer
        .from("gmail_accounts")
        .select("refresh_token")
        .eq("user_email", email)
        .is("employer_id", null)
        .maybeSingle();

      const refreshToStore =
        (tokens.refresh_token && String(tokens.refresh_token).trim()) ||
        (priorRow?.refresh_token ? String((priorRow as any).refresh_token) : null);

      if (!refreshToStore) {
        return NextResponse.json(
          { error: "Google did not return refresh_token. Remove app access then reconnect with prompt=consent." },
          { status: 400 }
        );
      }

      await updateThenInsertGmailAccount(
        { user_email: email, employer_id: null },
        {
          access_token: tokens.access_token,
          refresh_token: refreshToStore,
          expires_at: expiresAt,
          scope: String(tokens.scope || ""),
          status: "approved",
          connected_by_admin_user_id: adminUserId,
        }
      );

      const redirectUrl = new URL(returnTo, req.url);
      redirectUrl.searchParams.set("gmail_sender_status", "approved");
      redirectUrl.searchParams.set("gmail_sender_email", email);

      const res = NextResponse.redirect(redirectUrl);
      clearCookie(res, "rrs_oauth_return_to");
      clearCookie(res, "rrs_oauth_flow");
      return res;
    }

    // ----------------------------
    // LOGIN FLOW (Admin or HR)
    // ----------------------------
    if (isAdmin) {
      const adminSessionToken = makeSessionToken();
      const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);

      const { error: adminSessErr } = await supabaseServer.from("admin_sessions").insert({
        admin_user_id: (adminRow as any).id,
        session_token: adminSessionToken,
        expires_at: expires.toISOString(),
      });

      if (adminSessErr) return NextResponse.json({ error: adminSessErr.message }, { status: 500 });

      const res = NextResponse.redirect(new URL("/admin", req.url));
      res.headers.append(
        "Set-Cookie",
        `rrs_admin_session=${encodeURIComponent(adminSessionToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${
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
      .upsert({ email: profile.email, display_name: profile.name }, { onConflict: "email" })
      .select("id, email")
      .single();

    if (hrErr || !hrUser) {
      return NextResponse.json({ error: hrErr?.message || "Failed to create HR user" }, { status: 500 });
    }

    const sessionToken = makeSessionToken();
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);

    const { error: sessErr } = await supabaseServer.from("hr_sessions").insert({
      hr_user_id: hrUser.id,
      session_token: sessionToken,
      expires_at: expires.toISOString(),
    });

    if (sessErr) return NextResponse.json({ error: sessErr.message }, { status: 500 });

    const res = NextResponse.redirect(new URL("/hr", req.url));
    res.headers.append(
      "Set-Cookie",
      `rrs_hr_session=${encodeURIComponent(sessionToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${
        60 * 60 * 24 * 14
      }${cookieSecureFlag()}`
    );

    clearCookie(res, "rrs_oauth_return_to");
    clearCookie(res, "rrs_oauth_flow");
    clearCookie(res, "rrs_oauth_employer_id");
    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "OAuth callback failed" }, { status: 500 });
  }
}