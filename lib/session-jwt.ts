/**
 * JWT-based session helpers.
 *
 * Sessions are encoded as signed JWTs stored in the `session` cookie.
 * This works in both Node.js API routes and Edge middleware without any
 * shared in-memory store.
 *
 * Secret: SESSION_SECRET env var (min 32 chars). Falls back to a dev-only
 * default so local dev works without configuration.
 */

import { SignJWT, jwtVerify } from 'jose';
import type { SessionData } from './auth';

const DEV_SECRET = 'dev-secret-do-not-use-in-production-32chars!!';

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET ?? DEV_SECRET;
  return new TextEncoder().encode(secret);
}

/** Sign a SessionData payload into a JWT string. */
export async function signSession(data: SessionData): Promise<string> {
  return new SignJWT({
    sessionId: data.sessionId,
    artistId: data.artistId,
    role: data.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(data.expiresAt)
    .setIssuedAt()
    .sign(getSecret());
}

/** Verify and decode a JWT session token. Returns null if invalid/expired. */
export async function verifySession(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      sessionId: payload.sessionId as string,
      artistId: payload.artistId as string,
      role: payload.role as 'artist' | 'admin',
      expiresAt: new Date((payload.exp ?? 0) * 1000),
    };
  } catch {
    return null;
  }
}
