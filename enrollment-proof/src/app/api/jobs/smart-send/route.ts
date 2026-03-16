import { runSmartSend } from "@/lib/smart-send/runSmartSend";

export const runtime = "nodejs";

function isAuthorized(req: Request) {
  const expected = process.env.SMART_SEND_CRON_SECRET;

  const headerSecret = req.headers.get("x-smart-send-secret");
  if (expected && headerSecret === expected) return true;

  const authHeader = req.headers.get("authorization");
  if (expected && authHeader === `Bearer ${expected}`) return true;

  const vercelCron = req.headers.get("x-vercel-cron");
  if (vercelCron === "1") return true;

  return false;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runSmartSend();
    return Response.json(result);
  } catch (err: any) {
    return Response.json(
      { error: err?.message || "Smart Send failed" },
      { status: 500 }
    );
  }
}