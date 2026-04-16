/**
 * Magic Link Verification Page
 * Server component - reads token from URL, verifies it, sets session cookie, redirects.
 *
 * Requirements: 2.6, 2.7, 4.4
 */

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { verifyMagicLink, AuthError } from '@/lib/auth';
import { signSession } from '@/lib/session-jwt';
import { analyticsServer } from '@/lib/analytics-server';

interface VerifyPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
        <VerifyErrorCard
          title="Invalid link"
          message="This link is invalid or has already been used."
        />
      </main>
    );
  }

  try {
    const session = await verifyMagicLink(token);

    // Sign session as JWT and set cookie
    const jwt = await signSession(session);
    const cookieStore = await cookies();
    cookieStore.set('session', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
      path: '/',
    });

    // Capture login event server-side (Task 8.2)
    try {
      analyticsServer?.capture({ distinctId: session.artistId, event: 'artist_login' })
    } catch {
      // Silently ignore analytics errors
    }

    // Redirect to dashboard with identity-stitching flag (Task 8.1)
    redirect('/dashboard?ph_identify=1');
  } catch (err) {
    // Re-throw Next.js redirect errors so they propagate correctly
    if (
      err !== null &&
      typeof err === 'object' &&
      'digest' in err &&
      typeof (err as { digest: unknown }).digest === 'string' &&
      (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')
    ) {
      throw err;
    }

    if (err instanceof AuthError) {
      if (err.code === 'LINK_EXPIRED') {
        return (
          <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
            <VerifyErrorCard
              title="Link expired"
              message="This login link has expired. Login links are valid for 72 hours."
              showRequestNew
            />
          </main>
        );
      }

      // LINK_USED or LINK_INVALID
      return (
        <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
          <VerifyErrorCard
            title="Invalid link"
            message="This link is invalid or has already been used."
            showRequestNew
          />
        </main>
      );
    }

    // Unexpected error
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
        <VerifyErrorCard
          title="Something went wrong"
          message="An unexpected error occurred. Please try again."
          showRequestNew
        />
      </main>
    );
  }
}

// ---------------------------------------------------------------------------
// Error card component
// ---------------------------------------------------------------------------

function VerifyErrorCard({
  title,
  message,
  showRequestNew = false,
}: {
  title: string;
  message: string;
  showRequestNew?: boolean;
}) {
  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm text-center">
        <div className="mb-4 text-4xl" aria-hidden="true">
          🔗
        </div>
        <h1 className="mb-2 text-xl font-bold text-stone-800">{title}</h1>
        <p className="mb-6 text-stone-500 text-sm">{message}</p>
        {showRequestNew && (
          <Link
            href="/auth/login"
            className="inline-block rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            Request a new login link
          </Link>
        )}
      </div>
    </div>
  );
}
