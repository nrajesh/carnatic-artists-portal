/**
 * GET /auth/verify?token=...
 *
 * Route Handler - not a Server Component - because Next.js 16 only allows
 * cookie mutation inside Server Actions, Route Handlers, and Middleware.
 *
 * Verifies the magic-link token, creates a session JWT, sets the `session`
 * cookie on the redirect response, and sends the user to the dashboard.
 *
 * On failure, redirects to /auth/verify/error?code=... so the error UI
 * lives on a dedicated page.
 *
 * Requirements: 2.6, 2.7, 4.4, 12.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthError, verifyMagicLink } from '@/lib/auth';
import { signSession } from '@/lib/session-jwt';
import { analyticsServer } from '@/lib/analytics-server';

type ErrorCode = 'missing' | 'invalid' | 'expired' | 'unexpected';

function redirectToError(request: NextRequest, code: ErrorCode): NextResponse {
  const url = new URL('/auth/verify/error', request.url);
  url.searchParams.set('code', code);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return redirectToError(request, 'missing');
  }

  try {
    const session = await verifyMagicLink(token);
    const jwt = await signSession(session);

    // Admins land on the admin dashboard; artists land on their own dashboard
    // with the PostHog identity-stitching flag.
    const destination =
      session.role === 'admin'
        ? new URL('/admin/dashboard', request.url)
        : (() => {
            const url = new URL('/dashboard', request.url);
            url.searchParams.set('ph_identify', '1');
            return url;
          })();

    const response = NextResponse.redirect(destination);
    response.cookies.set('session', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    try {
      analyticsServer?.capture({ distinctId: session.artistId, event: 'artist_login' });
    } catch {
      // Silently ignore analytics errors
    }

    return response;
  } catch (err) {
    if (err instanceof AuthError) {
      if (err.code === 'LINK_EXPIRED') {
        return redirectToError(request, 'expired');
      }
      return redirectToError(request, 'invalid');
    }

    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error('[auth/verify] unexpected error', { message, stack });
    return redirectToError(request, 'unexpected');
  }
}
