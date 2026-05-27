import { NextResponse } from "next/server";

function getPublicBase(req: Request): string {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost";
  return `${proto}://${host}`;
}

function clearAndRedirect(req: Request, destination: string) {
  const res = NextResponse.redirect(`${getPublicBase(req)}${destination}`);
  res.cookies.delete("admin_session");
  return res;
}

// Only POST is allowed. GET is intentionally omitted to prevent CSRF via
// unintended prefetch, <img>, or link navigation side-effects.
export async function POST(req: Request) {
  return clearAndRedirect(req, "/es");
}
