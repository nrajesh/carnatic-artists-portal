import { getDb } from "@/lib/db";
import type { Speciality } from "@prisma/client";

/** Listing card - matches prior dummy-artists usage in directory UI */
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
  const rows = await getDb().artist.findMany({
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

/** Profile page shape - aligned with former DummyArtist */
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
    collabId: string;
    reviewerId: string;
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
  const artist = await getDb().artist.findFirst({
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
    collabId: f.collabId,
    reviewerId: f.reviewerId,
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
  return getDb().artist.count({ where: { isSuspended: false } });
}

export async function countOpenToCollabArtists(): Promise<number> {
  return getDb().artist.count({ where: { isSuspended: false, openToCollab: true } });
}

export async function countActiveCollabs(): Promise<number> {
  return getDb().collab.count({ where: { status: "active" } });
}

export type HomeCollabPreview = { slug: string; name: string; members: number; status: string };

export async function listCollabsForHome(limit: number): Promise<HomeCollabPreview[]> {
  const collabs = await getDb().collab.findMany({
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

// ---------------------------------------------------------------------------
// Current-artist queries (dashboard + profile edit)
// ---------------------------------------------------------------------------

export type DashboardCollab = {
  id: string;
  name: string;
  role: "Owner" | "Member";
  status: "active" | "completed" | "completed_other" | "incomplete";
  closedAt?: string;
};

export type DashboardNotification = {
  id: string;
  type: string;
  text: string;
  time: string;
  read: boolean;
  href: string;
};

export type ArtistDashboardView = {
  id: string;
  slug: string;
  name: string;
  province: string;
  specialities: { name: string; color: string }[];
  openToCollab: boolean;
  collabs: DashboardCollab[];
  availabilityDates: { from: string; to: string }[];
  avgRating: string | null;
  notifications: DashboardNotification[];
  unreadNotificationCount: number;
};

function formatRelativeTime(from: Date, now: Date): string {
  const deltaMs = now.getTime() - from.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  if (deltaMs < minute) return "just now";
  if (deltaMs < hour) {
    const m = Math.floor(deltaMs / minute);
    return `${m} minute${m === 1 ? "" : "s"} ago`;
  }
  if (deltaMs < day) {
    const h = Math.floor(deltaMs / hour);
    return `${h} hour${h === 1 ? "" : "s"} ago`;
  }
  if (deltaMs < week) {
    const d = Math.floor(deltaMs / day);
    return `${d} day${d === 1 ? "" : "s"} ago`;
  }
  const w = Math.floor(deltaMs / week);
  return `${w} week${w === 1 ? "" : "s"} ago`;
}

/**
 * Turn a Notification row into the shape the dashboard renders.
 * Payload is JSON and schema-less per the Notification model, so we
 * defensively pick `text` and `href` fields when present.
 */
function shapeNotification(n: {
  id: string;
  type: string;
  payload: unknown;
  isRead: boolean;
  createdAt: Date;
}, now: Date): DashboardNotification {
  const payload =
    n.payload && typeof n.payload === "object" ? (n.payload as Record<string, unknown>) : {};
  const text = typeof payload.text === "string" ? payload.text : `(${n.type})`;
  const href = typeof payload.href === "string" ? payload.href : "#";
  return {
    id: n.id,
    type: n.type,
    text,
    time: formatRelativeTime(n.createdAt, now),
    read: n.isRead,
    href,
  };
}

export async function getArtistDashboardView(artistId: string): Promise<ArtistDashboardView | null> {
  const db = getDb();
  const artist = await db.artist.findUnique({
    where: { id: artistId },
    include: {
      specialities: {
        orderBy: { displayOrder: "asc" },
        include: { speciality: true },
      },
      availabilityEntries: { orderBy: { startDate: "asc" } },
      collabMemberships: {
        where: { leftAt: null },
        include: { collab: true },
      },
      ownedCollabs: true,
      receivedFeedback: { select: { starRating: true } },
      notifications: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
  if (!artist) return null;

  // Merge owned and member collabs, deduplicating by collab id. Owner wins on
  // role when an artist is both creator and member.
  const collabMap = new Map<string, DashboardCollab>();
  for (const m of artist.collabMemberships) {
    const c = m.collab;
    const isOwner = c.ownerId === artist.id;
    collabMap.set(c.id, {
      id: c.id,
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
      closedAt: c.closedAt
        ? c.closedAt.toLocaleString("en-GB", { month: "short", year: "numeric" })
        : undefined,
    });
  }
  for (const c of artist.ownedCollabs) {
    if (!collabMap.has(c.id)) {
      collabMap.set(c.id, {
        id: c.id,
        name: c.name,
        role: "Owner",
        status:
          c.status === "completed"
            ? "completed"
            : c.status === "completed_other"
              ? "completed_other"
              : c.status === "incomplete"
                ? "incomplete"
                : "active",
        closedAt: c.closedAt
          ? c.closedAt.toLocaleString("en-GB", { month: "short", year: "numeric" })
          : undefined,
      });
    }
  }

  const avgRating =
    artist.receivedFeedback.length > 0
      ? (
          artist.receivedFeedback.reduce((s, r) => s + r.starRating, 0) /
          artist.receivedFeedback.length
        ).toFixed(1)
      : null;

  const now = new Date();
  const notifications = artist.notifications.map((n) => shapeNotification(n, now));
  const unreadNotificationCount = notifications.filter((n) => !n.read).length;

  return {
    id: artist.id,
    slug: artist.slug,
    name: artist.fullName,
    province: artist.province,
    specialities: artist.specialities.map((j) => specColor(j.speciality)),
    openToCollab: artist.openToCollab,
    collabs: Array.from(collabMap.values()),
    availabilityDates: artist.availabilityEntries.map((e) => ({
      from: e.startDate.toISOString().slice(0, 10),
      to: e.endDate.toISOString().slice(0, 10),
    })),
    avgRating,
    notifications,
    unreadNotificationCount,
  };
}

export type ArtistEditView = {
  id: string;
  fullName: string;
  email: string;
  contactNumber: string;
  contactType: "whatsapp" | "mobile";
  province: string;
  specialities: string[];
  availabilityWindowCount: number;
};

export async function getArtistForEdit(artistId: string): Promise<ArtistEditView | null> {
  const artist = await getDb().artist.findUnique({
    where: { id: artistId },
    include: {
      specialities: {
        orderBy: { displayOrder: "asc" },
        include: { speciality: { select: { name: true } } },
      },
      _count: { select: { availabilityEntries: true } },
    },
  });
  if (!artist) return null;
  return {
    id: artist.id,
    fullName: artist.fullName,
    email: artist.email,
    contactNumber: artist.contactNumber,
    contactType: artist.contactType,
    province: artist.province,
    specialities: artist.specialities.map((j) => j.speciality.name),
    availabilityWindowCount: artist._count.availabilityEntries,
  };
}

export async function listSpecialities(): Promise<{ name: string; color: string }[]> {
  const rows = await getDb().speciality.findMany({
    orderBy: { name: "asc" },
    select: { name: true, primaryColor: true },
  });
  return rows.map((s) => ({ name: s.name, color: s.primaryColor }));
}

export async function getArtistListingBySlug(slug: string): Promise<ArtistListing | null> {
  const row = await getDb().artist.findFirst({
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
