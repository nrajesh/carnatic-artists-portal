/**
 * POST /api/auth/verify - completes magic-link sign-in (consumes token, sets session cookie).
 *
 * GET /auth/verify is handled by `app/(public)/auth/verify/page.tsx`, which shows a confirmation
 * step. That prevents email clients and link-preview crawlers from burning single-use tokens via
 * prefetch GETs.
 *
 * Requirements: 2.6, 2.7, 4.4, 12.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthError, verifyMagicLink } from '@/lib/auth';
import { signSession } from '@/lib/session-jwt';
import { analyticsServer } from '@/lib/analytics-server';
import { logSafeError } from '@/lib/safe-log';

type ErrorCode = 'missing' | 'invalid' | 'expired' | 'used' | 'unexpected';

function redirectToError(request: NextRequest, code: ErrorCode): NextResponse {
  const url = new URL('/auth/verify/error', request.url);
  url.searchParams.set('code', code);
  return NextResponse.redirect(url);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let token: string | null = null;
  try {
    const formData = await request.formData();
    const raw = formData.get('token');
    token = typeof raw === 'string' && raw.trim() ? raw.trim() : null;
  } catch {
    token = null;
  }

  if (!token) {
    return redirectToError(request, 'missing');
  }

  try {
    const session = await verifyMagicLink(token);
    const jwt = await signSession(session);

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
      if (err.code === 'LINK_USED') {
        return redirectToError(request, 'used');
      }
      return redirectToError(request, 'invalid');
    }

    logSafeError('[api/auth/verify] unexpected error', err);
    return redirectToError(request, 'unexpected');
  }
}
