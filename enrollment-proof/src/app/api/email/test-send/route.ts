import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

function b64url(input: string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function refreshAccessToken(refreshToken: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const json = await res.json();
  if (!res.ok || !json.access_token) {
    throw new Error(json?.error_description || "Failed to refresh access token");
  }

  return {
    access_token: json.access_token as string,
    expires_in: json.expires_in as number,
  };
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  // ✅ DEFAULT TO YOUR EMAIL
  const to =
    String(body.to || "rocky@revenuereturnspecialists.com").trim();

  const subject = String(
    body.subject || "RRS Gmail OAuth Test"
  ).trim();

  const text = String(
    body.text ||
      "If you received this email, Gmail OAuth sending is working inside Enrollment Proof."
  ).trim();

  if (!to.includes("@")) {
    return Response.json({ error: "Invalid recipient email" }, { status: 400 });
  }

  const { data: acct, error: acctErr } = await supabaseServer
    .from("gmail_accounts")
    .select("user_email, access_token, refresh_token, expires_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (acctErr || !acct) {
    return Response.json({ error: "No Gmail account connected" }, { status: 400 });
  }

  let accessToken = String((acct as any).access_token || "");
  const refreshToken = String((acct as any).refresh_token || "");
  const expiresAtMs = new Date(
    String((acct as any).expires_at || "")
  ).getTime();

  if (!refreshToken) {
    return Response.json({ error: "Missing refresh_token" }, { status: 500 });
  }

  // Refresh token if expired or about to expire
  if (!accessToken || !expiresAtMs || Date.now() > expiresAtMs - 60_000) {
    const refreshed = await refreshAccessToken(refreshToken);
    accessToken = refreshed.access_token;

    const newExpiresAt = new Date(
      Date.now() + refreshed.expires_in * 1000
    ).toISOString();

    await supabaseServer
      .from("gmail_accounts")
      .update({
        access_token: accessToken,
        expires_at: newExpiresAt,
      })
      .eq("user_email", (acct as any).user_email);
  }

  const from = String((acct as any).user_email);

  const raw = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    ``,
    text,
  ].join("\r\n");

  const sendRes = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ raw: b64url(raw) }),
    }
  );

  const sendJson = await sendRes.json().catch(() => ({}));
  if (!sendRes.ok) {
    return Response.json(
      { error: "Send failed", details: sendJson },
      { status: 500 }
    );
  }

  return Response.json({
    ok: true,
    sent_from: from,
    to,
    message_id: sendJson.id,
  });
}