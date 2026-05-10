/**
 * One-off operator script: promote or demote an artist account via the DB-backed `isAdmin` flag.
 *
 * Usage:
 *   npm run db:set-admin -- artist@example.com
 *   npm run db:set-admin -- artist@example.com --revoke
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import {
  emailLookupHash,
  isPiiCryptoConfigured,
  normalizeEmailForLookup,
} from "../lib/pii-crypto";
import { logSafeError } from "../lib/safe-log";

function loadEnvFiles(): void {
  for (const name of [".env.local", ".env"]) {
    const path = join(process.cwd(), name);
    if (!existsSync(path)) continue;
    const content = readFileSync(path, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}

function normalizeDatabaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/^['"]|['"]$/g, "");
  try {
    const url = new URL(trimmed);
    url.searchParams.delete("channel_binding");
    return url.toString();
  } catch {
    return trimmed;
  }
}

if (typeof WebSocket === "undefined") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    neonConfig.webSocketConstructor = require("ws");
  } catch {
    // Node may already provide WebSocket.
  }
}

function createPrismaForScript(): PrismaClient {
  loadEnvFiles();
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) throw new Error("DATABASE_URL is not set.");
  const adapter = new PrismaNeon({ connectionString: normalizeDatabaseUrl(raw) });
  return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);
}

async function main() {
  loadEnvFiles();
  const emailArg = process.argv[2]?.trim();
  const revoke = process.argv.includes("--revoke");
  if (!emailArg) {
    throw new Error("Usage: npm run db:set-admin -- artist@example.com [--revoke]");
  }

  const normalized = normalizeEmailForLookup(emailArg);
  const lookup = isPiiCryptoConfigured() ? emailLookupHash(normalized) : null;
  const prisma = createPrismaForScript();

  try {
    const artist = await prisma.artist.findFirst({
      where: {
        OR: [
          ...(lookup ? [{ emailLookupHash: lookup }] : []),
          { email: normalized },
          { email: emailArg.trim() },
        ],
      },
      select: { id: true, fullName: true, isAdmin: true },
    });

    if (!artist) {
      throw new Error(`No artist found for ${normalized}`);
    }

    await prisma.artist.update({
      where: { id: artist.id },
      data: { isAdmin: !revoke },
    });

    console.log(
      `${revoke ? "Revoked" : "Granted"} admin access for ${artist.fullName} (${artist.id}).`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  logSafeError("[scripts/set-artist-admin]", error);
  process.exit(1);
});
