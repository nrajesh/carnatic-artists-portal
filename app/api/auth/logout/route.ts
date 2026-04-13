import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.search = "";
  const response = NextResponse.redirect(url);
  response.cookies.set("session", "", { maxAge: 0, path: "/" });
  return response;
}
