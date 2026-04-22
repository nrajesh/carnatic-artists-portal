import { sortAvailabilityEntriesAscending } from "@/lib/availability-calendar";
import { formatDeploymentDateNumericDay, formatDeploymentMonthYear } from "@/lib/format-deployment-datetime";
import {
  type SuspensionMessage,
  resolveSuspensionMessages,
} from "@/lib/suspension-thread";
import {
  buildArtistKeywordHaystack,
  stripHtmlForSearch,
} from "@/lib/artist-directory-search";
import { profileSocialFromExternalLinks } from "@/lib/artist-profile-links";
import {
  canRevealContact,
  canRevealEmail,
  decryptArtistStoredContact,
  type ProfileViewerContext,
} from "@/lib/artist-pii";
import { artistsShareActiveCollab } from "@/lib/collaboration-scope";
import { getDb } from "@/lib/db";
import type { PiiVisibility, Speciality } from "@prisma/client";
import {
  getLocalCalendarDateForDb,
  getLocalDayOrdinalForRotation,
} from "@/lib/local-day";

/** Listing card - matches prior dummy-artists usage in directory UI */
export type ArtistListing = {
  id: string;
  slug: string;
  name: string;
  email: string;
  province: string;
  profilePhotoUrl: string | null;
  specialities: { name: string; color: string }[];
  openToCollab: boolean;
  /** Lowercased name, speciality names, plain bio, and profile link URLs for keyword search */
  keywordHaystack: string;
};

/** Home spotlight - directory fields plus photo URL and active collab teasers */
export type FeaturedArtistListing = ArtistListing & {
  activeCollabs: { slug: string; name: string }[];
};

export function specColor(s: Speciality) {
  return { name: s.name, color: s.primaryColor };
}

function toArtistListing(
  a: {
    id: string;
    slug: string;
    fullName: string;
    province: string;
    profilePhotoUrl: string | null;
    openToCollab: boolean;
    specialities: { speciality: Speciality }[];
    bioRichText?: string | null;
    externalLinks?: { url: string }[];
  },
  listingEmail: string,
): ArtistListing {
  const bioPlain = stripHtmlForSearch(a.bioRichText ?? "");
  const linkUrls = (a.externalLinks ?? []).map((l) => l.url);
  const keywordHaystack = buildArtistKeywordHaystack({
    name: a.fullName,
    specialityNames: a.specialities.map((j) => j.speciality.name),
    bioPlain,
    linkUrls,
  });
  return {
    id: a.id,
    slug: a.slug,
    name: a.fullName,
    email: listingEmail,
    province: a.province,
    profilePhotoUrl: a.profilePhotoUrl,
    specialities: a.specialities.map((j) => specColor(j.speciality)),
    openToCollab: a.openToCollab,
    keywordHaystack,
  };
}

async function fetchActiveCollabPreviewsForArtist(
  artistId: string,
  limit: number,
): Promise<{ slug: string; name: string }[]> {
  const rows = await getDb().collab.findMany({
    where: {
      status: "active",
      OR: [{ ownerId: artistId }, { members: { some: { artistId, leftAt: null } } }],
    },
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((c) => ({ slug: c.id, name: c.name }));
}

function toFeaturedArtistListing(
  a: {
    id: string;
    slug: string;
    fullName: string;
    province: string;
    openToCollab: boolean;
    profilePhotoUrl: string | null;
    specialities: { speciality: Speciality }[];
    bioRichText?: string | null;
    externalLinks?: { url: string }[];
  },
  listingEmail: string,
  activeCollabs: { slug: string; name: string }[],
): FeaturedArtistListing {
  return {
    ...toArtistListing(a, listingEmail),
    profilePhotoUrl: a.profilePhotoUrl,
    activeCollabs,
  };
}

function directoryListingEmail(
  emailVisibility: PiiVisibility,
  row: Parameters<typeof decryptArtistStoredContact>[0],
): string {
  if (emailVisibility !== "PUBLIC_PROFILE") return "";
  return decryptArtistStoredContact(row).email;
}

export async function listArtistsForDirectory(): Promise<ArtistListing[]> {
  const rows = await getDb().artist.findMany({
    where: { isSuspended: false },
    include: {
      specialities: {
        orderBy: { displayOrder: "asc" },
        include: { speciality: true },
      },
      externalLinks: { select: { url: true } },
    },
    orderBy: { fullName: "asc" },
  });
  return rows.map((r) =>
    toArtistListing(r, directoryListingEmail(r.emailVisibility, r)),
  );
}

/** Active artists grouped by province name (must match GeoJSON label, e.g. `properties.naam`). */
export async function countActiveArtistsByProvince(): Promise<Record<string, number>> {
  const rows = await getDb().artist.groupBy({
    by: ["province"],
    where: { isSuspended: false },
    _count: { _all: true },
  });
  const out: Record<string, number> = {};
  for (const r of rows) {
    out[r.province] = r._count._all;
  }
  return out;
}

/**
 * Home hero spotlight: optional manual row in DailyFeatured (singer) for "today"
 * in the deployment timezone (see `getDeploymentTimezone` in deployment.config),
 * otherwise a deterministic daily pick from vocalists (fallback: all active artists).
 */
export async function getDailyFeaturedArtistForHome(): Promise<FeaturedArtistListing | null> {
  const db = getDb();
  const todayLocal = getLocalCalendarDateForDb(new Date());

  const override = await db.dailyFeatured.findUnique({
    where: {
      featureDate_featureType: {
        featureDate: todayLocal,
        featureType: "singer",
      },
    },
    include: {
      artist: {
        include: {
          specialities: {
            orderBy: { displayOrder: "asc" },
            include: { speciality: true },
          },
          externalLinks: { select: { url: true } },
        },
      },
    },
  });

  if (override?.artist && !override.artist.isSuspended) {
    const collabs = await fetchActiveCollabPreviewsForArtist(override.artist.id, 4);
    return toFeaturedArtistListing(
      override.artist,
      directoryListingEmail(override.artist.emailVisibility, override.artist),
      collabs,
    );
  }

  const vocalistInclude = {
    specialities: {
      orderBy: { displayOrder: "asc" as const },
      include: { speciality: true },
    },
    externalLinks: { select: { url: true } as const },
  };

  const vocalists = await db.artist.findMany({
    where: {
      isSuspended: false,
      specialities: {
        some: {
          speciality: {
            name: { equals: "Vocal", mode: "insensitive" },
          },
        },
      },
    },
    include: vocalistInclude,
    orderBy: { id: "asc" },
  });

  const poolRows =
    vocalists.length > 0
      ? vocalists
      : await db.artist.findMany({
          where: { isSuspended: false },
          include: vocalistInclude,
          orderBy: { id: "asc" },
        });

  if (poolRows.length === 0) return null;

  const idx = getLocalDayOrdinalForRotation(new Date()) % poolRows.length;
  const picked = poolRows[idx];
  const collabs = await fetchActiveCollabPreviewsForArtist(picked.id, 4);
  return toFeaturedArtistListing(
    picked,
    directoryListingEmail(picked.emailVisibility, picked),
    collabs,
  );
}

/** Profile page shape - aligned with former DummyArtist */
export type ArtistProfileView = {
  id: string;
  slug: string;
  name: string;
  email: string;
  province: string;
  profilePhotoUrl: string | null;
  backgroundImageUrl: string | null;
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

export async function getArtistBySlug(
  slug: string,
  viewer?: { artistId: string; role: "artist" | "admin" } | null,
): Promise<ArtistProfileView | null> {
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

  const decrypted = decryptArtistStoredContact(artist);
  const ctx: ProfileViewerContext = {
    viewerArtistId: viewer?.artistId ?? null,
    viewerRole: viewer?.role ?? null,
    profileOwnerId: artist.id,
  };
  let sharesCollab = false;
  if (viewer?.artistId && viewer.role !== "admin") {
    sharesCollab = await artistsShareActiveCollab(viewer.artistId, artist.id);
  }
  const showEmail = canRevealEmail(artist.emailVisibility, ctx, sharesCollab);
  const showContact = canRevealContact(artist.contactVisibility, ctx, sharesCollab);

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
      closedAt: c.closedAt ? formatDeploymentMonthYear(c.closedAt) : undefined,
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
    date: formatDeploymentDateNumericDay(f.submittedAt),
  }));

  return {
    id: artist.id,
    slug: artist.slug,
    name: artist.fullName,
    email: showEmail ? decrypted.email : "",
    province: artist.province,
    profilePhotoUrl: artist.profilePhotoUrl,
    backgroundImageUrl: artist.backgroundImageUrl ?? null,
    specialities: artist.specialities.map((j) => specColor(j.speciality)),
    contactNumber: showContact ? decrypted.contactNumber : "",
    contactType: artist.contactType,
    openToCollab: artist.openToCollab,
    availableForCollab: artist.openToCollab,
    bio: artist.bioRichText ?? "",
    availabilityDates: sortAvailabilityEntriesAscending(artist.availabilityEntries).map((e) => ({
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
  /** Plain text from bio HTML for dashboard preview */
  bioPlainPreview: string;
  hasBio: boolean;
  collabs: DashboardCollab[];
  availabilityDates: { from: string; to: string }[];
  avgRating: string | null;
  notifications: DashboardNotification[];
  unreadNotificationCount: number;
  isSuspended: boolean;
  suspensionMessages: SuspensionMessage[];
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

/** Profile display name for session chrome (footer). Uses `Artist.fullName`. */
export async function getArtistFullNameById(artistId: string): Promise<string | null> {
  const artist = await getDb().artist.findUnique({
    where: { id: artistId },
    select: { fullName: true },
  });
  const name = artist?.fullName?.trim();
  return name && name.length > 0 ? name : null;
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
      closedAt: c.closedAt ? formatDeploymentMonthYear(c.closedAt) : undefined,
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
        closedAt: c.closedAt ? formatDeploymentMonthYear(c.closedAt) : undefined,
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

  const bioPlain = stripHtmlForSearch(artist.bioRichText ?? "").trim();
  const hasBio = bioPlain.length > 0;
  const bioPlainPreview =
    hasBio && bioPlain.length > 240 ? `${bioPlain.slice(0, 240).trimEnd()}…` : bioPlain;

  const suspensionMessages = resolveSuspensionMessages({
    isSuspended: artist.isSuspended,
    suspensionComment: artist.suspensionComment,
    suspensionThread: artist.suspensionThread,
    updatedAt: artist.updatedAt,
  });

  return {
    id: artist.id,
    slug: artist.slug,
    name: artist.fullName,
    province: artist.province,
    specialities: artist.specialities.map((j) => specColor(j.speciality)),
    openToCollab: artist.openToCollab,
    bioPlainPreview,
    hasBio,
    collabs: Array.from(collabMap.values()),
    availabilityDates: sortAvailabilityEntriesAscending(artist.availabilityEntries).map((e) => ({
      from: e.startDate.toISOString().slice(0, 10),
      to: e.endDate.toISOString().slice(0, 10),
    })),
    avgRating,
    notifications,
    unreadNotificationCount,
    isSuspended: artist.isSuspended,
    suspensionMessages,
  };
}

export type ArtistEditView = {
  id: string;
  slug: string;
  fullName: string;
  email: string;
  contactNumber: string;
  contactType: "whatsapp" | "mobile";
  emailVisibility: PiiVisibility;
  contactVisibility: PiiVisibility;
  province: string;
  specialities: string[];
  availabilityWindowCount: number;
  openToCollab: boolean;
  profilePhotoUrl: string;
  backgroundImageUrl: string;
  bioRichText: string;
  linkedinUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  twitterUrl: string;
  youtubeUrl: string;
  websiteUrls: { url: string }[];
  /** Bumps after saves so client forms can remount from fresh server props. */
  profileRevision: string;
  isSuspended: boolean;
  suspensionComment: string | null;
  suspensionMessages: SuspensionMessage[];
};

export async function getArtistForEdit(artistIdOrSlug: string): Promise<ArtistEditView | null> {
  const artist = await getDb().artist.findFirst({
    where: { OR: [{ id: artistIdOrSlug }, { slug: artistIdOrSlug }] },
    include: {
      specialities: {
        orderBy: { displayOrder: "asc" },
        include: { speciality: { select: { name: true } } },
      },
      externalLinks: { select: { linkType: true, url: true } },
      availabilityEntries: { select: { startDate: true, endDate: true } },
    },
  });
  if (!artist) return null;
  const social = profileSocialFromExternalLinks(artist.externalLinks);
  const d = decryptArtistStoredContact(artist);
  return {
    id: artist.id,
    slug: artist.slug,
    fullName: artist.fullName,
    email: d.email,
    contactNumber: d.contactNumber,
    contactType: artist.contactType,
    emailVisibility: artist.emailVisibility,
    contactVisibility: artist.contactVisibility,
    province: artist.province,
    specialities: artist.specialities.map((j) => j.speciality.name),
    availabilityWindowCount: artist.availabilityEntries.length,
    openToCollab: artist.openToCollab,
    profilePhotoUrl: artist.profilePhotoUrl ?? "",
    backgroundImageUrl: artist.backgroundImageUrl ?? "",
    bioRichText: artist.bioRichText ?? "",
    ...social,
    profileRevision: artist.updatedAt.toISOString(),
    isSuspended: artist.isSuspended,
    suspensionComment: artist.suspensionComment ?? null,
    suspensionMessages: resolveSuspensionMessages({
      isSuspended: artist.isSuspended,
      suspensionComment: artist.suspensionComment,
      suspensionThread: artist.suspensionThread,
      updatedAt: artist.updatedAt,
    }),
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
      externalLinks: { select: { url: true } },
    },
  });
  if (!row) return null;
  return toArtistListing(row, directoryListingEmail(row.emailVisibility, row));
}
