import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const base = `${url.protocol}//${url.host}`;
  const res = NextResponse.redirect(`${base}/es/`);
  res.cookies.delete("admin_session");
  return res;
}
