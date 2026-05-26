import { NextResponse } from "next/server";
import { SITE_CONFIG } from "./config";

const ALLOWED_ORIGIN = new URL(SITE_CONFIG.siteUrl).origin;

/**
 * Validates the Origin header to block cross-site POST requests.
 * Returns a 403 response if the check fails, null if it passes.
 * Skipped in development to allow curl/Postman.
 */
export function assertSameOrigin(request: Request): NextResponse | null {
  if (process.env.NODE_ENV !== "production") return null;

  const origin = request.headers.get("origin");
  if (!origin || origin !== ALLOWED_ORIGIN) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  return null;
}
