/**
 * GET /auth/verify?token=...
 *
 * Landing step only: does not consume the magic-link token. The user must submit
 * the form (POST) so mail-app link previews and prefetch GETs cannot invalidate the token.
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getMagicLinkTokenStatus } from '@/lib/auth';

interface VerifyPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  const { token } = await searchParams;
  if (!token?.trim()) {
    redirect('/auth/verify/error?code=missing');
  }

  const status = await getMagicLinkTokenStatus(token.trim());
  if (!status.ok) {
    if (status.code === 'LINK_EXPIRED') redirect('/auth/verify/error?code=expired');
    if (status.code === 'LINK_USED') redirect('/auth/verify/error?code=used');
    redirect('/auth/verify/error?code=invalid');
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-stone-50 px-4 py-12 sm:py-16">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm font-medium text-stone-600 transition-colors hover:text-amber-900"
          >
            <span aria-hidden="true">←</span> Back to home
          </Link>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
          <h1 className="mb-2 text-2xl font-bold text-stone-800">Finish signing in</h1>
          <p className="mb-4 text-sm text-stone-600">
            Tap <span className="font-semibold text-stone-800">Continue</span> below to complete sign-in.
            Opening the link in a preview or long-pressing can sometimes trigger your mail app to load the
            page in the background - if that already happened, this link may no longer work and you&apos;ll
            need a new one from the login page.
          </p>
          <form action="/api/auth/verify" method="POST" className="space-y-4">
            <input type="hidden" name="token" value={token.trim()} />
            <button
              type="submit"
              className="w-full rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              Continue
            </button>
          </form>
          <p className="mt-6 text-center text-xs text-stone-500">
            <Link href="/auth/login" className="font-medium text-amber-800 underline underline-offset-2">
              Request a new login link
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
