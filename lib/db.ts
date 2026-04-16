/**
 * Prisma + Neon on Cloudflare Workers (OpenNext).
 *
 * Do **not** create PrismaClient at module load — `process.env.DATABASE_URL` is
 * bound per request in the Worker.
 *
 * Use React `cache()` when available (React 19+) to dedupe one client per
 * request. On React 18, `cache` is missing — we fall back to creating a client
 * per `getDb()` call (multiple pools per request under heavy parallel queries;
 * acceptable for Neon serverless at moderate traffic).
 *
 * @see https://opennext.js.org/cloudflare/howtos/db
 */

import * as React from "react";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig, Pool } from "@neondatabase/serverless";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/** React 19+ `cache`; identity on React 18 so we never call `undefined(...)`. */
function requestMemo<T extends () => unknown>(factory: T): T {
  if (typeof React.cache === "function") {
    return React.cache(factory as never) as T;
  }
  return factory;
}

if (typeof WebSocket === "undefined") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    neonConfig.webSocketConstructor = require("ws");
  } catch {
    // Workers use native WebSocket
  }
}

/** Dashboard paste mistakes: values saved as `"postgresql://..."` break `new URL()`. */
function stripSurroundingQuotes(s: string): string {
  const t = s.trim();
  if (t.length >= 2) {
    if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
      return t.slice(1, -1).trim();
    }
  }
  return t;
}

/**
 * Neon console may append `channel_binding=require` (SCRAM channel binding).
 * That is aimed at libpq-style TCP clients; the serverless WebSocket driver +
 * PrismaNeon on Cloudflare Workers often fails to connect with it. TLS is
 * still enforced via `sslmode=require` (keep that in the URL).
 */
function normalizeDatabaseUrl(raw: string): string {
  const trimmed = stripSurroundingQuotes(raw);
  try {
    const u = new URL(trimmed);
    u.searchParams.delete("channel_binding");
    return u.toString();
  } catch {
    return trimmed;
  }
}

function resolveDatabaseUrl(): string {
  const fromProcess = process.env.DATABASE_URL?.trim();
  if (fromProcess) return normalizeDatabaseUrl(fromProcess);
  try {
    const { env } = getCloudflareContext();
    const fromBinding = (env as Record<string, string | undefined>).DATABASE_URL?.trim();
    if (fromBinding) return normalizeDatabaseUrl(fromBinding);
  } catch {
    // Not in a Cloudflare request context (e.g. `next start` without OpenNext)
  }
  throw new Error("DATABASE_URL environment variable is not set.");
}

export const getDb = requestMemo((): PrismaClient => {
  const connectionString = resolveDatabaseUrl();
  const pool = new Pool({ connectionString });
  const adapter = new PrismaNeon(pool);
  return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);
});
