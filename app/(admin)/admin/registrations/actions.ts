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
  | { ok: true; updated: number; skipped: number }
  | { ok: false; error: string };

/**
 * Bulk status change. Rules:
 * - pending: only from rejected (reopens for review)
 * - rejected: only from pending
 * - approved: only from pending (full approve flow per row)
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

  try {
    if (parsedStatus.data === "pending") {
      const result = await getDb().registrationRequest.updateMany({
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
    } else if (parsedStatus.data === "rejected") {
      for (const registrationId of unique) {
        const res = await rejectPendingRegistrationRouteStyle({
          registrationId,
          reviewerId: admin.artistId,
          reviewComment: BULK_REJECT_COMMENT,
          analyticsDistinctId: distinctId,
        });
        if (res.ok) updated += 1;
        else skipped += 1;
      }
    } else {
      let anyApproved = false;
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
        } else {
          skipped += 1;
        }
      }
      if (anyApproved) {
        revalidateAfterRegistrationMutation();
      }
    }
  } catch {
    return { ok: false, error: "Could not update registration status." };
  }

  revalidatePath("/admin/registrations");
  revalidatePath("/admin/dashboard");
  return { ok: true, updated, skipped };
}
