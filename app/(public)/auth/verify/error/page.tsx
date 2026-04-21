/**
 * Magic-link verification error page.
 *
 * Receives `?code=` from redirects after `POST /api/auth/verify` and renders an
 * appropriate error card. Kept as a Server Component - no cookie writes
 * happen here.
 */

import Link from 'next/link';

type Code = 'missing' | 'invalid' | 'expired' | 'used' | 'unexpected';

interface ErrorPageProps {
  searchParams: Promise<{ code?: string }>;
}

const MESSAGES: Record<Code, { title: string; message: string; showRequestNew: boolean }> = {
  missing: {
    title: 'Invalid link',
    message: 'This link is invalid or has already been used.',
    showRequestNew: false,
  },
  invalid: {
    title: 'Invalid link',
    message: 'This link is invalid or has already been used.',
    showRequestNew: true,
  },
  used: {
    title: 'Link already used',
    message:
      'This sign-in link was already used. Mail apps sometimes open links in the background when you preview them. Request a new login link and use Continue on the next page without only previewing the URL.',
    showRequestNew: true,
  },
  expired: {
    title: 'Link expired',
    message: 'This login link has expired. Login links are valid for 72 hours.',
    showRequestNew: true,
  },
  unexpected: {
    title: 'Something went wrong',
    message: 'An unexpected error occurred. Please try again.',
    showRequestNew: true,
  },
};

function resolveCode(raw: string | undefined): Code {
  if (raw && raw in MESSAGES) return raw as Code;
  return 'unexpected';
}

export default async function VerifyErrorPage({ searchParams }: ErrorPageProps) {
  const { code } = await searchParams;
  const { title, message, showRequestNew } = MESSAGES[resolveCode(code)];

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-stone-50 px-4 py-12 sm:py-16">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <div className="mb-4 text-4xl" aria-hidden="true">
            🔗
          </div>
          <h1 className="mb-2 font-display text-xl font-bold tracking-tight text-stone-800">{title}</h1>
          <p className="mb-6 text-sm text-stone-500">{message}</p>
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
    </main>
  );
}
