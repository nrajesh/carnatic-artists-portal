import { Prisma } from "@prisma/client";
import { getDb } from "@/lib/db";

export async function createProfilePhotoReport(input: {
  artistId: string;
  reporterId: string;
}): Promise<boolean> {
  const db = getDb();
  const inserted = await db.$executeRaw`
    INSERT INTO "ProfilePhotoReport" ("id", "artistId", "reporterId", "createdAt")
    SELECT gen_random_uuid()::text, ${input.artistId}, ${input.reporterId}, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (
      SELECT 1
      FROM "ProfilePhotoReport"
      WHERE "artistId" = ${input.artistId}
        AND "reporterId" = ${input.reporterId}
        AND "resolvedAt" IS NULL
    )
  `;
  return inserted > 0;
}

export async function hasOpenProfilePhotoReport(input: {
  artistId: string;
  reporterId: string;
}): Promise<boolean> {
  const db = getDb();
  const count = await db.profilePhotoReport.count({
    where: {
      artistId: input.artistId,
      reporterId: input.reporterId,
      resolvedAt: null,
    },
  });
  return count > 0;
}

export async function resolveOpenProfilePhotoReports(input: {
  artistIds: string[];
  resolvedBy: string;
}): Promise<number> {
  if (input.artistIds.length === 0) return 0;
  const db = getDb();
  return db.$executeRaw`
    UPDATE "ProfilePhotoReport"
    SET "resolvedAt" = CURRENT_TIMESTAMP,
        "resolvedBy" = ${input.resolvedBy}
    WHERE "resolvedAt" IS NULL
      AND "artistId" IN (${Prisma.join(input.artistIds)})
  `;
}
