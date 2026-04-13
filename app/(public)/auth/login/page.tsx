'use client';

/**
 * Login Page - request a magic link.
 * Client component with email form.
 *
 * Requirements: 2.6, 2.7
 */

import { useState, FormEvent } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

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
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
          <h1 className="mb-2 text-2xl font-bold text-stone-800">Sign in</h1>
          <p className="mb-6 text-stone-500 text-sm">
            Enter your registered email address and we&apos;ll send you a login link.
          </p>

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
                disabled={status === 'loading' || !email.trim()}
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
