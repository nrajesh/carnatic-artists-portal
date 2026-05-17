/**
 * One-off operator script: remove collab data, delete suspended artists, and
 * normalize surviving legacy numeric artist IDs to UUID-style IDs.
 *
 * Usage:
 *   npm run db:normalize-artist-ids
 */

import { randomUUID } from "crypto";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
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

type LegacyArtistRow = {
  id: string;
  slug: string;
  fullName: string;
};

async function listLegacyNumericArtists(prisma: PrismaClient): Promise<LegacyArtistRow[]> {
  return prisma.$queryRawUnsafe(`
    SELECT
      id::text AS id,
      slug::text AS slug,
      "fullName"::text AS "fullName"
    FROM "Artist"
    WHERE id ~ '^[0-9]{1,2}$'
    ORDER BY CAST(id AS integer)
  `) as Promise<LegacyArtistRow[]>;
}

async function main() {
  const prisma = createPrismaForScript();

  try {
    const before = {
      artists: await prisma.artist.count(),
      suspendedArtists: await prisma.artist.count({ where: { isSuspended: true } }),
      collabs: await prisma.collab.count(),
      collabMembers: await prisma.collabMember.count(),
      collabMessages: await prisma.collabMessage.count(),
      feedback: await prisma.feedback.count(),
      legacyNumericArtists: (await listLegacyNumericArtists(prisma)).length,
    };

    console.log("Starting artist cleanup...");
    console.log(JSON.stringify(before, null, 2));

    await prisma.$transaction([
      prisma.feedback.deleteMany(),
      prisma.collabMessage.deleteMany(),
      prisma.collabMember.deleteMany(),
      prisma.collab.deleteMany(),
      prisma.dailyFeatured.deleteMany({
        where: {
          artist: {
            isSuspended: true,
          },
        },
      }),
      prisma.artist.deleteMany({ where: { isSuspended: true } }),
    ]);

    const legacyArtists = await listLegacyNumericArtists(prisma);
    const normalizedIds: Array<{ oldId: string; newId: string; slug: string }> = [];

    for (const artist of legacyArtists) {
      const newId = randomUUID();
      await prisma.$executeRawUnsafe(`UPDATE "Artist" SET id = $1 WHERE id = $2`, newId, artist.id);
      normalizedIds.push({ oldId: artist.id, newId, slug: artist.slug });
    }

    const after = {
      artists: await prisma.artist.count(),
      suspendedArtists: await prisma.artist.count({ where: { isSuspended: true } }),
      collabs: await prisma.collab.count(),
      collabMembers: await prisma.collabMember.count(),
      collabMessages: await prisma.collabMessage.count(),
      feedback: await prisma.feedback.count(),
      legacyNumericArtists: (await listLegacyNumericArtists(prisma)).length,
    };

    console.log("Cleanup complete.");
    console.log(JSON.stringify({ normalizedIds, after }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  logSafeError("[scripts/normalize-artist-ids-and-cleanup]", error);
  process.exit(1);
});
