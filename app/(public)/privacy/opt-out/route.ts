import { NextRequest, NextResponse } from "next/server";

/**
 * GET /privacy/opt-out  -  sets the PostHog opt-out cookie expected by
 * `components/posthog-provider.tsx`, then redirects to /privacy with a confirmation flag.
 * Cookie is not HttpOnly so the client can detect `ph_opt_out=1` on the next load.
 */
export async function GET(request: NextRequest) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/privacy";
  redirectUrl.searchParams.set("analytics", "opted_out");

  const res = NextResponse.redirect(redirectUrl);
  const secure = request.nextUrl.protocol === "https:";
  res.cookies.set("ph_opt_out", "1", {
    path: "/",
    maxAge: 60 * 60 * 24 * 730, // ~2 years; user can clear cookies anytime
    sameSite: "lax",
    secure,
    httpOnly: false,
  });
  return res;
}
