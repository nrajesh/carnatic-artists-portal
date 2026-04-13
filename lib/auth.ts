/**
 * Authentication service - magic link issuance and verification.
 *
 * Implements:
 *   - issueMagicLink(email): generate + store + email a magic link token
 *   - invalidatePriorTokens(artistId): mark all unused tokens as used
 *   - verifyMagicLink(rawToken): validate token, create session, return SessionData
 *
 * Requirements: 2.3, 2.5, 2.6, 2.7, 12.1, 12.2, 12.3, 12.4, 12.5
 */

import crypto from 'crypto';
import { db } from './db';
import { Resend } from 'resend';

// ---------------------------------------------------------------------------
// AuthError
// ---------------------------------------------------------------------------

export class AuthError extends Error {
  constructor(
    public readonly code:
      | 'LINK_INVALID'
      | 'LINK_USED'
      | 'LINK_EXPIRED'
      | 'SESSION_EXPIRED'
      | 'ACCOUNT_SUSPENDED',
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

// ---------------------------------------------------------------------------
// SessionData
// ---------------------------------------------------------------------------

export interface SessionData {
  sessionId: string;
  artistId: string;
  role: 'artist' | 'admin';
  expiresAt: Date;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function randomHex(bytes: number): string {
  return crypto.randomBytes(bytes).toString('hex');
}

function isAdminEmail(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
}

// ---------------------------------------------------------------------------
// Task 5.1 - issueMagicLink & invalidatePriorTokens
// ---------------------------------------------------------------------------

/**
 * Invalidates all unused (usedAt IS NULL, expiresAt > now) tokens for an artist
 * by setting usedAt = now.
 *
 * @param artistId - The artist's ID.
 * @param _now - Optional "current time" override (used in tests).
 */
export async function invalidatePriorTokens(artistId: string, _now?: Date): Promise<void> {
  const now = _now ?? new Date();
  await db.magicLinkToken.updateMany({
    where: {
      artistId,
      usedAt: null,
      expiresAt: { gt: now },
    },
    data: {
      usedAt: now,
    },
  });
}

/**
 * Issues a magic link to the artist's email.
 * Silently returns if the email is not found (don't reveal whether email exists).
 * Invalidates all prior unused tokens first.
 *
 * @param email - The artist's email address.
 * @param _now - Optional "current time" override (used in tests).
 */
export async function issueMagicLink(email: string, _now?: Date): Promise<void> {
  // Look up artist by email - silently return if not found
  const artist = await db.artist.findUnique({ where: { email } });
  if (!artist) return;

  const now = _now ?? new Date();

  // Invalidate all prior unused tokens
  await invalidatePriorTokens(artist.id, now);

  // Generate a cryptographically random 32-byte token
  const rawToken = randomHex(32);
  const tokenHash = sha256(rawToken);

  // Store the MagicLinkToken record (expiresAt = now + 72 hours)
  const expiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000);

  await db.magicLinkToken.create({
    data: {
      artistId: artist.id,
      tokenHash,
      expiresAt,
    },
  });

  // Send email via Resend
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'noreply@carnaticportal.nl';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const magicLinkUrl = `${appUrl}/auth/verify?token=${rawToken}`;

  const resend = new Resend(resendApiKey);
  await resend.emails.send({
    from: fromEmail,
    to: email,
    subject: 'Your login link for Carnatic Artist Portal',
    html: `<p>Click the link below to log in to the Carnatic Artist Portal:</p>
<p><a href="${magicLinkUrl}">${magicLinkUrl}</a></p>
<p>This link expires in 72 hours.</p>`,
  });
}

// ---------------------------------------------------------------------------
// Task 5.2 - verifyMagicLink
// ---------------------------------------------------------------------------

/**
 * Verifies a raw magic link token.
 * Returns SessionData on success.
 * Throws AuthError with appropriate code on failure.
 *
 * @param rawToken - The raw (unhashed) token from the magic link URL.
 * @param _now - Optional "current time" override (used in tests).
 */
export async function verifyMagicLink(rawToken: string, _now?: Date): Promise<SessionData> {
  const tokenHash = sha256(rawToken);

  // Look up the MagicLinkToken by hash
  const tokenRecord = await db.magicLinkToken.findUnique({
    where: { tokenHash },
    include: { artist: true },
  });

  if (!tokenRecord) {
    throw new AuthError('LINK_INVALID', 'Magic link token is invalid.');
  }

  if (tokenRecord.usedAt !== null) {
    throw new AuthError('LINK_USED', 'Magic link token has already been used.');
  }

  const now = _now ?? new Date();
  if (tokenRecord.expiresAt < now) {
    throw new AuthError('LINK_EXPIRED', 'Magic link token has expired.');
  }

  // Mark token as used
  await db.magicLinkToken.update({
    where: { tokenHash },
    data: { usedAt: now },
  });

  // Determine role
  const artist = tokenRecord.artist;
  const role: 'artist' | 'admin' = isAdminEmail(artist.email) ? 'admin' : 'artist';

  // Generate a cryptographically random session token
  const rawSessionToken = randomHex(32);
  const sessionTokenHash = sha256(rawSessionToken);

  // Session expires in 30 days
  const sessionExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Create Session record
  await db.session.create({
    data: {
      artistId: artist.id,
      sessionTokenHash,
      role,
      expiresAt: sessionExpiresAt,
      lastActiveAt: now,
    },
  });

  return {
    sessionId: rawSessionToken, // client stores this in a cookie
    artistId: artist.id,
    role,
    expiresAt: sessionExpiresAt,
  };
}
