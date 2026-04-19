import { NextRequest, NextResponse } from "next/server";

/**
 * GET /privacy/opt-in - clears the PostHog opt-out cookie, then redirects to /privacy
 * with a flag so the client can call `posthog.opt_in_capturing()` (SDK may persist opt-out in storage).
 */
export async function GET(request: NextRequest) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/privacy";
  redirectUrl.searchParams.set("analytics", "opted_in");

  const res = NextResponse.redirect(redirectUrl);
  res.cookies.set("ph_opt_out", "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    httpOnly: false,
  });
  return res;
}
