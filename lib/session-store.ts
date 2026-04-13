/**
 * Session store for edge middleware.
 *
 * Uses a simple in-memory Map as the implementation for local dev / testing.
 * Can be swapped for Cloudflare KV / Vercel KV by replacing the implementation
 * while keeping the same interface.
 *
 * Requirements: 12.4, 12.5
 */

import type { SessionData } from './auth';

// ---------------------------------------------------------------------------
// In-memory store (local dev / testing)
// ---------------------------------------------------------------------------

interface StoredSession {
  data: SessionData;
  expiresAtMs: number;
}

const memoryStore = new Map<string, StoredSession>();

export async function setSession(
  sessionId: string,
  data: SessionData,
  ttlSeconds: number,
): Promise<void> {
  const expiresAtMs = Date.now() + ttlSeconds * 1000;
  memoryStore.set(sessionId, { data, expiresAtMs });
}

export async function getSession(sessionId: string): Promise<SessionData | null> {
  const entry = memoryStore.get(sessionId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAtMs) {
    memoryStore.delete(sessionId);
    return null;
  }
  return entry.data;
}

export async function deleteSession(sessionId: string): Promise<void> {
  memoryStore.delete(sessionId);
}
