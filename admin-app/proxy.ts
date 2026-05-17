import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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

  return NextResponse.redirect(new URL("/admin", request.url));
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
