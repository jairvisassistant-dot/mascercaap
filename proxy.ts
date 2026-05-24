import { type NextRequest, NextResponse } from "next/server";

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

  // Block middleware bypass header (CVE-2025-29927)
  if (request.headers.get("x-middleware-subrequest")) {
    return new NextResponse(null, { status: 403 });
  }

  // Admin routes: protect and exit early — no locale prefix applied to /admin/*
  if (pathname.startsWith("/admin")) {
    if (!pathname.startsWith("/admin/login")) {
      const session = request.cookies.get("admin_session");
      if (!session?.value) {
        return NextResponse.redirect(new URL("/admin/login", request.url));
      }
    }
    const res = NextResponse.next();
    res.headers.set("x-pathname", pathname);
    return res;
  }

  // Skip static assets not caught by the matcher
  if (pathname.startsWith("/_next") || pathname.includes(".")) return;

  // i18n
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );
  if (pathnameHasLocale) {
    const lang = locales.find((l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`) ?? defaultLocale;
    const res = NextResponse.next();
    res.headers.set("x-lang", lang);
    return res;
  }
  const locale = getLocale(request);
  request.nextUrl.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|imgs|fonts).*)",
  ],
};
