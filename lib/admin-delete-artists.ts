/**
 * Admin-only hard delete of artist accounts and related data that does not cascade in Prisma.
 */

import type { Prisma } from "@prisma/client";

export async function deleteArtistById(tx: Prisma.TransactionClient, artistId: string): Promise<void> {
  await tx.registrationRequest.updateMany({
    where: { reviewedBy: artistId },
    data: { reviewedBy: null },
  });

  await tx.dailyFeatured.deleteMany({ where: { artistId } });
  await tx.externalLink.deleteMany({ where: { artistId } });

  const owned = await tx.collab.findMany({
    where: { ownerId: artistId },
    select: { id: true },
  });
  for (const { id: collabId } of owned) {
    await tx.feedback.deleteMany({ where: { collabId } });
    await tx.collabMessage.deleteMany({ where: { collabId } });
    await tx.collabMember.deleteMany({ where: { collabId } });
    await tx.collab.delete({ where: { id: collabId } });
  }

  await tx.collabMessage.deleteMany({ where: { senderId: artistId } });
  await tx.feedback.deleteMany({
    where: { OR: [{ reviewerId: artistId }, { revieweeId: artistId }] },
  });
  await tx.collabMember.deleteMany({ where: { artistId } });

  await tx.artist.delete({ where: { id: artistId } });
}
