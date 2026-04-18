"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { verifySession } from "@/lib/session-jwt";
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

async function getCurrentSessionArtistId(): Promise<string | null> {
  const token = (await cookies()).get("session")?.value ?? null;
  const session = token ? await verifySession(token) : null;
  return session?.artistId ?? null;
}

async function listEntriesForArtist(artistId: string): Promise<AvailabilityEntryView[]> {
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

async function revalidateAvailabilityViews(artistId: string): Promise<void> {
  revalidatePath("/profile/availability");
  revalidatePath("/dashboard");
  const artist = await getDb().artist.findUnique({
    where: { id: artistId },
    select: { slug: true },
  });
  if (artist?.slug) {
    revalidatePath(`/artists/${artist.slug}`);
  }
}

export async function createAvailabilityWindowAction(input: {
  startDate: string;
  endDate: string;
}): Promise<AvailabilityActionResult> {
  const artistId = await getCurrentSessionArtistId();
  if (!artistId) return { ok: false, error: "Not signed in." };

  const parsed = parseAvailabilityWindowDates(input);
  if (!parsed.ok) return parsed;

  const existing = await getDb().availabilityEntry.findMany({
    where: { artistId },
    select: { id: true, startDate: true, endDate: true },
  });

  if (windowOverlapsExisting(parsed, existing)) {
    return { ok: false, error: "This window overlaps an existing availability range." };
  }

  await getDb().availabilityEntry.create({
    data: {
      artistId,
      startDate: parsed.startDate,
      endDate: parsed.endDate,
    },
  });

  await revalidateAvailabilityViews(artistId);
  return { ok: true, entries: await listEntriesForArtist(artistId) };
}

export async function updateAvailabilityWindowAction(input: {
  id: string;
  startDate: string;
  endDate: string;
}): Promise<AvailabilityActionResult> {
  const artistId = await getCurrentSessionArtistId();
  if (!artistId) return { ok: false, error: "Not signed in." };

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

  await revalidateAvailabilityViews(artistId);
  return { ok: true, entries: await listEntriesForArtist(artistId) };
}

export async function deleteAvailabilityWindowAction(input: {
  id: string;
}): Promise<AvailabilityActionResult> {
  const artistId = await getCurrentSessionArtistId();
  if (!artistId) return { ok: false, error: "Not signed in." };

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

  await revalidateAvailabilityViews(artistId);
  return { ok: true, entries: await listEntriesForArtist(artistId) };
}
