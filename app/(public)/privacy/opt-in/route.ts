import { NextRequest, NextResponse } from "next/server";
import {
  ADP_ANALYTICS_OPT_OUT_COOKIE,
  LEGACY_ANALYTICS_OPT_OUT_COOKIE,
} from "@/lib/analytics-opt-out-cookies";
import { requestIsHttpsForCookies } from "@/lib/https-from-request";

/**
 * GET /privacy/opt-in - clears opt-out cookie(s), then redirects to /privacy
 * with a flag so the client can call `posthog.opt_in_capturing()` (SDK may persist opt-out in storage).
 */
export async function GET(request: NextRequest) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/privacy";
  redirectUrl.searchParams.set("analytics", "opted_in");

  const res = NextResponse.redirect(redirectUrl);
  const secure = requestIsHttpsForCookies(request);
  const base = {
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    sameSite: "lax" as const,
    secure,
    httpOnly: false,
  };
  res.cookies.set(ADP_ANALYTICS_OPT_OUT_COOKIE, "", base);
  res.cookies.set(LEGACY_ANALYTICS_OPT_OUT_COOKIE, "", base);
  return res;
}
