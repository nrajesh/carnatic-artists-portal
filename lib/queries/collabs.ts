import {
  formatDeploymentCollabMessageTime,
  formatDeploymentDate,
  formatDeploymentDateNumericDay,
} from "@/lib/format-deployment-datetime";
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
    createdAt: formatDeploymentDate(m.collab.createdAt),
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
      sentAt: formatDeploymentCollabMessageTime(msg.sentAt),
    })),
    feedback: collab.feedback.map((f) => ({
      id: f.id,
      reviewerId: f.reviewer.id,
      reviewerName: f.reviewer.fullName,
      revieweeId: f.reviewee.id,
      revieweeName: f.reviewee.fullName,
      starRating: f.starRating,
      comment: f.comment,
      submittedAt: formatDeploymentDateNumericDay(f.submittedAt),
      editedAt: f.editedAt ? formatDeploymentDateNumericDay(f.editedAt) : null,
    })),
  };
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function resolveCollabId(idOrSlug: string): Promise<string | null> {
  const direct = await getDb().collab.findUnique({
    where: { id: idOrSlug },
    select: { id: true },
  });
  if (direct) return direct.id;

  const candidates = await getDb().collab.findMany({
    select: { id: true, name: true },
  });
  const matched = candidates.find((c) => slugify(c.name) === idOrSlug);
  return matched?.id ?? null;
}

export type AdminCollabListItem = {
  id: string;
  slug: string;
  name: string;
  owner: string;
  members: number;
  messages: number;
  status: string;
  createdAt: string;
  isCurrentAdminOwner: boolean;
  isCurrentAdminMember: boolean;
};

export async function listCollabsForAdmin(viewerArtistId?: string): Promise<AdminCollabListItem[]> {
  const collabs = await getDb().collab.findMany({
    include: {
      owner: { select: { fullName: true } },
      members: { select: { artistId: true, leftAt: true } },
      _count: { select: { members: true, messages: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return collabs.map((c) => ({
    id: c.id,
    slug: slugify(c.name),
    name: c.name,
    owner: c.owner.fullName,
    members: c._count.members,
    messages: c._count.messages,
    status: c.status,
    createdAt: formatDeploymentDate(c.createdAt),
    isCurrentAdminOwner: viewerArtistId ? c.ownerId === viewerArtistId : false,
    isCurrentAdminMember: viewerArtistId
      ? c.members.some((m) => m.artistId === viewerArtistId && m.leftAt === null)
      : false,
  }));
}

export type AdminCollabDetailView = {
  id: string;
  name: string;
  owner: string;
  members: { artistId: string; fullName: string; slug: string }[];
  status: string;
  createdAt: string;
  messages: { sender: string; text: string; time: string }[];
};

export async function getCollabDetailForAdmin(idOrSlug: string): Promise<AdminCollabDetailView | null> {
  const collabId = await resolveCollabId(idOrSlug);
  if (!collabId) return null;

  const collab = await getDb().collab.findUnique({
    where: { id: collabId },
    include: {
      owner: { select: { fullName: true } },
      members: {
        where: { leftAt: null },
        include: { artist: { select: { id: true, fullName: true, slug: true } } },
      },
      messages: {
        where: { isDeleted: false },
        orderBy: { sentAt: "asc" },
        include: { sender: { select: { fullName: true } } },
      },
    },
  });
  if (!collab) return null;

  return {
    id: collab.id,
    name: collab.name,
    owner: collab.owner.fullName,
    members: collab.members.map((m) => ({
      artistId: m.artist.id,
      fullName: m.artist.fullName,
      slug: m.artist.slug,
    })),
    status: collab.status,
    createdAt: formatDeploymentDate(collab.createdAt),
    messages: collab.messages.map((msg) => ({
      sender: msg.sender.fullName,
      text: msg.content,
      time: formatDeploymentCollabMessageTime(msg.sentAt),
    })),
  };
}
