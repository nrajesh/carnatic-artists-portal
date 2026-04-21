import type { PrismaClient } from "@prisma/client";
import {
  DEFAULT_SPECIALITY_PRIMARY,
  DEFAULT_SPECIALITY_TEXT,
  normalizeSpecialityLabel,
} from "@/lib/speciality-catalog";
import {
  pickRandomUniqueSpecialityColorPair,
  specialityColorPairKey,
} from "@/lib/speciality-random-colors";

/**
 * Find an existing speciality by case-insensitive name, or create one with default theme colours.
 * Used when approving a registration so custom applicant labels become catalogue rows + artist links.
 */
export async function resolveSpecialityForApproval(
  db: PrismaClient,
  rawName: string,
): Promise<{ id: string } | null> {
  const name = normalizeSpecialityLabel(rawName);
  if (name.length < 2) return null;

  const existing = await db.speciality.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) return existing;

  const occupiedRows = await db.speciality.findMany({
    select: { primaryColor: true, textColor: true },
  });
  const forbidden = new Set(
    occupiedRows.map((r) => specialityColorPairKey(r.primaryColor, r.textColor)),
  );
  const picked =
    pickRandomUniqueSpecialityColorPair(forbidden) ?? {
      primaryColor: DEFAULT_SPECIALITY_PRIMARY,
      textColor: DEFAULT_SPECIALITY_TEXT,
    };

  const created = await db.speciality.create({
    data: {
      name,
      primaryColor: picked.primaryColor,
      textColor: picked.textColor,
    },
    select: { id: true },
  });
  return created;
}
