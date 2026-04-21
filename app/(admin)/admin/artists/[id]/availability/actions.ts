"use server";

import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { verifySession } from "@/lib/session-jwt";
import {
  type AvailabilityActionResult,
  type AvailabilityEntryView,
  createAvailabilityWindowForArtist,
  deleteAvailabilityWindowForArtist,
  updateAvailabilityWindowForArtist,
} from "@/lib/availability-window-ops";

export type { AvailabilityActionResult, AvailabilityEntryView };

async function requireAdminForTarget(targetArtistId: string): Promise<
  { ok: true; artistId: string } | { ok: false; error: string }
> {
  const token = (await cookies()).get("session")?.value ?? null;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== "admin") {
    return { ok: false, error: "Not authorized." };
  }

  const target = await getDb().artist.findUnique({
    where: { id: targetArtistId },
    select: { id: true },
  });
  if (!target) {
    return { ok: false, error: "Artist not found." };
  }
  return { ok: true, artistId: targetArtistId };
}

export async function createAdminAvailabilityWindowAction(
  targetArtistId: string,
  input: { startDate: string; endDate: string },
): Promise<AvailabilityActionResult> {
  const auth = await requireAdminForTarget(targetArtistId);
  if (!auth.ok) return auth;
  return createAvailabilityWindowForArtist(auth.artistId, input);
}

export async function updateAdminAvailabilityWindowAction(
  targetArtistId: string,
  input: { id: string; startDate: string; endDate: string },
): Promise<AvailabilityActionResult> {
  const auth = await requireAdminForTarget(targetArtistId);
  if (!auth.ok) return auth;
  return updateAvailabilityWindowForArtist(auth.artistId, input);
}

export async function deleteAdminAvailabilityWindowAction(
  targetArtistId: string,
  input: { id: string },
): Promise<AvailabilityActionResult> {
  const auth = await requireAdminForTarget(targetArtistId);
  if (!auth.ok) return auth;
  return deleteAvailabilityWindowForArtist(auth.artistId, input);
}
