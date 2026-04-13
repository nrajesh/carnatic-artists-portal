/**
 * Singleton PrismaClient configured with the @neondatabase/serverless adapter.
 *
 * The Neon serverless adapter enables edge-compatible, pooled connections via
 * WebSockets - required for Next.js serverless functions on Vercel.
 *
 * Set DATABASE_URL to the Neon *pooled* connection string for serverless
 * functions. For migrations (prisma migrate dev / deploy) set DIRECT_DATABASE_URL
 * to the Neon *direct* (non-pooled) connection string.
 */

import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig, Pool } from '@neondatabase/serverless';

// Enable WebSocket connections for the Neon serverless driver.
// In Node.js environments (e.g. local dev / migrations) the ws package is used;
// in edge runtimes the native WebSocket API is used automatically.
if (typeof WebSocket === 'undefined') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    neonConfig.webSocketConstructor = require('ws');
  } catch {
    // ws not available in this environment - edge runtime uses native WebSocket
  }
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set.');
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaNeon(pool);

  return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);
}

// Reuse the client across hot-reloads in development to avoid exhausting
// the connection pool.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
