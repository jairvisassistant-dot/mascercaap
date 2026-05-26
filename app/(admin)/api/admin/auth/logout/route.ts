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

export async function GET(req: Request) {
  // Sec-Fetch-Dest distinguishes legitimate browser navigation (value: "document")
  // from CSRF via embedded tags like <img src="/api/admin/auth/logout">.
  const dest = req.headers.get("sec-fetch-dest");
  if (dest !== "document") {
    return NextResponse.redirect(`${getPublicBase(req)}/admin/login`);
  }
  return clearAndRedirect(req, "/admin/login");
}

export async function POST(req: Request) {
  return clearAndRedirect(req, "/admin/login");
}
