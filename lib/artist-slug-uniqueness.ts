import { Prisma, type PrismaClient } from "@prisma/client";

export const ARTIST_SLUG_TAKEN_SUMMARY = "That profile URL is already taken.";
export const ARTIST_SLUG_TAKEN_FIELD = "This URL is already in use. Try another.";

/**
 * Returns the artist id that currently owns this slug, or null if unused.
 * Uses the unique index on `Artist.slug`.
 */
export async function findArtistIdOwningSlug(
  db: Pick<PrismaClient, "artist">,
  slug: string,
): Promise<string | null> {
  const row = await db.artist.findUnique({ where: { slug }, select: { id: true } });
  return row?.id ?? null;
}

/** True when Prisma reports a unique violation on `Artist.slug` (e.g. concurrent saves). */
export function isArtistSlugUniqueConstraintError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }
  const raw = error.meta?.target;
  const fields = Array.isArray(raw) ? raw.map(String) : typeof raw === "string" ? [raw] : [];
  return fields.includes("slug");
}
