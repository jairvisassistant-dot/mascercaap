import { NextResponse } from "next/server";

function clearAndRedirect(req: Request, destination: string) {
  const url = new URL(req.url);
  const base = `${url.protocol}//${url.host}`;
  const res = NextResponse.redirect(`${base}${destination}`);
  res.cookies.delete("admin_session");
  return res;
}

export async function GET(req: Request) {
  // Sec-Fetch-Dest distinguishes legitimate browser navigation (value: "document")
  // from CSRF via embedded tags like <img src="/api/admin/auth/logout">.
  // Only clear the cookie for navigation requests; everything else just redirects.
  const dest = req.headers.get("sec-fetch-dest");
  if (dest !== "document") {
    const url = new URL(req.url);
    return NextResponse.redirect(`${url.origin}/admin/login`);
  }
  return clearAndRedirect(req, "/admin/login");
}

export async function POST(req: Request) {
  return clearAndRedirect(req, "/es/");
}
