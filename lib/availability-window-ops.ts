import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import {
  parseAvailabilityWindowDates,
  windowOverlapsExisting,
} from "@/lib/availability";

export type AvailabilityEntryView = {
  id: string;
  startDate: string;
  endDate: string;
};

export type AvailabilityActionResult =
  | { ok: true; entries: AvailabilityEntryView[] }
  | { ok: false; error: string };

export function fkViolationMessage(error: unknown): string | null {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2003"
  ) {
    return (
      "Could not save availability because your profile id is invalid for this database. Sign out and sign in again."
    );
  }
  return null;
}

export async function revalidateAvailabilityCaches(artistId: string): Promise<void> {
  revalidatePath("/profile/availability");
  revalidatePath("/dashboard");
  revalidatePath(`/admin/artists/${artistId}/edit`);
  revalidatePath(`/admin/artists/${artistId}/availability`);
  const artist = await getDb().artist.findUnique({
    where: { id: artistId },
    select: { slug: true },
  });
  if (artist?.slug) {
    revalidatePath(`/artists/${artist.slug}`);
  }
}

export async function listAvailabilityEntryViews(
  artistId: string,
): Promise<AvailabilityEntryView[]> {
  const entries = await getDb().availabilityEntry.findMany({
    where: { artistId },
    orderBy: [{ startDate: "asc" }, { endDate: "asc" }],
    select: { id: true, startDate: true, endDate: true },
  });

  return entries.map((entry) => ({
    id: entry.id,
    startDate: entry.startDate.toISOString().slice(0, 10),
    endDate: entry.endDate.toISOString().slice(0, 10),
  }));
}

export async function createAvailabilityWindowForArtist(
  artistId: string,
  input: { startDate: string; endDate: string },
): Promise<AvailabilityActionResult> {
  const parsed = parseAvailabilityWindowDates(input);
  if (!parsed.ok) return parsed;

  const existing = await getDb().availabilityEntry.findMany({
    where: { artistId },
    select: { id: true, startDate: true, endDate: true },
  });

  if (windowOverlapsExisting(parsed, existing)) {
    return { ok: false, error: "This window overlaps an existing availability range." };
  }

  try {
    await getDb().availabilityEntry.create({
      data: {
        artistId,
        startDate: parsed.startDate,
        endDate: parsed.endDate,
      },
    });
  } catch (e) {
    const fk = fkViolationMessage(e);
    if (fk) return { ok: false, error: fk };
    throw e;
  }

  await revalidateAvailabilityCaches(artistId);
  return { ok: true, entries: await listAvailabilityEntryViews(artistId) };
}

export async function updateAvailabilityWindowForArtist(
  artistId: string,
  input: { id: string; startDate: string; endDate: string },
): Promise<AvailabilityActionResult> {
  const id = input.id.trim();
  if (!id) return { ok: false, error: "Missing availability entry id." };

  const entry = await getDb().availabilityEntry.findFirst({
    where: { id, artistId },
    select: { id: true },
  });
  if (!entry) return { ok: false, error: "Availability entry not found." };

  const parsed = parseAvailabilityWindowDates(input);
  if (!parsed.ok) return parsed;

  const existing = await getDb().availabilityEntry.findMany({
    where: { artistId },
    select: { id: true, startDate: true, endDate: true },
  });

  if (windowOverlapsExisting(parsed, existing, id)) {
    return { ok: false, error: "This window overlaps an existing availability range." };
  }

  await getDb().availabilityEntry.update({
    where: { id },
    data: {
      startDate: parsed.startDate,
      endDate: parsed.endDate,
    },
  });

  await revalidateAvailabilityCaches(artistId);
  return { ok: true, entries: await listAvailabilityEntryViews(artistId) };
}

export async function deleteAvailabilityWindowForArtist(
  artistId: string,
  input: { id: string },
): Promise<AvailabilityActionResult> {
  const id = input.id.trim();
  if (!id) return { ok: false, error: "Missing availability entry id." };

  const entry = await getDb().availabilityEntry.findFirst({
    where: { id, artistId },
    select: { id: true },
  });
  if (!entry) return { ok: false, error: "Availability entry not found." };

  await getDb().availabilityEntry.delete({
    where: { id },
  });

  await revalidateAvailabilityCaches(artistId);
  return { ok: true, entries: await listAvailabilityEntryViews(artistId) };
}
