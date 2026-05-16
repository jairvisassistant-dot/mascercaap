import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const webhookPayloadSchema = z.object({
  object: z.string(),
  entry: z
    .array(
      z.object({
        id: z.string(),
        changes: z.array(z.object({ value: z.unknown(), field: z.string() })),
      })
    )
    .optional(),
});

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (!verifyToken) {
    return NextResponse.json({ error: "Service not configured" }, { status: 503 });
  }

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

function verifySignature(rawBody: string, signature: string | null): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    // Signature verification skipped — set WHATSAPP_APP_SECRET before going live
    return true;
  }
  if (!signature) return false;
  const expected = `sha256=${crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");

    if (!verifySignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }

    const result = webhookPayloadSchema.safeParse(parsed);
    if (!result.success) {
      return NextResponse.json({ error: "Invalid payload shape" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(
      "[whatsapp-webhook] error:",
      err instanceof Error ? err.message : "unknown"
    );
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
