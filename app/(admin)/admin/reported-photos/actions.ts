"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { revalidateHomeMarketing } from "@/lib/cache/home-marketing";
import { getDb } from "@/lib/db";
import { resolveOpenProfilePhotoReports } from "@/lib/profile-photo-reports";
import { decryptArtistStoredContact } from "@/lib/artist-pii";
import { prismaStringIdArraySchema } from "@/lib/prisma-string-id";
import { deleteManagedProfilePhotoBestEffort } from "@/lib/profile-photo-storage";
import { verifySession } from "@/lib/session-jwt";
import { sendSuspensionNoticeEmail } from "@/lib/suspension-email";
import { suspensionThreadPayloadFromAdminNote } from "@/lib/suspension-thread";

const IdsSchema = prismaStringIdArraySchema(100);
const REPEAT_REPORT_SUSPEND_COMMENT =
  "[Profile moderation] Suspended after repeated profile reports pending admin review.";

type ActionResult = { ok: true; updated: number; skipped: number } | { ok: false; error: string };

async function requireAdmin(): Promise<{ artistId: string } | null> {
  const token = (await cookies()).get("session")?.value ?? null;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== "admin") return null;
  return { artistId: session.artistId };
}

function revalidateArtistModerationPaths(artists: Array<{ id: string; slug: string }>) {
  revalidatePath("/admin/reported-photos");
  revalidatePath("/admin/reported-profiles");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/artists");
  for (const artist of artists) {
    revalidatePath(`/admin/artists/${artist.id}`);
    revalidatePath(`/admin/artists/${artist.id}/edit`);
    revalidatePath(`/artists/${artist.slug}`);
  }
  revalidateHomeMarketing();
}

export async function resolveProfilePhotoReportsAction(ids: string[]): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Unauthorized." };

  const parsed = IdsSchema.safeParse(ids);
  if (!parsed.success) return { ok: false, error: "Invalid id list." };

  const unique = [...new Set(parsed.data)];
  if (unique.length === 0) return { ok: false, error: "Select at least one artist." };

  const artists = await getDb().artist.findMany({
    where: { id: { in: unique } },
    select: { id: true, slug: true },
  });
  const foundIds = new Set(artists.map((artist) => artist.id));
  const updated = await resolveOpenProfilePhotoReports({
    artistIds: unique,
    resolvedBy: admin.artistId,
  });

  revalidateArtistModerationPaths(artists);
  return { ok: true, updated, skipped: unique.length - foundIds.size };
}

export async function clearReportedProfilePhotosAction(ids: string[]): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Unauthorized." };

  const parsed = IdsSchema.safeParse(ids);
  if (!parsed.success) return { ok: false, error: "Invalid id list." };

  const unique = [...new Set(parsed.data)];
  if (unique.length === 0) return { ok: false, error: "Select at least one artist." };

  const artists = await getDb().artist.findMany({
    where: { id: { in: unique } },
    select: {
      id: true,
      slug: true,
      profilePhotoObjectKey: true,
      profilePhotoUrl: true,
    },
  });

  const foundIds = new Set(artists.map((artist) => artist.id));
  const toClear = artists.filter((artist) => artist.profilePhotoUrl);
  await getDb().$transaction(async (tx) => {
    if (toClear.length > 0) {
      await Promise.all(
        toClear.map((artist) =>
          tx.artist.update({
            where: { id: artist.id },
            data: {
              profilePhotoUrl: null,
              profilePhotoSourceUrl: null,
              profilePhotoObjectKey: null,
              profilePhotoRightsConfirmedAt: null,
            },
          }),
        ),
      );
    }
  });
  await resolveOpenProfilePhotoReports({
    artistIds: unique,
    resolvedBy: admin.artistId,
  });

  await Promise.all(
    toClear.map((artist) => deleteManagedProfilePhotoBestEffort(artist.profilePhotoObjectKey)),
  );

  revalidateArtistModerationPaths(artists.map((artist) => ({ id: artist.id, slug: artist.slug })));
  return {
    ok: true,
    updated: toClear.length,
    skipped: unique.length - foundIds.size,
  };
}

export async function suspendReportedArtistsAction(ids: string[]): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Unauthorized." };

  const parsed = IdsSchema.safeParse(ids);
  if (!parsed.success) return { ok: false, error: "Invalid id list." };

  const unique = [...new Set(parsed.data)];
  if (unique.length === 0) return { ok: false, error: "Select at least one artist." };

  const artists = await getDb().artist.findMany({
    where: { id: { in: unique } },
    select: {
      id: true,
      slug: true,
      profilePhotoObjectKey: true,
      profilePhotoUrl: true,
      isSuspended: true,
      email: true,
      emailCipher: true,
      contactCipher: true,
      contactNumber: true,
    },
  });

  let updated = 0;
  let skipped = 0;
  const emailRecipients: string[] = [];
  const toDeleteObjectKeys: Array<string | null> = [];
  const revalidateArtists: Array<{ id: string; slug: string }> = [];

  await getDb().$transaction(async (tx) => {
    for (const artist of artists) {
      revalidateArtists.push({ id: artist.id, slug: artist.slug });
      if (artist.id === admin.artistId) {
        skipped += 1;
        continue;
      }

      await tx.artist.update({
        where: { id: artist.id },
        data: {
          isSuspended: true,
          suspensionComment: REPEAT_REPORT_SUSPEND_COMMENT,
          suspensionThread: suspensionThreadPayloadFromAdminNote(REPEAT_REPORT_SUSPEND_COMMENT),
          profilePhotoUrl: null,
          profilePhotoSourceUrl: null,
          profilePhotoObjectKey: null,
          profilePhotoRightsConfirmedAt: null,
        },
      });
      if (!artist.isSuspended) {
        const recipient = decryptArtistStoredContact(artist).email;
        if (recipient) emailRecipients.push(recipient);
      }
      if (artist.profilePhotoUrl) toDeleteObjectKeys.push(artist.profilePhotoObjectKey);
      updated += 1;
    }
  });

  await resolveOpenProfilePhotoReports({
    artistIds: artists.filter((artist) => artist.id !== admin.artistId).map((artist) => artist.id),
    resolvedBy: admin.artistId,
  });

  await Promise.all(toDeleteObjectKeys.map((key) => deleteManagedProfilePhotoBestEffort(key)));
  await Promise.all(
    emailRecipients.map((to) =>
      sendSuspensionNoticeEmail({ to, adminNote: REPEAT_REPORT_SUSPEND_COMMENT }),
    ),
  );

  revalidateArtistModerationPaths(revalidateArtists);
  return {
    ok: true,
    updated,
    skipped: skipped + (unique.length - artists.length),
  };
}
