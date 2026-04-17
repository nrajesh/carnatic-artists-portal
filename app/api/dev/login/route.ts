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
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production.' }, { status: 404 });
  }

  const role = (request.nextUrl.searchParams.get('role') ?? 'admin') as 'admin' | 'artist';
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  let artistId = `dev-${role}-id`;

  // For dev-login, prefer a real artist id so pages that rely on DB relations
  // (dashboard/collabs/highlighting) behave like production.
  if (role === 'artist') {
    try {
      const artist = await getDb().artist.findFirst({
        where: { isSuspended: false },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      if (artist) {
        artistId = artist.id;
      }
    } catch {
      // Keep fallback synthetic id for DB-less local dev.
    }
  }
  if (role === 'admin') {
    try {
      const adminEmails = (process.env.ADMIN_EMAILS ?? '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
      const adminArtist = adminEmails.length
        ? await getDb().artist.findFirst({
            where: {
              isSuspended: false,
              email: { in: adminEmails },
            },
            orderBy: { createdAt: 'asc' },
            select: { id: true },
          })
        : null;
      if (adminArtist) {
        artistId = adminArtist.id;
      }
    } catch {
      // Keep fallback synthetic id for DB-less local dev.
    }
  }

  const sessionData = {
    sessionId: `dev-${role}-${Date.now()}`,
    artistId,
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
