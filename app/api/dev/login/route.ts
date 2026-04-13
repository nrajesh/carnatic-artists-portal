/**
 * DEV-ONLY login shortcut - sets a signed JWT session cookie without
 * needing a real email or database connection.
 *
 * ONLY available when NODE_ENV !== 'production'.
 *
 * Usage:
 *   Admin:  GET /api/dev/login?role=admin   → redirects to /admin/dashboard
 *   Artist: GET /api/dev/login?role=artist  → redirects to /dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { signSession } from '@/lib/session-jwt';

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production.' }, { status: 404 });
  }

  const role = (request.nextUrl.searchParams.get('role') ?? 'admin') as 'admin' | 'artist';
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const sessionData = {
    sessionId: `dev-${role}-${Date.now()}`,
    artistId: `dev-${role}-id`,
    role,
    expiresAt,
  };

  const jwt = await signSession(sessionData);

  const redirectTo = role === 'admin' ? '/admin/dashboard' : '/dashboard';
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = redirectTo;
  redirectUrl.search = '';

  const response = NextResponse.redirect(redirectUrl);

  response.cookies.set('session', jwt, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
  });

  return response;
}
