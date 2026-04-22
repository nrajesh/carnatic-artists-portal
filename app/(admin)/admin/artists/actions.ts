"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { revalidateHomeMarketing } from "@/lib/cache/home-marketing";
import { deleteArtistById } from "@/lib/admin-delete-artists";
import { analyticsServer } from "@/lib/analytics-server";
import { decryptArtistStoredContact } from "@/lib/artist-pii";
import { getDb } from "@/lib/db";
import { prismaStringIdArraySchema } from "@/lib/prisma-string-id";
import { sendSuspensionNoticeEmail } from "@/lib/suspension-email";
import { suspensionThreadPayloadFromAdminNote } from "@/lib/suspension-thread";
import { verifySession } from "@/lib/session-jwt";

const IdsSchema = prismaStringIdArraySchema(100);

export type BulkDeleteArtistsResult =
  | { ok: true; deleted: number }
  | { ok: false; error: string };

async function requireAdmin(): Promise<{ artistId: string } | null> {
  const token = (await cookies()).get("session")?.value ?? null;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== "admin") return null;
  return { artistId: session.artistId };
}

export async function deleteArtistsAction(ids: string[]): Promise<BulkDeleteArtistsResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Unauthorized." };

  const parsed = IdsSchema.safeParse(ids);
  if (!parsed.success) {
    return { ok: false, error: "Invalid id list." };
  }

  const unique = [...new Set(parsed.data)].filter((id) => id !== admin.artistId);
  if (unique.length === 0) {
    return { ok: false, error: "Cannot delete your own account." };
  }

  let deleted = 0;
  try {
    await getDb().$transaction(async (tx) => {
      for (const id of unique) {
        const row = await tx.artist.findUnique({ where: { id }, select: { id: true } });
        if (!row) continue;
        await deleteArtistById(tx, id);
        deleted += 1;
      }
    });
  } catch {
    return { ok: false, error: "Could not delete one or more artists." };
  }

  revalidatePath("/admin/artists");
  revalidatePath("/admin/dashboard");
  revalidateHomeMarketing();
  return { ok: true, deleted };
}

const BULK_SUSPEND_COMMENT = "[Bulk] Suspended by admin.";

export type SetArtistsStatusBulkResult =
  | { ok: true; updated: number; skipped: number }
  | { ok: false; error: string };

/**
 * Bulk set suspension. Reactivating clears the suspension comment.
 * Suspending uses a fixed bulk comment; the admin's own account cannot be suspended.
 */
export async function setArtistsStatusBulkAction(
  ids: string[],
  suspended: boolean,
): Promise<SetArtistsStatusBulkResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Unauthorized." };

  const parsed = IdsSchema.safeParse(ids);
  if (!parsed.success) {
    return { ok: false, error: "Invalid id list." };
  }

  const unique = [...new Set(parsed.data)];
  let updated = 0;
  let skipped = 0;

  try {
    const db = getDb();
    if (suspended) {
      for (const id of unique) {
        if (id === admin.artistId) {
          skipped += 1;
          continue;
        }
        const row = await db.artist.findUnique({
          where: { id },
          select: {
            id: true,
            isSuspended: true,
            email: true,
            emailCipher: true,
            contactCipher: true,
            contactNumber: true,
          },
        });
        if (!row) {
          skipped += 1;
          continue;
        }
        const wasSuspended = row.isSuspended;
        await db.artist.update({
          where: { id },
          data: {
            isSuspended: true,
            suspensionComment: BULK_SUSPEND_COMMENT,
            suspensionThread: suspensionThreadPayloadFromAdminNote(BULK_SUSPEND_COMMENT),
          },
        });
        updated += 1;
        if (!wasSuspended) {
          const recipient = decryptArtistStoredContact(row).email;
          if (recipient) {
            void sendSuspensionNoticeEmail({ to: recipient, adminNote: BULK_SUSPEND_COMMENT });
          }
        }
        try {
          analyticsServer?.capture({
            distinctId: admin.artistId,
            event: "artist_suspension_changed",
            properties: { artist_id: id, suspended: true },
          });
        } catch {
          /* ignore */
        }
      }
    } else {
      for (const id of unique) {
        const row = await db.artist.findUnique({ where: { id }, select: { id: true } });
        if (!row) {
          skipped += 1;
          continue;
        }
        await db.artist.update({
          where: { id },
          data: {
            isSuspended: false,
            suspensionComment: null,
            suspensionThread: null,
          },
        });
        updated += 1;
        try {
          analyticsServer?.capture({
            distinctId: admin.artistId,
            event: "artist_suspension_changed",
            properties: { artist_id: id, suspended: false },
          });
        } catch {
          /* ignore */
        }
      }
    }
  } catch {
    return { ok: false, error: "Could not update artist status." };
  }

  revalidateHomeMarketing();
  revalidatePath("/admin/artists");
  revalidatePath("/admin/dashboard");
  return { ok: true, updated, skipped };
}
