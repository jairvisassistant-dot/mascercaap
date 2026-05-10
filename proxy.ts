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

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirigir rutas admin con locale prefix → sin locale
  // Ej: /es/admin/login → /admin/login
  for (const locale of locales) {
    if (pathname.startsWith(`/${locale}/admin`)) {
      const withoutLocale = pathname.slice(locale.length + 1);
      return NextResponse.redirect(new URL(withoutLocale, request.url));
    }
  }

  // Admin routes — cookie check only (JWT validation en los Server Components)
  if (pathname.startsWith("/admin")) {
    const isLoginPage = pathname === "/admin/login";
    const hasSession = !!request.cookies.get("admin_session")?.value;

    if (!hasSession) {
      if (isLoginPage) return NextResponse.next();
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    if (isLoginPage) {
      return NextResponse.redirect(new URL("/admin/productos", request.url));
    }

    return NextResponse.next();
  }

  // Skip internal paths, API routes, and static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/sitemap") ||
    pathname.startsWith("/robots") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
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
