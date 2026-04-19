/**
 * Edge Middleware — JWT session validation for protected routes.
 *
 * Reads the `session` cookie, verifies it as a signed JWT, and either
 * allows the request through (with identity headers) or redirects to login.
 *
 * Uses the Edge runtime (`middleware.ts`). Next.js 16's `proxy.ts` defaults to the
 * Node.js runtime, which OpenNext for Cloudflare does not support yet — keep this file
 * named `middleware.ts` until that ecosystem catches up.
 *
 * Requirements: 12.4, 12.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from './lib/session-jwt';

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/profile/:path*',
    '/search/:path*',
    '/collabs/:path*',
    '/admin/:path*',
  ],
};

const ADMIN_PREFIXES = ['/admin'];

function isAdminRoute(pathname: string): boolean {
  return ADMIN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  const sessionCookie = request.cookies.get('session')?.value ?? null;

  if (!sessionCookie) {
    return redirectToLogin(request);
  }

  const session = await verifySession(sessionCookie);

  if (!session) {
    return redirectToLogin(request);
  }

  // Admin routes require admin role
  if (isAdminRoute(pathname) && session.role !== 'admin') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Pass identity headers downstream
  const headers = new Headers(request.headers);
  headers.set('X-Artist-Id', session.artistId);
  headers.set('X-Artist-Role', session.role);

  return NextResponse.next({ request: { headers } });
}

function redirectToLogin(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = '/auth/login';
  return NextResponse.redirect(url);
}
