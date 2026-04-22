import { NextRequest, NextResponse } from "next/server";
import {
  ADP_ANALYTICS_OPT_OUT_COOKIE,
  LEGACY_ANALYTICS_OPT_OUT_COOKIE,
} from "@/lib/analytics-opt-out-cookies";
import { requestIsHttpsForCookies } from "@/lib/https-from-request";

/**
 * GET /privacy/opt-out - sets first-party opt-out cookie(s) read by `PostHogProvider` and `/privacy`,
 * then redirects to /privacy with a confirmation flag.
 */
export async function GET(request: NextRequest) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/privacy";
  redirectUrl.searchParams.set("analytics", "opted_out");

  const res = NextResponse.redirect(redirectUrl);
  const secure = requestIsHttpsForCookies(request);
  const base = {
    path: "/",
    sameSite: "lax" as const,
    secure,
    httpOnly: false,
  };
  res.cookies.set(ADP_ANALYTICS_OPT_OUT_COOKIE, "1", {
    ...base,
    maxAge: 60 * 60 * 24 * 730,
  });
  // Migrate off legacy name so it cannot interact with PostHog's `ph_*` cookie namespace.
  res.cookies.set(LEGACY_ANALYTICS_OPT_OUT_COOKIE, "", {
    ...base,
    maxAge: 0,
  });
  return res;
}
