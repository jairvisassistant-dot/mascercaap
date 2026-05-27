import { NextRequest, NextResponse } from "next/server";
import { buildEnforcedCsp, buildReportOnlyCsp } from "@/lib/security/csp";

export function middleware(request: NextRequest) {
  // Generate a fresh nonce for each request — used to allow specific
  // inline scripts (theme detector, JSON-LD) without 'unsafe-inline'.
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64");

  const isDev = process.env.NODE_ENV === "development";
  const csp = buildEnforcedCsp(isDev, nonce);
  const cspReportOnly = buildReportOnlyCsp(isDev, nonce);

  // Forward the nonce to RSC/layout via request header.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // Override the static CSP set in next.config.ts with the nonce-aware version.
  response.headers.set("Content-Security-Policy", csp);
  if (cspReportOnly) {
    response.headers.set("Content-Security-Policy-Report-Only", cspReportOnly);
  }

  return response;
}

// Run on all routes except static assets — those don't execute scripts.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|apple-icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?|ttf|otf)$).*)",
  ],
};
