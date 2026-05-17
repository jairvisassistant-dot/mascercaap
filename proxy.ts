import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const locales = ["es", "en"];
const defaultLocale = "es";

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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin is a standalone app. Strip locale prefix then redirect to ADMIN_APP_URL.
  if (pathname.startsWith("/admin") || locales.some((l) => pathname.startsWith(`/${l}/admin`))) {
    const adminPath = locales.reduce(
      (p, l) => (p.startsWith(`/${l}/admin`) ? p.slice(l.length + 1) : p),
      pathname,
    );
    const adminAppUrl = process.env.ADMIN_APP_URL;
    if (adminAppUrl) {
      return NextResponse.redirect(
        new URL(adminPath + request.nextUrl.search, adminAppUrl),
        { status: 308 },
      );
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Skip _next/data and any static files not caught by the matcher
  if (pathname.startsWith("/_next") || pathname.includes(".")) {
    return;
  }

  // Check if pathname already has a locale
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) {
    const lang = locales.find((l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`) ?? defaultLocale;
    const res = NextResponse.next();
    res.headers.set("x-lang", lang);
    return res;
  }

  // Redirect to the locale-prefixed path
  const locale = getLocale(request);
  request.nextUrl.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|imgs|fonts).*)",
  ],
};
