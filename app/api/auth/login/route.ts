/**
 * POST /api/auth/login
 *
 * Accepts { email } JSON body, calls issueMagicLink(email),
 * and always returns { success: true } (don't reveal whether email exists).
 *
 * Requirements: 2.6
 */

import { NextRequest, NextResponse } from 'next/server';
import { issueMagicLink } from '@/lib/auth';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_REQUEST', message: 'Invalid JSON body.' }, { status: 400 });
  }

  const email = (body as { email?: unknown }).email;
  if (typeof email !== 'string' || !email.trim()) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Email is required.' }, { status: 400 });
  }

  // Silently issue magic link - issueMagicLink returns without error if email not found
  await issueMagicLink(email.trim().toLowerCase());

  // Always return success to avoid revealing whether the email exists
  return NextResponse.json({ success: true });
}
