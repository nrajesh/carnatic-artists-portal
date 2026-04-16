import { db } from "@/lib/db";
import type { Speciality } from "@prisma/client";

/** Listing card — matches prior dummy-artists usage in directory UI */
export type ArtistListing = {
  id: string;
  slug: string;
  name: string;
  email: string;
  province: string;
  specialities: { name: string; color: string }[];
  openToCollab: boolean;
};

function specColor(s: Speciality) {
  return { name: s.name, color: s.primaryColor };
}

export async function listArtistsForDirectory(): Promise<ArtistListing[]> {
  const rows = await db.artist.findMany({
    where: { isSuspended: false },
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
    slug: a.slug,
    name: a.fullName,
    email: a.email,
    province: a.province,
    specialities: a.specialities.map((j) => specColor(j.speciality)),
    openToCollab: a.openToCollab,
  }));
}

/** Profile page shape — aligned with former DummyArtist */
export type ArtistProfileView = {
  id: string;
  slug: string;
  name: string;
  email: string;
  province: string;
  specialities: { name: string; color: string }[];
  contactNumber: string;
  contactType: string;
  openToCollab: boolean;
  /** Alias for UI that used dummy-artists field name */
  availableForCollab: boolean;
  bio: string;
  availabilityDates: { from: string; to: string }[];
  collabs: {
    id: string;
    slug: string;
    name: string;
    role: string;
    status: string;
    closedAt?: string;
  }[];
  reviews: {
    id: string;
    reviewerSlug: string;
    from: string;
    rating: number;
    comment: string;
    collab: string;
    date: string;
  }[];
  links: { type: string; url: string }[];
};

export async function getArtistBySlug(slug: string): Promise<ArtistProfileView | null> {
  const artist = await db.artist.findFirst({
    where: { slug, isSuspended: false },
    include: {
      specialities: {
        orderBy: { displayOrder: "asc" },
        include: { speciality: true },
      },
      externalLinks: true,
      availabilityEntries: { orderBy: { startDate: "asc" } },
      collabMemberships: {
        include: {
          collab: true,
        },
      },
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

  const collabs = artist.collabMemberships.map((m) => {
    const c = m.collab;
    const isOwner = c.ownerId === artist.id;
    return {
      id: c.id,
      slug: c.id,
      name: c.name,
      role: isOwner ? "Owner" : "Member",
      status:
        c.status === "completed"
          ? "completed"
          : c.status === "incomplete"
            ? "incomplete"
            : "active",
      closedAt: c.closedAt
        ? c.closedAt.toLocaleString("en-GB", { month: "short", year: "numeric" })
        : undefined,
    };
  });

  const reviews = artist.receivedFeedback.map((f) => ({
    id: f.id,
    reviewerSlug: f.reviewer.slug,
    from: f.reviewer.fullName,
    rating: f.starRating,
    comment: f.comment ?? "",
    collab: f.collab.name,
    date: f.submittedAt.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
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
    collabs,
    reviews,
    links: artist.externalLinks.map((l) => ({
      type: l.linkType.charAt(0).toUpperCase() + l.linkType.slice(1),
      url: l.url,
    })),
  };
}

export async function countActiveArtists(): Promise<number> {
  return db.artist.count({ where: { isSuspended: false } });
}

export async function countOpenToCollabArtists(): Promise<number> {
  return db.artist.count({ where: { isSuspended: false, openToCollab: true } });
}

export async function countActiveCollabs(): Promise<number> {
  return db.collab.count({ where: { status: "active" } });
}

export type HomeCollabPreview = { slug: string; name: string; members: number; status: string };

export async function listCollabsForHome(limit: number): Promise<HomeCollabPreview[]> {
  const collabs = await db.collab.findMany({
    where: { status: "active" },
    include: { _count: { select: { members: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return collabs.map((c) => ({
    slug: c.id,
    name: c.name,
    members: c._count.members,
    status: c.status,
  }));
}

export async function getArtistListingBySlug(slug: string): Promise<ArtistListing | null> {
  const row = await db.artist.findFirst({
    where: { slug, isSuspended: false },
    include: {
      specialities: {
        orderBy: { displayOrder: "asc" },
        include: { speciality: true },
      },
    },
  });
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.fullName,
    email: row.email,
    province: row.province,
    specialities: row.specialities.map((j) => specColor(j.speciality)),
    openToCollab: row.openToCollab,
  };
}
