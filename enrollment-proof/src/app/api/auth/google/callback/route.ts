import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import crypto from "crypto";

export const runtime = "nodejs";

function cookieSecureFlag() {
  return process.env.NODE_ENV === "production" ? "; Secure" : "";
}

/** Simple cookie reader (works in Route Handlers) */
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
  if (!tokenRes.ok) throw new Error(tokens?.error_description || tokens?.error || "Token exchange failed");
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

/**
 * Approval gate:
 * - If gmail_accounts.status is approved → OK
 * - Else: upsert gmail_accounts row as pending (no tokens stored yet) + redirect with pending flag
 */
async function handleGmailApprovalGate(args: {
  req: Request;
  returnTo: string;
  email: string;
  employerId?: string | null;
  requestedByHrUserId?: string | null;
}) {
  const { req, returnTo, email, employerId, requestedByHrUserId } = args;

  // If already approved in gmail_accounts, allow
  const { data: existing } = await supabaseServer
    .from("gmail_accounts")
    .select("id, status")
    .eq("user_email", email)
    .maybeSingle();

  if (existing?.status === "approved") return { approved: true as const };

  // Upsert a pending request row in gmail_accounts
  const { error: upErr } = await supabaseServer.from("gmail_accounts").upsert(
    {
      user_email: email,
      status: "pending",
      employer_id: employerId || null,
      requested_by_hr_user_id: requestedByHrUserId || null,
      // required non-null columns in your table:
      scope: "https://www.googleapis.com/auth/gmail.send openid https://www.googleapis.com/auth/userinfo.email",
      access_token: "PENDING",
      refresh_token: "PENDING",
      expires_at: new Date(0).toISOString(),
    },
    { onConflict: "user_email" }
  );

  if (upErr) console.warn("gmail_accounts pending upsert failed:", upErr.message);

  const redirectUrl = new URL(returnTo, req.url);
  redirectUrl.searchParams.set("gmail_sender_status", "pending");
  redirectUrl.searchParams.set("gmail_sender_email", email);

  const res = NextResponse.redirect(redirectUrl);

  clearCookie(res, "rrs_oauth_return_to");
  clearCookie(res, "rrs_oauth_flow");
  clearCookie(res, "rrs_oauth_employer_id");

  return { approved: false as const, res };
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

    const employerId = getCookie(req, "rrs_oauth_employer_id"); // only set for gmail_employer
    const tokens = await exchangeCodeForTokens(code);
    const profile = await fetchGoogleProfile(tokens.access_token);

    const email = String(profile.email || "").trim().toLowerCase();

    // ✅ admin allowlist check (hard gate)
    const { data: adminRow, error: adminErr } = await supabaseServer
      .from("admin_users")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    if (adminErr) console.warn("admin_users lookup failed:", adminErr.message);

    const isAdmin = !!adminRow;

    const expiresAt = new Date(Date.now() + Number(tokens.expires_in || 0) * 1000).toISOString();
    const adminSystemEmail = String(process.env.ADMIN_SENDER_EMAIL || "").trim().toLowerCase();

    // ----------------------------
    // GMAIL EMPLOYER FLOW
    // ----------------------------
    if (flow === "gmail_employer") {
      const gate = await handleGmailApprovalGate({
        req,
        returnTo,
        email: profile.email,
        employerId,
        requestedByHrUserId: null, // optional (later)
      });
      if (!gate.approved) return gate.res;

      // approved → store/update tokens
      const { data: existing, error: exErr } = await supabaseServer
        .from("gmail_accounts")
        .select("user_email, refresh_token")
        .eq("user_email", profile.email)
        .maybeSingle();

      if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 });

      const refreshToStore =
        (tokens.refresh_token && String(tokens.refresh_token).trim()) ||
        (existing?.refresh_token ? String((existing as any).refresh_token) : null);

      if (!refreshToStore) {
        return NextResponse.json(
          { error: "Google did not return refresh_token. Remove app access then reconnect with prompt=consent." },
          { status: 400 }
        );
      }

      const { error: upErr } = await supabaseServer
        .from("gmail_accounts")
        .upsert(
          {
            user_email: profile.email,
            access_token: tokens.access_token,
            refresh_token: refreshToStore,
            expires_at: expiresAt,
            scope: String(tokens.scope || ""),
            status: "approved",
            employer_id: employerId || null,
          },
          { onConflict: "user_email" }
        );

      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

      // set employer sender email (employer-scoped)
      if (employerId) {
        const { error: updErr } = await supabaseServer
          .from("employers")
          .update({ sender_email: profile.email })
          .eq("id", employerId);

        if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
      }

      const redirectUrl = new URL(returnTo, req.url);
      redirectUrl.searchParams.set("gmail_sender_status", "approved");
      redirectUrl.searchParams.set("gmail_sender_email", profile.email);

      const res = NextResponse.redirect(redirectUrl);
      clearCookie(res, "rrs_oauth_return_to");
      clearCookie(res, "rrs_oauth_flow");
      clearCookie(res, "rrs_oauth_employer_id");
      return res;
    }

    // ----------------------------
    // GMAIL ADMIN/SYSTEM FLOW
    // ----------------------------
    if (flow === "gmail_admin") {
      // ✅ Only admins can do admin/system sender connects
      if (!isAdmin) {
        const redirectUrl = new URL(returnTo, req.url);
        redirectUrl.searchParams.set("gmail_sender_status", "pending");
        redirectUrl.searchParams.set("gmail_sender_email", profile.email);
        redirectUrl.searchParams.set("gmail_sender_note", "Not authorized to connect Admin System Gmail.");
        const res = NextResponse.redirect(redirectUrl);
        clearCookie(res, "rrs_oauth_return_to");
        clearCookie(res, "rrs_oauth_flow");
        return res;
      }

      // Require selected email to match ADMIN_SENDER_EMAIL (recommended)
      if (adminSystemEmail && profile.email !== adminSystemEmail) {
        const redirectUrl = new URL(returnTo, req.url);
        redirectUrl.searchParams.set("gmail_sender_status", "pending");
        redirectUrl.searchParams.set("gmail_sender_email", profile.email);
        redirectUrl.searchParams.set("gmail_sender_note", "This email is not the configured ADMIN_SENDER_EMAIL.");
        const res = NextResponse.redirect(redirectUrl);
        clearCookie(res, "rrs_oauth_return_to");
        clearCookie(res, "rrs_oauth_flow");
        return res;
      }

      // Store/update tokens as approved system sender (no employer_id)
      const { data: existing, error: exErr } = await supabaseServer
        .from("gmail_accounts")
        .select("user_email, refresh_token")
        .eq("user_email", profile.email)
        .maybeSingle();

      if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 });

      const refreshToStore =
        (tokens.refresh_token && String(tokens.refresh_token).trim()) ||
        (existing?.refresh_token ? String((existing as any).refresh_token) : null);

      if (!refreshToStore) {
        return NextResponse.json(
          { error: "Google did not return refresh_token. Remove app access then reconnect with prompt=consent." },
          { status: 400 }
        );
      }

      const { error: upErr } = await supabaseServer
        .from("gmail_accounts")
        .upsert(
          {
            user_email: profile.email,
            access_token: tokens.access_token,
            refresh_token: refreshToStore,
            expires_at: expiresAt,
            scope: String(tokens.scope || ""),
            status: "approved",
            employer_id: null,
          },
          { onConflict: "user_email" }
        );

      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

      const redirectUrl = new URL(returnTo, req.url);
      redirectUrl.searchParams.set("gmail_sender_status", "approved");
      redirectUrl.searchParams.set("gmail_sender_email", profile.email);

      const res = NextResponse.redirect(redirectUrl);
      clearCookie(res, "rrs_oauth_return_to");
      clearCookie(res, "rrs_oauth_flow");
      return res;
    }

    // ----------------------------
    // LOGIN FLOW (Admin or HR)
    // ----------------------------

    // OPTIONAL “admin code” cookie gate (turn on later)
    // const cookieStr = req.headers.get("cookie") || "";
    // const adminCodeOk = cookieStr.includes("rrs_admin_code_ok=1");

    if (isAdmin) {
      // ✅ Create admin session
      const adminSessionToken = makeSessionToken();
      const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);

      const { error: adminSessErr } = await supabaseServer.from("admin_sessions").insert({
        admin_user_id: (adminRow as any).id,
        session_token: adminSessionToken,
        expires_at: expires.toISOString(),
      });

      if (adminSessErr) return NextResponse.json({ error: adminSessErr.message }, { status: 500 });

      // Always send admins to /admin (ignore returnTo that points to /hr)
      const redirectUrl = new URL("/admin", req.url);
      const res = NextResponse.redirect(redirectUrl);

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

    // ✅ Otherwise create HR user + HR session
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

    // Always send HR to /hr (ignore returnTo that points to /admin)
    const redirectUrl = new URL("/hr", req.url);
    const res = NextResponse.redirect(redirectUrl);

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