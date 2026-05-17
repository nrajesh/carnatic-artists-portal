"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  canUseArtistConnections,
  createConnectionRequest,
  removeConnectionForArtist,
  updateConnectionRequest,
} from "@/lib/artist-connections";
import { verifySession } from "@/lib/session-jwt";

async function requireSessionArtistId(): Promise<string> {
  const token = (await cookies()).get("session")?.value ?? null;
  const session = token ? await verifySession(token) : null;
  if (!session) throw new Error("UNAUTHENTICATED");
  return session.artistId;
}

async function assertConnectionsAvailableForArtist(artistId: string): Promise<void> {
  const ok = await canUseArtistConnections({ distinctId: artistId });
  if (!ok) throw new Error("Artist connections are not available.");
}

function cleanString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function requestConnectionAction(formData: FormData): Promise<void> {
  const requesterId = await requireSessionArtistId();
  await assertConnectionsAvailableForArtist(requesterId);
  const recipientId = cleanString(formData.get("recipientId"));
  if (!recipientId) throw new Error("Missing artist id.");
  await createConnectionRequest(requesterId, recipientId);
  revalidatePath("/connections");
  revalidatePath("/dashboard");
}

export async function approveConnectionAction(formData: FormData): Promise<void> {
  const artistId = await requireSessionArtistId();
  await assertConnectionsAvailableForArtist(artistId);
  const connectionId = cleanString(formData.get("connectionId"));
  if (!connectionId) throw new Error("Missing connection id.");
  await updateConnectionRequest(artistId, connectionId, "APPROVED");
  revalidatePath("/connections");
  revalidatePath("/dashboard");
  revalidatePath("/profile/edit");
}

export async function rejectConnectionAction(formData: FormData): Promise<void> {
  const artistId = await requireSessionArtistId();
  await assertConnectionsAvailableForArtist(artistId);
  const connectionId = cleanString(formData.get("connectionId"));
  if (!connectionId) throw new Error("Missing connection id.");
  await updateConnectionRequest(artistId, connectionId, "REJECTED");
  revalidatePath("/connections");
  revalidatePath("/dashboard");
}

export async function removeConnectionAction(formData: FormData): Promise<void> {
  const artistId = await requireSessionArtistId();
  await assertConnectionsAvailableForArtist(artistId);
  const connectionId = cleanString(formData.get("connectionId"));
  if (!connectionId) throw new Error("Missing connection id.");
  await removeConnectionForArtist(artistId, connectionId);
  revalidatePath("/connections");
  revalidatePath("/dashboard");
  revalidatePath("/profile/edit");
}
