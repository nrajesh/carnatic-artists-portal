/**
 * Fixes duplicate (primaryColor, textColor) pairs on Speciality rows.
 *
 * - Normalises hex casing to uppercase.
 * - For each duplicate group: keeps the seeded palette owner when it matches
 *   lib/speciality-theme.ts + prisma/seed.ts; otherwise keeps the first name
 *   alphabetically. All other rows in the group get new WCAG-safe random pairs.
 *
 * Run: `pnpm run db:dedupe-speciality-colors`
 *
 * Requires DATABASE_URL (see .env.local - same as other db scripts).
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import { chooseKeeperForDuplicateColourGroup } from "../lib/speciality-color-pair-dedupe";
import {
  pickRandomUniqueSpecialityColorPair,
  specialityColorPairKey,
} from "../lib/speciality-random-colors";

function loadEnvFiles(): void {
  for (const name of [".env.local", ".env"]) {
    const p = join(process.cwd(), name);
    if (!existsSync(p)) continue;
    const content = readFileSync(p, "utf8");
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

function stripSurroundingQuotes(s: string): string {
  const t = s.trim();
  if (t.length >= 2) {
    if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
      return t.slice(1, -1).trim();
    }
  }
  return t;
}

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

if (typeof WebSocket === "undefined") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    neonConfig.webSocketConstructor = require("ws");
  } catch {
    // Node 22+ may provide global WebSocket
  }
}

function createPrismaForScript(): PrismaClient {
  loadEnvFiles();
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) {
    throw new Error("DATABASE_URL is not set (add to .env.local or the environment).");
  }
  const connectionString = normalizeDatabaseUrl(raw);
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);
}

async function main() {
  const prisma = createPrismaForScript();
  try {
    const all = await prisma.speciality.findMany({ orderBy: { name: "asc" } });

    let casingFixes = 0;
    for (const r of all) {
      const pu = r.primaryColor.trim().toUpperCase();
      const tu = r.textColor.trim().toUpperCase();
      if (pu === r.primaryColor && tu === r.textColor) continue;
      await prisma.speciality.update({
        where: { id: r.id },
        data: { primaryColor: pu, textColor: tu },
      });
      casingFixes += 1;
    }

    const refreshed = await prisma.speciality.findMany({ orderBy: { name: "asc" } });
    const byPair = new Map<string, typeof refreshed>();
    for (const r of refreshed) {
      const k = specialityColorPairKey(r.primaryColor, r.textColor);
      const arr = byPair.get(k) ?? [];
      arr.push(r);
      byPair.set(k, arr);
    }

    const occupied = new Set<string>();
    for (const [k, g] of byPair) {
      if (g.length === 1) occupied.add(k);
    }

    let reassigned = 0;
    for (const [, g] of byPair) {
      if (g.length < 2) continue;
      const { keeper, others } = chooseKeeperForDuplicateColourGroup(g);
      occupied.add(specialityColorPairKey(keeper.primaryColor, keeper.textColor));
      for (const row of others) {
        const pair = pickRandomUniqueSpecialityColorPair(occupied);
        if (!pair) {
          throw new Error(`Could not find a unique WCAG-safe colour pair for "${row.name}".`);
        }
        await prisma.speciality.update({
          where: { id: row.id },
          data: { primaryColor: pair.primaryColor, textColor: pair.textColor },
        });
        occupied.add(specialityColorPairKey(pair.primaryColor, pair.textColor));
        reassigned += 1;
        console.log(
          `Updated "${row.name}": ${specialityColorPairKey(row.primaryColor, row.textColor)} → ${specialityColorPairKey(pair.primaryColor, pair.textColor)}`,
        );
      }
    }

    console.log(`Casing normalisations: ${casingFixes}. Duplicate groups resolved: ${reassigned} row(s) reassigned.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
