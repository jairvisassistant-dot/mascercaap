import { type NextRequest, NextResponse } from "next/server";
import { buildEnforcedCsp, buildReportOnlyCsp } from "@/lib/security/csp";

const locales = ["es", "en"];
const defaultLocale = "es";

// In-memory rate limiter — fixed window, per process instance.
// State resets on server restart — adequate for this traffic volume on a single Node.js process.
const RL_WINDOW_MS = 60_000;
const RL_MAX_REQUESTS = 10;
const rlStore = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rlStore.get(ip);
  if (!entry || now - entry.windowStart >= RL_WINDOW_MS) {
    rlStore.set(ip, { count: 1, windowStart: now });
    return false;
  }
  if (entry.count >= RL_MAX_REQUESTS) return true;
  entry.count += 1;
  return false;
}

function getLocale(request: NextRequest): string {
  const cookie = request.cookies.get("NEXT_LOCALE");
  if (cookie && locales.includes(cookie.value)) return cookie.value;
  const acceptLang = request.headers.get("accept-language") ?? "";
  const preferred = acceptLang
    .split(",")
    .map((entry) => {
      const [tag, q] = entry.trim().split(";q=");
      return { lang: tag.trim().split("-")[0].toLowerCase(), q: q ? parseFloat(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { lang } of preferred) {
    if ((locales as readonly string[]).includes(lang)) return lang;
  }
  return defaultLocale;
}

/** Attach nonce-aware CSP headers to an outgoing response. */
function withCsp(response: NextResponse, nonce: string): NextResponse {
  const isDev = process.env.NODE_ENV === "development";
  response.headers.set("Content-Security-Policy", buildEnforcedCsp(isDev, nonce));
  const reportOnly = buildReportOnlyCsp(isDev, nonce);
  if (reportOnly) response.headers.set("Content-Security-Policy-Report-Only", reportOnly);
  return response;
}

const RATE_LIMITED_PATHS = ["/api/orders", "/api/leads", "/api/contact"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Block middleware bypass header (CVE-2025-29927)
  if (request.headers.get("x-middleware-subrequest")) {
    return new NextResponse(null, { status: 403 });
  }

  // Generate a fresh nonce for every HTML request.
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64");

  // Rate limit sensitive API routes (no nonce needed — JSON responses)
  if (RATE_LIMITED_PATHS.some((p) => pathname.startsWith(p))) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";
    if (isRateLimited(ip)) {
      return new NextResponse(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil(RL_WINDOW_MS / 1000)),
        },
      });
    }
    return NextResponse.next();
  }

  // Admin routes: protect and exit early — no locale prefix applied to /admin/*
  if (pathname.startsWith("/admin")) {
    if (!pathname.startsWith("/admin/login")) {
      const session = request.cookies.get("admin_session");
      if (!session?.value) {
        return NextResponse.redirect(new URL("/admin/login", request.url));
      }
    }
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-pathname", pathname);
    requestHeaders.set("x-nonce", nonce);
    return withCsp(NextResponse.next({ request: { headers: requestHeaders } }), nonce);
  }

  // Skip static assets not caught by the matcher
  if (pathname.startsWith("/_next") || pathname.includes(".")) return;

  // i18n — attach lang + nonce to request headers for RSC layouts to read
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );
  if (pathnameHasLocale) {
    const lang =
      locales.find((l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`) ?? defaultLocale;
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-lang", lang);
    requestHeaders.set("x-nonce", nonce);
    return withCsp(NextResponse.next({ request: { headers: requestHeaders } }), nonce);
  }

  // Redirect to locale-prefixed path
  const locale = getLocale(request);
  request.nextUrl.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|imgs|fonts).*)",
    "/api/orders/:path*",
    "/api/leads/:path*",
    "/api/contact/:path*",
  ],
};
