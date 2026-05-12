import { NextResponse } from "next/server";

function clearAndRedirect(req: Request, destination: string) {
  const url = new URL(req.url);
  const base = `${url.protocol}//${url.host}`;
  const res = NextResponse.redirect(`${base}${destination}`);
  res.cookies.delete("admin_session");
  return res;
}

export async function GET(req: Request) {
  return clearAndRedirect(req, "/admin/login");
}

export async function POST(req: Request) {
  return clearAndRedirect(req, "/es/");
}
