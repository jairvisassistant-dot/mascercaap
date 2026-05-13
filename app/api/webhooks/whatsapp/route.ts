import { NextRequest, NextResponse } from "next/server";

const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? "mascercaap-webhook-dev";

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("[whatsapp-webhook] received:", JSON.stringify(body).slice(0, 500));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[whatsapp-webhook] error:", err);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
