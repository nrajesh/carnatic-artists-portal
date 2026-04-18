import type { PrismaClient } from "@prisma/client";
import {
  DEFAULT_SPECIALITY_PRIMARY,
  DEFAULT_SPECIALITY_TEXT,
  normalizeSpecialityLabel,
} from "@/lib/speciality-catalog";

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

  const created = await db.speciality.create({
    data: {
      name,
      primaryColor: DEFAULT_SPECIALITY_PRIMARY,
      textColor: DEFAULT_SPECIALITY_TEXT,
    },
    select: { id: true },
  });
  return created;
}
