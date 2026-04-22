"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  approvePendingRegistrationRouteStyle,
  rejectPendingRegistrationRouteStyle,
  revalidateAfterRegistrationMutation,
} from "@/lib/admin-registration-route-handlers";
import { REGISTRATION_APPROVE_DEFAULT_COMMENT } from "@/lib/admin-review-comment";
import { getDb } from "@/lib/db";
import { prismaStringIdArraySchema } from "@/lib/prisma-string-id";
import { verifySession } from "@/lib/session-jwt";

const IdsSchema = prismaStringIdArraySchema(200);

const BULK_REJECT_COMMENT = "[Bulk] Rejected by admin.";

const StatusSchema = z.enum(["pending", "approved", "rejected"]);

/** Counts for rows that did not change (used in bulk status banner). */
export type RegistrationBulkSkipBreakdown = {
  notFound: number;
  alreadyPending: number;
  alreadyApproved: number;
  alreadyRejected: number;
};

function emptySkipBreakdown(): RegistrationBulkSkipBreakdown {
  return { notFound: 0, alreadyPending: 0, alreadyApproved: 0, alreadyRejected: 0 };
}

export type BulkDeleteRegistrationsResult =
  | { ok: true; deleted: number }
  | { ok: false; error: string };

async function requireAdmin(): Promise<{ artistId: string } | null> {
  const token = (await cookies()).get("session")?.value ?? null;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== "admin") return null;
  return { artistId: session.artistId };
}

export async function deleteRegistrationRequestsAction(ids: string[]): Promise<BulkDeleteRegistrationsResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Unauthorized." };

  const parsed = IdsSchema.safeParse(ids);
  if (!parsed.success) {
    return { ok: false, error: "Invalid id list." };
  }

  const unique = [...new Set(parsed.data)];

  try {
    const result = await getDb().registrationRequest.deleteMany({
      where: { id: { in: unique } },
    });
    revalidatePath("/admin/registrations");
    revalidatePath("/admin/dashboard");
    return { ok: true, deleted: result.count };
  } catch {
    return { ok: false, error: "Could not delete registration requests." };
  }
}

export type SetRegistrationStatusBulkResult =
  | {
      ok: true;
      updated: number;
      skipped: number;
      skipBreakdown: RegistrationBulkSkipBreakdown;
      /** Approvals where the sign-in email was not delivered (Resend misconfiguration or API error). */
      magicLinkEmailNotSent?: number;
    }
  | { ok: false; error: string };

/**
 * Bulk status change. Rules:
 * - pending: only from rejected (reopens for review)
 * - rejected: only from pending
 * - approved: from pending or rejected only (already-approved rows are skipped)
 */
export async function setRegistrationStatusBulkAction(
  ids: string[],
  status: z.infer<typeof StatusSchema>,
): Promise<SetRegistrationStatusBulkResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Unauthorized." };

  const parsedIds = IdsSchema.safeParse(ids);
  if (!parsedIds.success) {
    return { ok: false, error: "Invalid id list." };
  }

  const parsedStatus = StatusSchema.safeParse(status);
  if (!parsedStatus.success) {
    return { ok: false, error: "Invalid status." };
  }

  const unique = [...new Set(parsedIds.data)];
  const distinctId = admin.artistId;
  let updated = 0;
  let skipped = 0;
  const skipBreakdown = emptySkipBreakdown();

  const db = getDb();

  try {
    if (parsedStatus.data === "pending") {
      const rows = await db.registrationRequest.findMany({
        where: { id: { in: unique } },
        select: { id: true, status: true },
      });
      const statusById = new Map(rows.map((r) => [r.id, r.status]));

      const result = await db.registrationRequest.updateMany({
        where: { id: { in: unique }, status: "rejected" },
        data: {
          status: "pending",
          reviewedAt: null,
          reviewedBy: null,
          reviewComment: null,
        },
      });
      updated = result.count;
      skipped = unique.length - result.count;

      for (const id of unique) {
        const st = statusById.get(id);
        if (st === undefined) skipBreakdown.notFound += 1;
        else if (st !== "rejected") {
          if (st === "pending") skipBreakdown.alreadyPending += 1;
          else if (st === "approved") skipBreakdown.alreadyApproved += 1;
          else skipBreakdown.alreadyRejected += 1;
        }
      }
    } else if (parsedStatus.data === "rejected") {
      const rows = await db.registrationRequest.findMany({
        where: { id: { in: unique } },
        select: { id: true, status: true },
      });
      const statusById = new Map(rows.map((r) => [r.id, r.status]));

      for (const registrationId of unique) {
        const res = await rejectPendingRegistrationRouteStyle({
          registrationId,
          reviewerId: admin.artistId,
          reviewComment: BULK_REJECT_COMMENT,
          analyticsDistinctId: distinctId,
        });
        if (res.ok) {
          updated += 1;
        } else {
          skipped += 1;
          const st = statusById.get(registrationId);
          if (st === undefined) skipBreakdown.notFound += 1;
          else if (st === "pending") skipBreakdown.alreadyPending += 1;
          else if (st === "approved") skipBreakdown.alreadyApproved += 1;
          else skipBreakdown.alreadyRejected += 1;
        }
      }
    } else {
      const rows = await db.registrationRequest.findMany({
        where: { id: { in: unique } },
        select: { id: true, status: true },
      });
      const statusById = new Map(rows.map((r) => [r.id, r.status]));

      let anyApproved = false;
      let magicLinkEmailNotSent = 0;
      for (const registrationId of unique) {
        const res = await approvePendingRegistrationRouteStyle({
          registrationId,
          reviewerId: admin.artistId,
          reviewComment: REGISTRATION_APPROVE_DEFAULT_COMMENT,
          analyticsDistinctId: distinctId,
        });
        if (res.ok) {
          updated += 1;
          anyApproved = true;
          if (!res.magicLinkEmailSent) magicLinkEmailNotSent += 1;
        } else {
          skipped += 1;
          const st = statusById.get(registrationId);
          if (st === undefined) skipBreakdown.notFound += 1;
          else if (st === "pending") skipBreakdown.alreadyPending += 1;
          else if (st === "approved") skipBreakdown.alreadyApproved += 1;
          else skipBreakdown.alreadyRejected += 1;
        }
      }
      if (anyApproved) {
        revalidateAfterRegistrationMutation();
      }
      revalidatePath("/admin/registrations");
      revalidatePath("/admin/dashboard");
      return {
        ok: true,
        updated,
        skipped,
        skipBreakdown,
        ...(magicLinkEmailNotSent > 0 ? { magicLinkEmailNotSent } : {}),
      };
    }
  } catch {
    return { ok: false, error: "Could not update registration status." };
  }

  revalidatePath("/admin/registrations");
  revalidatePath("/admin/dashboard");
  return { ok: true, updated, skipped, skipBreakdown };
}
