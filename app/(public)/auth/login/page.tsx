'use client';

/**
 * Login Page - request a magic link.
 * Client component with email form.
 *
 * Requirements: 2.6, 2.7
 */

import Link from 'next/link';
import { useState, FormEvent, useEffect } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [sessionState, setSessionState] = useState<{
    loading: boolean;
    authenticated: boolean;
    role: 'artist' | 'admin' | null;
  }>({
    loading: true,
    authenticated: false,
    role: null,
  });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/auth/session', { cache: 'no-store' });
        const data = (await res.json()) as {
          authenticated?: boolean;
          role?: 'artist' | 'admin';
        };
        if (!active) return;
        setSessionState({
          loading: false,
          authenticated: data.authenticated === true,
          role: data.role ?? null,
        });
      } catch {
        if (!active) return;
        setSessionState({ loading: false, authenticated: false, role: null });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMessage(
          (data as { message?: string }).message ??
            'If this email is registered, you\'ll receive a login link shortly.',
        );
        setStatus('error');
        return;
      }

      setStatus('success');
    } catch {
      setErrorMessage('If this email is registered, you\'ll receive a login link shortly.');
      setStatus('error');
    }
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

        {/* Card */}
        <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
          <h1 className="mb-2 text-2xl font-bold text-stone-800">Sign in</h1>
          <p className="mb-6 text-stone-500 text-sm">
            Enter your registered email address and we&apos;ll send you a login link.
          </p>
          {!sessionState.loading && sessionState.authenticated && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              You&apos;re already signed in as {sessionState.role}. Use dashboard/logout instead of requesting a new login link.
              <div className="mt-2 flex gap-2">
                <Link
                  href={sessionState.role === 'admin' ? '/admin/dashboard' : '/dashboard'}
                  className="text-xs font-semibold text-amber-800 underline underline-offset-2"
                >
                  Go to dashboard
                </Link>
                <form action="/api/auth/logout" method="POST" className="inline">
                  <button type="submit" className="text-xs font-semibold text-amber-800 underline underline-offset-2">
                    Log out
                  </button>
                </form>
              </div>
            </div>
          )}

          {status === 'success' ? (
            <div className="rounded-lg bg-green-50 border border-green-200 px-5 py-4 text-green-800 text-sm">
              <p className="font-semibold mb-1">Check your email for a login link.</p>
              <p>It expires in 72 hours.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm"
                />
              </div>

              {status === 'error' && (
                <p className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-amber-800 text-sm">
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={status === 'loading' || !email.trim() || sessionState.authenticated}
                className="w-full rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'loading' ? 'Sending…' : 'Send login link'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
