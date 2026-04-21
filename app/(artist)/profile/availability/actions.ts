"use server";

import { cookies } from "next/headers";
import { verifySession } from "@/lib/session-jwt";
import { getDb } from "@/lib/db";
import {
  type AvailabilityActionResult,
  type AvailabilityEntryView,
  createAvailabilityWindowForArtist,
  deleteAvailabilityWindowForArtist,
  updateAvailabilityWindowForArtist,
} from "@/lib/availability-window-ops";

export type { AvailabilityActionResult, AvailabilityEntryView };

async function getCurrentSessionArtistId(): Promise<string | null> {
  const token = (await cookies()).get("session")?.value ?? null;
  const session = token ? await verifySession(token) : null;
  return session?.artistId ?? null;
}

/** Ensures JWT artistId refers to a real row (avoids FK errors from dev-login synthetic ids or stale sessions). */
async function requireExistingArtistForAvailability(): Promise<
  { ok: true; artistId: string } | { ok: false; error: string }
> {
  const artistId = await getCurrentSessionArtistId();
  if (!artistId) return { ok: false, error: "Not signed in." };

  const exists = await getDb().artist.findUnique({
    where: { id: artistId },
    select: { id: true },
  });
  if (!exists) {
    return {
      ok: false,
      error:
        "Your profile was not found for this database. Sign out and sign in again.",
    };
  }
  return { ok: true, artistId };
}

export async function createAvailabilityWindowAction(input: {
  startDate: string;
  endDate: string;
}): Promise<AvailabilityActionResult> {
  const auth = await requireExistingArtistForAvailability();
  if (!auth.ok) return auth;
  return createAvailabilityWindowForArtist(auth.artistId, input);
}

export async function updateAvailabilityWindowAction(input: {
  id: string;
  startDate: string;
  endDate: string;
}): Promise<AvailabilityActionResult> {
  const auth = await requireExistingArtistForAvailability();
  if (!auth.ok) return auth;
  return updateAvailabilityWindowForArtist(auth.artistId, input);
}

export async function deleteAvailabilityWindowAction(input: {
  id: string;
}): Promise<AvailabilityActionResult> {
  const auth = await requireExistingArtistForAvailability();
  if (!auth.ok) return auth;
  return deleteAvailabilityWindowForArtist(auth.artistId, input);
}
