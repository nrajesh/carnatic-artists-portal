import "dotenv/config";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import sharp from "sharp";
import {
  deleteManagedProfilePhotoBestEffort,
  profilePhotoKeyForArtist,
} from "../lib/profile-photo-storage";
import { uploadFile } from "../lib/storage";

const OUTPUT_SIZE = 320;
const OUTPUT_CONTENT_TYPE = "image/jpeg";

type BackfillResult = {
  scanned: number;
  copied: number;
  skipped: number;
  failed: number;
};

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

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

async function fetchRemoteImage(sourceUrl: string): Promise<Buffer> {
  const response = await fetch(sourceUrl, {
    headers: {
      "user-agent": "artist-discovery-portal-profile-backfill/1.0",
      accept: "image/*,*/*;q=0.8",
    },
  });
  if (!response.ok) {
    throw new Error(`Download failed with ${response.status}`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("image/")) {
    throw new Error(`Unsupported content type: ${contentType || "unknown"}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function buildDerivative(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer, { failOn: "none" })
    .rotate()
    .resize(OUTPUT_SIZE, OUTPUT_SIZE, { fit: "cover", position: "attention" })
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
}

async function main() {
  const db = createPrismaForScript();
  try {
    const artists = await db.artist.findMany({
      where: {
        isSystemAccount: false,
        profilePhotoUrl: {
          not: null,
        },
      },
      select: {
        id: true,
        slug: true,
        fullName: true,
        profilePhotoUrl: true,
        profilePhotoSourceUrl: true,
        profilePhotoObjectKey: true,
      },
      orderBy: { fullName: "asc" },
    });

    const result: BackfillResult = {
      scanned: artists.length,
      copied: 0,
      skipped: 0,
      failed: 0,
    };

    for (const artist of artists) {
      const currentUrl = artist.profilePhotoUrl?.trim() ?? "";
      if (!currentUrl) {
        result.skipped += 1;
        console.log(`skip ${artist.slug}: empty profile photo`);
        continue;
      }
      if (artist.profilePhotoObjectKey && artist.profilePhotoSourceUrl) {
        result.skipped += 1;
        console.log(`skip ${artist.slug}: already backed by R2`);
        continue;
      }

      const sourceUrl = artist.profilePhotoSourceUrl?.trim() || currentUrl;
      if (!isHttpUrl(sourceUrl)) {
        result.skipped += 1;
        console.log(`skip ${artist.slug}: non-http source`);
        continue;
      }

      try {
        const remoteBuffer = await fetchRemoteImage(sourceUrl);
        const derivative = await buildDerivative(remoteBuffer);
        const objectKey = profilePhotoKeyForArtist(artist.id);
        const uploadedUrl = await uploadFile({
          key: objectKey,
          buffer: derivative,
          contentType: OUTPUT_CONTENT_TYPE,
          sizeBytes: derivative.length,
        });

        await db.artist.update({
          where: { id: artist.id },
          data: {
            profilePhotoUrl: uploadedUrl,
            profilePhotoSourceUrl: sourceUrl,
            profilePhotoObjectKey: objectKey,
          },
        });

        if (artist.profilePhotoObjectKey && artist.profilePhotoObjectKey !== objectKey) {
          await deleteManagedProfilePhotoBestEffort(artist.profilePhotoObjectKey);
        }

        result.copied += 1;
        console.log(`copied ${artist.slug}: ${sourceUrl} -> ${uploadedUrl}`);
      } catch (error) {
        result.failed += 1;
        console.error(
          `failed ${artist.slug}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    console.log(JSON.stringify(result, null, 2));
  } finally {
    await db.$disconnect();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
