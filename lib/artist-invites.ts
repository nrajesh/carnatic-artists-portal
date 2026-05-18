import { getDb } from "@/lib/db";

type DbClient = ReturnType<typeof getDb>;
type ArtistInviteDelegate = DbClient["artistInvite"];
type ArtistConnectionDelegate = DbClient["artistConnection"];

const INVITE_LINK_ORDER = [
  "instagram",
  "youtube",
  "linkedin",
  "facebook",
  "twitter",
  "website",
] as const;

const INVITE_LINK_LABELS: Record<string, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  twitter: "X (Twitter)",
  x: "X (Twitter)",
  website: "Website",
};

export type InviteShareOption = {
  type: string;
  label: string;
  url: string;
  host: string | null;
};

export type PublicArtistInviteView = {
  id: string;
  token: string;
  inviterArtistId: string;
  inviterName: string;
  inviterSlug: string;
  inviterProfilePhotoUrl: string | null;
  inviterSpecialities: { name: string; color: string }[];
  selectedLinkType: string;
  selectedLinkLabel: string;
  selectedLinkUrl: string;
  selectedLinkHost: string | null;
};

export type InviteAutoConnectionResult = {
  inviterArtistId: string | null;
  status: "skipped" | "created" | "updated" | "already_connected" | "unavailable";
};

function normalizeLinkType(raw: string): string {
  const lowered = raw.trim().toLowerCase();
  if (lowered === "x") return "twitter";
  return lowered;
}

function compareInviteLinkOrder(a: string, b: string): number {
  const ai = INVITE_LINK_ORDER.indexOf(normalizeLinkType(a) as (typeof INVITE_LINK_ORDER)[number]);
  const bi = INVITE_LINK_ORDER.indexOf(normalizeLinkType(b) as (typeof INVITE_LINK_ORDER)[number]);
  const aRank = ai === -1 ? Number.MAX_SAFE_INTEGER : ai;
  const bRank = bi === -1 ? Number.MAX_SAFE_INTEGER : bi;
  if (aRank !== bRank) return aRank - bRank;
  return a.localeCompare(b);
}

function getArtistInviteDelegate(): ArtistInviteDelegate | null {
  return (
    (
      getDb() as DbClient & {
        artistInvite?: ArtistInviteDelegate;
      }
    ).artistInvite ?? null
  );
}

function getArtistConnectionDelegate(): ArtistConnectionDelegate | null {
  return (
    (
      getDb() as DbClient & {
        artistConnection?: ArtistConnectionDelegate;
      }
    ).artistConnection ?? null
  );
}

function isInviteStorageUnavailable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String(error.code) : "";
  if (code === "P2021" || code === "P2022") return true;
  const message = "message" in error ? String(error.message) : "";
  return message.includes("ArtistInvite") || message.includes("artistInvite");
}

function inviteSetupError(): Error {
  return new Error(
    "Artist invites are not ready yet. Apply the latest Prisma migration and try again.",
  );
}

export function formatArtistInviteLinkLabel(linkType: string): string {
  const normalized = normalizeLinkType(linkType);
  return INVITE_LINK_LABELS[normalized] ?? (linkType.trim() || "Link");
}

export function safeArtistInviteHost(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return null;
  }
}

export function buildInviteShareOptions(
  links: Array<{ type: string; url: string }>,
): InviteShareOption[] {
  return [...links]
    .filter((link) => link.url.trim().length > 0)
    .sort((a, b) => compareInviteLinkOrder(a.type, b.type))
    .map((link) => ({
      type: normalizeLinkType(link.type),
      label: formatArtistInviteLinkLabel(link.type),
      url: link.url.trim(),
      host: safeArtistInviteHost(link.url),
    }));
}

export async function createArtistInvite(input: {
  inviterArtistId: string;
  selectedLinkType: string;
  selectedLinkUrl: string;
}) {
  const db = getDb();
  const artistInvite = getArtistInviteDelegate();
  if (!artistInvite) {
    throw inviteSetupError();
  }

  const selectedLinkType = normalizeLinkType(input.selectedLinkType);
  const selectedLinkUrl = input.selectedLinkUrl.trim();
  if (!selectedLinkUrl) throw new Error("Choose a saved profile link.");

  const inviter = await db.artist.findUnique({
    where: { id: input.inviterArtistId },
    select: {
      id: true,
      slug: true,
      fullName: true,
      isSuspended: true,
      isSystemAccount: true,
      externalLinks: {
        select: {
          linkType: true,
          url: true,
        },
      },
    },
  });

  if (!inviter || inviter.isSuspended || inviter.isSystemAccount) {
    throw new Error("Artist not found.");
  }

  const hasMatchingLink = inviter.externalLinks.some(
    (link) =>
      normalizeLinkType(link.linkType) === selectedLinkType && link.url.trim() === selectedLinkUrl,
  );
  if (!hasMatchingLink) {
    throw new Error("Pick one of your saved profile links.");
  }

  let invite;
  try {
    invite = await artistInvite.create({
      data: {
        token: crypto.randomUUID().replace(/-/g, ""),
        inviterArtistId: inviter.id,
        selectedLinkType,
        selectedLinkUrl,
      },
    });
  } catch (error) {
    if (isInviteStorageUnavailable(error)) {
      throw inviteSetupError();
    }
    throw error;
  }

  return {
    id: invite.id,
    token: invite.token,
    inviterArtistId: inviter.id,
    inviterName: inviter.fullName,
    inviterSlug: inviter.slug,
    selectedLinkType,
    selectedLinkLabel: formatArtistInviteLinkLabel(selectedLinkType),
    selectedLinkUrl,
    selectedLinkHost: safeArtistInviteHost(selectedLinkUrl),
  };
}

export async function getPublicArtistInviteView(token: string): Promise<PublicArtistInviteView | null> {
  const artistInvite = getArtistInviteDelegate();
  if (!artistInvite) return null;

  let invite;
  try {
    invite = await artistInvite.findUnique({
      where: { token },
      include: {
        inviter: {
          select: {
            id: true,
            slug: true,
            fullName: true,
            profilePhotoUrl: true,
            isSuspended: true,
            isSystemAccount: true,
            specialities: {
              orderBy: { displayOrder: "asc" },
              include: {
                speciality: {
                  select: {
                    name: true,
                    primaryColor: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  } catch (error) {
    if (isInviteStorageUnavailable(error)) return null;
    throw error;
  }

  if (!invite || invite.inviter.isSuspended || invite.inviter.isSystemAccount) {
    return null;
  }

  return {
    id: invite.id,
    token: invite.token,
    inviterArtistId: invite.inviter.id,
    inviterName: invite.inviter.fullName,
    inviterSlug: invite.inviter.slug,
    inviterProfilePhotoUrl: invite.inviter.profilePhotoUrl,
    inviterSpecialities: invite.inviter.specialities.map((row) => ({
      name: row.speciality.name,
      color: row.speciality.primaryColor,
    })),
    selectedLinkType: normalizeLinkType(invite.selectedLinkType),
    selectedLinkLabel: formatArtistInviteLinkLabel(invite.selectedLinkType),
    selectedLinkUrl: invite.selectedLinkUrl,
    selectedLinkHost: safeArtistInviteHost(invite.selectedLinkUrl),
  };
}

export async function approveInviteAutoConnection(input: {
  inviteId: string | null | undefined;
  artistId: string;
  autoConnectOptIn: boolean;
}): Promise<InviteAutoConnectionResult> {
  if (!input.inviteId || !input.autoConnectOptIn) {
    return { inviterArtistId: null, status: "skipped" };
  }

  const artistInvite = getArtistInviteDelegate();
  const artistConnection = getArtistConnectionDelegate();
  if (!artistInvite || !artistConnection) {
    return { inviterArtistId: null, status: "unavailable" };
  }

  let invite;
  try {
    invite = await artistInvite.findUnique({
      where: { id: input.inviteId },
      select: {
        inviterArtistId: true,
      },
    });
  } catch (error) {
    if (isInviteStorageUnavailable(error)) {
      return { inviterArtistId: null, status: "unavailable" };
    }
    throw error;
  }
  if (!invite || invite.inviterArtistId === input.artistId) {
    return { inviterArtistId: invite?.inviterArtistId ?? null, status: "skipped" };
  }

  const existing = await artistConnection.findFirst({
    where: {
      OR: [
        {
          requesterId: invite.inviterArtistId,
          recipientId: input.artistId,
        },
        {
          requesterId: input.artistId,
          recipientId: invite.inviterArtistId,
        },
      ],
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (existing?.status === "APPROVED") {
    return { inviterArtistId: invite.inviterArtistId, status: "already_connected" };
  }

  if (existing) {
    await artistConnection.update({
      where: { id: existing.id },
      data: {
        requesterId: invite.inviterArtistId,
        recipientId: input.artistId,
        status: "APPROVED",
      },
    });
    return { inviterArtistId: invite.inviterArtistId, status: "updated" };
  }

  await artistConnection.create({
    data: {
      requesterId: invite.inviterArtistId,
      recipientId: input.artistId,
      status: "APPROVED",
    },
  });

  return { inviterArtistId: invite.inviterArtistId, status: "created" };
}
