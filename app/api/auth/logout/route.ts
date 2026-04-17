/**
 * POST /api/auth/logout
 *
 * Captures the artist_logout analytics event, clears the session cookie,
 * and redirects to the home page with ?ph_reset=1 so the client can call
 * posthog.reset() to disassociate the PostHog identity.
 *
 * POST-only on purpose: a GET handler would be triggered by Next.js Link
 * prefetch, link-preview scanners, and prerenderers, silently logging users
 * out. Mutations must be POST.
 *
 * Requirements: 4.3, 4.5
 */

import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/session-jwt";
import { analyticsServer } from "@/lib/analytics-server";

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get("session")?.value ?? null;
  const session = sessionCookie ? await verifySession(sessionCookie) : null;

  if (session?.artistId) {
    try {
      analyticsServer?.capture({ distinctId: session.artistId, event: 'artist_logout' })
    } catch {
      // Silently ignore analytics errors
    }
  }

  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.search = "?ph_reset=1";

  // 303 See Other: browser follows POST -> GET on the redirect target.
  const response = NextResponse.redirect(url, 303);
  // Match the original cookie attributes used during login so the browser
  // reliably overwrites and expires the exact same cookie.
  response.cookies.set("session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
  return response;
}
