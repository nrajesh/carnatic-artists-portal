import { getDb } from "@/lib/db";

export type CollabListItem = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  isOwner: boolean;
  memberCount: number;
  createdAt: string;
};

export async function listCollabsForArtist(artistId: string): Promise<CollabListItem[]> {
  const memberships = await getDb().collabMember.findMany({
    where: { artistId, leftAt: null },
    include: {
      collab: {
        include: {
          _count: { select: { members: true } },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  return memberships.map((m) => ({
    id: m.collab.id,
    name: m.collab.name,
    description: m.collab.description,
    status: m.collab.status,
    isOwner: m.collab.ownerId === artistId,
    memberCount: m.collab._count.members,
    createdAt: m.collab.createdAt.toLocaleDateString("en-GB"),
  }));
}

export type CollabMemberView = {
  artistId: string;
  fullName: string;
  slug: string;
  email: string;
  isOwner: boolean;
};

export type CollabMessageView = {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  sentAt: string;
};

export type CollabFeedbackView = {
  id: string;
  reviewerId: string;
  reviewerName: string;
  revieweeId: string;
  revieweeName: string;
  starRating: number;
  comment: string | null;
  submittedAt: string;
  editedAt: string | null;
};

export type CollabDetailView = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  ownerId: string;
  isOwner: boolean;
  members: CollabMemberView[];
  messages: CollabMessageView[];
  feedback: CollabFeedbackView[];
};

export async function getCollabDetailForArtist(
  collabId: string,
  artistId: string,
): Promise<CollabDetailView | null> {
  const membership = await getDb().collabMember.findUnique({
    where: { collabId_artistId: { collabId, artistId } },
    select: { collabId: true, leftAt: true },
  });
  if (!membership || membership.leftAt !== null) return null;

  const collab = await getDb().collab.findUnique({
    where: { id: collabId },
    include: {
      members: {
        where: { leftAt: null },
        include: {
          artist: { select: { id: true, fullName: true, slug: true, email: true } },
        },
      },
      messages: {
        where: { isDeleted: false },
        include: {
          sender: { select: { id: true, fullName: true } },
        },
        orderBy: { sentAt: "asc" },
      },
      feedback: {
        include: {
          reviewer: { select: { id: true, fullName: true } },
          reviewee: { select: { id: true, fullName: true } },
        },
        orderBy: { submittedAt: "desc" },
      },
    },
  });
  if (!collab) return null;

  return {
    id: collab.id,
    name: collab.name,
    description: collab.description,
    status: collab.status,
    ownerId: collab.ownerId,
    isOwner: collab.ownerId === artistId,
    members: collab.members.map((m) => ({
      artistId: m.artist.id,
      fullName: m.artist.fullName,
      slug: m.artist.slug,
      email: m.artist.email,
      isOwner: m.artist.id === collab.ownerId,
    })),
    messages: collab.messages.map((msg) => ({
      id: msg.id,
      senderId: msg.sender.id,
      senderName: msg.sender.fullName,
      content: msg.content,
      sentAt: msg.sentAt.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
    })),
    feedback: collab.feedback.map((f) => ({
      id: f.id,
      reviewerId: f.reviewer.id,
      reviewerName: f.reviewer.fullName,
      revieweeId: f.reviewee.id,
      revieweeName: f.reviewee.fullName,
      starRating: f.starRating,
      comment: f.comment,
      submittedAt: f.submittedAt.toLocaleDateString("en-GB"),
      editedAt: f.editedAt ? f.editedAt.toLocaleDateString("en-GB") : null,
    })),
  };
}
