"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { verifySession } from "@/lib/session-jwt";
import { notifyReviewEvent } from "@/lib/notifications";

async function requireSessionArtistId(): Promise<string> {
  const token = (await cookies()).get("session")?.value ?? null;
  const session = token ? await verifySession(token) : null;
  if (!session) throw new Error("UNAUTHENTICATED");
  return session.artistId;
}

function cleanString(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function splitEmails(raw: string): string[] {
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}


export async function createCollabAction(formData: FormData): Promise<void> {
  const artistId = await requireSessionArtistId();
  const name = cleanString(formData.get("name"));
  const description = cleanString(formData.get("description"));
  const invitedEmails = splitEmails(cleanString(formData.get("invitedEmails")));

  if (!name) throw new Error("Collab name is required.");

  const db = getDb();
  const invitedArtists = invitedEmails.length
    ? await db.artist.findMany({
        where: { email: { in: invitedEmails } },
        select: { id: true },
      })
    : [];
  const invitedIds = invitedArtists.map((a) => a.id).filter((id) => id !== artistId);

  const collab = await db.collab.create({
    data: {
      name,
      description: description || null,
      ownerId: artistId,
      status: "active",
    },
    select: { id: true },
  });

  await db.collabMember.createMany({
    data: [{ collabId: collab.id, artistId }, ...invitedIds.map((id) => ({ collabId: collab.id, artistId: id }))],
    skipDuplicates: true,
  });

  revalidatePath("/collabs");
  revalidatePath(`/collabs/${collab.id}`);
  revalidatePath("/dashboard");
}

export async function addCollabMessageAction(formData: FormData): Promise<void> {
  const artistId = await requireSessionArtistId();
  const collabId = cleanString(formData.get("collabId"));
  const content = cleanString(formData.get("content"));
  if (!collabId || !content) throw new Error("Message content is required.");

  const membership = await getDb().collabMember.findUnique({
    where: { collabId_artistId: { collabId, artistId } },
    select: { collabId: true, leftAt: true },
  });
  if (!membership || membership.leftAt !== null) throw new Error("You are not a member of this collab.");

  await getDb().collabMessage.create({
    data: {
      collabId,
      senderId: artistId,
      content,
    },
  });

  revalidatePath(`/collabs/${collabId}`);
}

export async function updateCollabStatusAction(formData: FormData): Promise<void> {
  const artistId = await requireSessionArtistId();
  const collabId = cleanString(formData.get("collabId"));
  const status = cleanString(formData.get("status"));
  if (!collabId) throw new Error("Missing collab id.");
  if (!["active", "completed", "completed_other", "incomplete"].includes(status)) {
    throw new Error("Invalid status.");
  }

  const collab = await getDb().collab.findUnique({
    where: { id: collabId },
    select: { ownerId: true },
  });
  if (!collab || collab.ownerId !== artistId) throw new Error("Only the collab owner can change status.");

  await getDb().collab.update({
    where: { id: collabId },
    data: {
      status,
      closedAt: status === "active" ? null : new Date(),
    },
  });
  revalidatePath("/collabs");
  revalidatePath(`/collabs/${collabId}`);
  revalidatePath("/dashboard");
}

export async function deleteCollabAction(formData: FormData): Promise<void> {
  const artistId = await requireSessionArtistId();
  const collabId = cleanString(formData.get("collabId"));
  if (!collabId) throw new Error("Missing collab id.");

  const collab = await getDb().collab.findUnique({
    where: { id: collabId },
    select: { ownerId: true },
  });
  if (!collab || collab.ownerId !== artistId) throw new Error("Only the collab owner can delete this collab.");

  await getDb().$transaction(async (tx) => {
    await tx.feedback.deleteMany({ where: { collabId } });
    await tx.collabMessage.deleteMany({ where: { collabId } });
    await tx.collabMember.deleteMany({ where: { collabId } });
    await tx.collab.delete({ where: { id: collabId } });
  });

  revalidatePath("/collabs");
  revalidatePath("/dashboard");
}

export async function upsertFeedbackAction(formData: FormData): Promise<void> {
  const reviewerId = await requireSessionArtistId();
  const collabId = cleanString(formData.get("collabId"));
  const revieweeId = cleanString(formData.get("revieweeId"));
  const comment = cleanString(formData.get("comment"));
  const rating = Number(cleanString(formData.get("rating")));

  if (!collabId || !revieweeId) throw new Error("Missing collab/reviewee.");
  if (reviewerId === revieweeId) throw new Error("You cannot review yourself.");
  if (!(rating >= 1 && rating <= 5)) throw new Error("Rating must be between 1 and 5.");

  const db = getDb();
  const [reviewerMembership, revieweeMembership, reviewer] = await Promise.all([
    db.collabMember.findUnique({
      where: { collabId_artistId: { collabId, artistId: reviewerId } },
      select: { collabId: true, leftAt: true },
    }),
    db.collabMember.findUnique({
      where: { collabId_artistId: { collabId, artistId: revieweeId } },
      select: { collabId: true, leftAt: true },
    }),
    db.artist.findUnique({ where: { id: reviewerId }, select: { fullName: true } }),
  ]);
  if (!reviewerMembership || reviewerMembership.leftAt !== null) {
    throw new Error("You are not an active member of this collab.");
  }
  if (!revieweeMembership || revieweeMembership.leftAt !== null) {
    throw new Error("Review target is not an active member of this collab.");
  }

  const existing = await db.feedback.findUnique({
    where: {
      reviewerId_revieweeId_collabId: {
        reviewerId,
        revieweeId,
        collabId,
      },
    },
    select: { id: true },
  });

  await db.feedback.upsert({
    where: {
      reviewerId_revieweeId_collabId: {
        reviewerId,
        revieweeId,
        collabId,
      },
    },
    create: {
      collabId,
      reviewerId,
      revieweeId,
      starRating: rating,
      comment: comment || null,
    },
    update: {
      starRating: rating,
      comment: comment || null,
      editedAt: new Date(),
    },
  });

  const collab = await db.collab.findUnique({
    where: { id: collabId },
    select: { id: true, name: true },
  });
  if (collab && reviewer) {
    await notifyReviewEvent({
      revieweeId,
      reviewerName: reviewer.fullName,
      collabId: collab.id,
      collabName: collab.name,
      action: existing ? "updated" : "added",
      rating,
    });
  }

  revalidatePath(`/collabs/${collabId}`);
  revalidatePath("/dashboard");
  revalidatePath("/profile/edit");
}

export async function deleteFeedbackAction(formData: FormData): Promise<void> {
  const reviewerId = await requireSessionArtistId();
  const collabId = cleanString(formData.get("collabId"));
  const revieweeId = cleanString(formData.get("revieweeId"));
  if (!collabId || !revieweeId) throw new Error("Missing collab/reviewee.");

  const db = getDb();
  const reviewer = await db.artist.findUnique({
    where: { id: reviewerId },
    select: { fullName: true },
  });
  const collab = await db.collab.findUnique({
    where: { id: collabId },
    select: { id: true, name: true },
  });
  await db.feedback.deleteMany({
    where: {
      collabId,
      reviewerId,
      revieweeId,
    },
  });

  if (collab && reviewer) {
    await notifyReviewEvent({
      revieweeId,
      reviewerName: reviewer.fullName,
      collabId: collab.id,
      collabName: collab.name,
      action: "deleted",
    });
  }

  revalidatePath(`/collabs/${collabId}`);
  revalidatePath("/dashboard");
  revalidatePath("/profile/edit");
}
