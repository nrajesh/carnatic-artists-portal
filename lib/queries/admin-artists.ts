import { formatDeploymentDate, formatDeploymentDateNumericDay, formatDeploymentMonthYear } from "@/lib/format-deployment-datetime";
import { getDb } from "@/lib/db";
import { type ArtistProfileView, specColor } from "@/lib/queries/artists";

export type AdminArtistListRow = {
  id: string;
  name: string;
  email: string;
  province: string;
  specialities: { name: string; color: string }[];
  status: "active" | "suspended";
  joinedAt: Date;
  /** Pre-formatted in deployment timezone (table is a client component). */
  joinedAtDisplay: string;
};

export async function listArtistsForAdmin(): Promise<AdminArtistListRow[]> {
  const rows = await getDb().artist.findMany({
    include: {
      specialities: {
        orderBy: { displayOrder: "asc" },
        include: { speciality: true },
      },
    },
    orderBy: { fullName: "asc" },
  });

  return rows.map((a) => ({
    id: a.id,
    name: a.fullName,
    email: a.email,
    province: a.province,
    specialities: a.specialities.map((j) => specColor(j.speciality)),
    status: a.isSuspended ? "suspended" : "active",
    joinedAt: a.createdAt,
    joinedAtDisplay: formatDeploymentDate(a.createdAt),
  }));
}

export type AdminArtistProfileView = ArtistProfileView & {
  isSuspended: boolean;
  createdAt: Date;
};

function mapCollabRow(artistId: string, c: { id: string; name: string; ownerId: string; status: string; closedAt: Date | null }) {
  const isOwner = c.ownerId === artistId;
  return {
    id: c.id,
    slug: c.id,
    name: c.name,
    role: isOwner ? "Owner" : "Member",
    status:
      c.status === "completed"
        ? "completed"
        : c.status === "completed_other"
          ? "completed_other"
          : c.status === "incomplete"
            ? "incomplete"
            : "active",
    closedAt: c.closedAt ? formatDeploymentMonthYear(c.closedAt) : undefined,
  };
}

/** Admin-only: resolves by UUID or slug; includes suspended artists; merges owned + member collabs. */
export async function getArtistProfileForAdmin(idOrSlug: string): Promise<AdminArtistProfileView | null> {
  const artist = await getDb().artist.findFirst({
    where: {
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
    },
    include: {
      specialities: {
        orderBy: { displayOrder: "asc" },
        include: { speciality: true },
      },
      externalLinks: true,
      availabilityEntries: { orderBy: { startDate: "asc" } },
      collabMemberships: {
        where: { leftAt: null },
        include: { collab: true },
      },
      ownedCollabs: true,
      receivedFeedback: {
        include: {
          reviewer: { select: { slug: true, fullName: true } },
          collab: { select: { name: true } },
        },
        orderBy: { submittedAt: "desc" },
      },
    },
  });

  if (!artist) return null;

  const collabMap = new Map<string, ReturnType<typeof mapCollabRow>>();
  for (const m of artist.collabMemberships) {
    const c = m.collab;
    collabMap.set(c.id, mapCollabRow(artist.id, c));
  }
  for (const c of artist.ownedCollabs) {
    if (!collabMap.has(c.id)) {
      collabMap.set(c.id, mapCollabRow(artist.id, c));
    }
  }

  const reviews = artist.receivedFeedback.map((f) => ({
    id: f.id,
    collabId: f.collabId,
    reviewerId: f.reviewerId,
    reviewerSlug: f.reviewer.slug,
    from: f.reviewer.fullName,
    rating: f.starRating,
    comment: f.comment ?? "",
    collab: f.collab.name,
    date: formatDeploymentDateNumericDay(f.submittedAt),
  }));

  return {
    id: artist.id,
    slug: artist.slug,
    name: artist.fullName,
    email: artist.email,
    province: artist.province,
    specialities: artist.specialities.map((j) => specColor(j.speciality)),
    contactNumber: artist.contactNumber,
    contactType: artist.contactType,
    openToCollab: artist.openToCollab,
    availableForCollab: artist.openToCollab,
    bio: artist.bioRichText ?? "",
    availabilityDates: artist.availabilityEntries.map((e) => ({
      from: e.startDate.toISOString().slice(0, 10),
      to: e.endDate.toISOString().slice(0, 10),
    })),
    collabs: Array.from(collabMap.values()),
    reviews,
    links: artist.externalLinks.map((l) => ({
      type: l.linkType.charAt(0).toUpperCase() + l.linkType.slice(1),
      url: l.url,
    })),
    isSuspended: artist.isSuspended,
    createdAt: artist.createdAt,
  };
}
