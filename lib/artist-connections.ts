import { getDb } from "@/lib/db";
import type { MentionableArtist } from "@/lib/artist-mentions";
import { isArtistConnectionsEnabledServer } from "@/lib/feature-flags-server";
import { notifyArtistConnectionApproved, notifyArtistConnectionRequest } from "@/lib/notifications";

type DbClient = ReturnType<typeof getDb>;
type ArtistConnectionDelegate = DbClient["artistConnection"];

export type ConnectionStatus =
  | "SELF"
  | "NONE"
  | "PENDING_INCOMING"
  | "PENDING_OUTGOING"
  | "APPROVED"
  | "REJECTED";

export type ArtistConnectionSummary = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  otherArtist: MentionableArtist;
  direction: "incoming" | "outgoing";
  createdAt: Date;
};

export type ArtistConnectionCenterView = {
  incoming: ArtistConnectionSummary[];
  outgoing: ArtistConnectionSummary[];
  approved: ArtistConnectionSummary[];
  mentionTargets: MentionableArtist[];
  requestsAllowed: boolean;
};

type ArtistConnectionRow = {
  id: string;
  requesterId: string;
  recipientId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: Date;
  requester: ArtistRow;
  recipient: ArtistRow;
};

type ArtistRow = {
  id: string;
  slug: string;
  fullName: string;
  isSuspended: boolean;
  isSystemAccount: boolean;
};

function toMentionableArtist(
  artist: Pick<ArtistRow, "id" | "slug" | "fullName">,
): MentionableArtist {
  return {
    id: artist.id,
    slug: artist.slug,
    fullName: artist.fullName,
    tag: `@${artist.slug}`,
  };
}

function isVisibleArtist(artist: ArtistRow): boolean {
  return !artist.isSuspended && !artist.isSystemAccount;
}

function otherArtistFor(row: ArtistConnectionRow, artistId: string): ArtistRow {
  return row.requesterId === artistId ? row.recipient : row.requester;
}

function summarize(row: ArtistConnectionRow, artistId: string): ArtistConnectionSummary {
  return {
    id: row.id,
    status: row.status,
    otherArtist: toMentionableArtist(otherArtistFor(row, artistId)),
    direction: row.recipientId === artistId ? "incoming" : "outgoing",
    createdAt: row.createdAt,
  };
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

function isConnectionStorageUnavailable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String(error.code) : "";
  if (code === "P2021" || code === "P2022") return true;
  const message = "message" in error ? String(error.message) : "";
  return message.includes("ArtistConnection") || message.includes("artistConnection");
}

function isConnectionPreferenceUnavailable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String(error.code) : "";
  if (code === "P2021" || code === "P2022") return true;
  const message = "message" in error ? String(error.message) : "";
  return (
    message.includes("connectionRequestsAllowed") ||
    message.includes("notificationPreference.findUnique") ||
    message.includes("Unknown field") ||
    message.includes("PrismaClientValidationError")
  );
}

function connectionSetupError(): Error {
  return new Error(
    "Artist connections are not ready. Generate Prisma Client and apply the latest migration.",
  );
}

export async function isArtistConnectionsStorageReady(): Promise<boolean> {
  const artistConnection = getArtistConnectionDelegate();
  if (!artistConnection) return false;

  try {
    await artistConnection.findFirst({
      select: { id: true },
    });
    return true;
  } catch (error) {
    if (isConnectionStorageUnavailable(error)) return false;
    throw error;
  }
}

export async function canUseArtistConnections(
  options: {
    distinctId?: string;
  } = {},
): Promise<boolean> {
  const enabled = await isArtistConnectionsEnabledServer({
    distinctId: options.distinctId,
  });
  if (!enabled) return false;
  return isArtistConnectionsStorageReady();
}

export async function findConnectionBetween(a: string, b: string) {
  if (a === b) return null;
  const artistConnection = getArtistConnectionDelegate();
  if (!artistConnection) return null;
  try {
    return await artistConnection.findFirst({
      where: {
        OR: [
          { requesterId: a, recipientId: b },
          { requesterId: b, recipientId: a },
        ],
      },
    });
  } catch (error) {
    if (isConnectionStorageUnavailable(error)) return null;
    throw error;
  }
}

export async function getConnectionStatusForArtists(
  viewerArtistId: string | null,
  targetArtistId: string,
): Promise<ConnectionStatus> {
  if (!viewerArtistId) return "NONE";
  if (viewerArtistId === targetArtistId) return "SELF";
  const connection = await findConnectionBetween(viewerArtistId, targetArtistId);
  if (!connection) return "NONE";
  if (connection.status === "APPROVED") return "APPROVED";
  if (connection.status === "REJECTED") return "REJECTED";
  return connection.recipientId === viewerArtistId ? "PENDING_INCOMING" : "PENDING_OUTGOING";
}

export async function listApprovedMentionTargets(artistId: string): Promise<MentionableArtist[]> {
  const artistConnection = getArtistConnectionDelegate();
  if (!artistConnection) return [];

  let rows: ArtistConnectionRow[];
  try {
    rows = (await artistConnection.findMany({
      where: {
        status: "APPROVED",
        OR: [{ requesterId: artistId }, { recipientId: artistId }],
      },
      include: {
        requester: {
          select: {
            id: true,
            slug: true,
            fullName: true,
            isSuspended: true,
            isSystemAccount: true,
          },
        },
        recipient: {
          select: {
            id: true,
            slug: true,
            fullName: true,
            isSuspended: true,
            isSystemAccount: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    })) as ArtistConnectionRow[];
  } catch (error) {
    if (isConnectionStorageUnavailable(error)) return [];
    throw error;
  }

  return rows
    .map((row) => otherArtistFor(row, artistId))
    .filter(isVisibleArtist)
    .map(toMentionableArtist);
}

export async function getArtistConnectionCenterView(
  artistId: string,
): Promise<ArtistConnectionCenterView> {
  const artistConnection = getArtistConnectionDelegate();
  if (!artistConnection) {
    return { incoming: [], outgoing: [], approved: [], mentionTargets: [], requestsAllowed: true };
  }

  let rows: ArtistConnectionRow[];
  try {
    rows = (await artistConnection.findMany({
      where: {
        OR: [{ requesterId: artistId }, { recipientId: artistId }],
      },
      include: {
        requester: {
          select: {
            id: true,
            slug: true,
            fullName: true,
            isSuspended: true,
            isSystemAccount: true,
          },
        },
        recipient: {
          select: {
            id: true,
            slug: true,
            fullName: true,
            isSuspended: true,
            isSystemAccount: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    })) as ArtistConnectionRow[];
  } catch (error) {
    if (isConnectionStorageUnavailable(error)) {
      return {
        incoming: [],
        outgoing: [],
        approved: [],
        mentionTargets: [],
        requestsAllowed: true,
      };
    }
    throw error;
  }

  const visibleRows = rows.filter((row) => isVisibleArtist(otherArtistFor(row, artistId)));
  const incoming = visibleRows
    .filter((row) => row.status === "PENDING" && row.recipientId === artistId)
    .map((row) => summarize(row, artistId));
  const outgoing = visibleRows
    .filter((row) => row.status === "PENDING" && row.requesterId === artistId)
    .map((row) => summarize(row, artistId));
  const approved = visibleRows
    .filter((row) => row.status === "APPROVED")
    .map((row) => summarize(row, artistId));

  return {
    incoming,
    outgoing,
    approved,
    mentionTargets: approved.map((row) => row.otherArtist),
    requestsAllowed: await canArtistReceiveConnectionRequests(artistId),
  };
}

export async function canArtistReceiveConnectionRequests(artistId: string): Promise<boolean> {
  try {
    const pref = await getDb().notificationPreference.findUnique({
      where: { artistId },
      select: { connectionRequestsAllowed: true },
    });
    return pref?.connectionRequestsAllowed ?? true;
  } catch (error) {
    if (isConnectionPreferenceUnavailable(error)) return true;
    throw error;
  }
}

export async function createConnectionRequest(requesterId: string, recipientId: string) {
  if (requesterId === recipientId) {
    throw new Error("You cannot connect with yourself.");
  }

  const db = getDb();
  const artistConnection = getArtistConnectionDelegate();
  if (!artistConnection) throw connectionSetupError();

  const recipient = await db.artist.findFirst({
    where: { id: recipientId, isSuspended: false, isSystemAccount: false },
    select: { id: true, fullName: true },
  });
  if (!recipient) throw new Error("Artist not found.");

  const requester = await db.artist.findUnique({
    where: { id: requesterId },
    select: { id: true, fullName: true, slug: true },
  });
  if (!requester) throw new Error("Artist not found.");

  const [requesterEnabled, recipientEnabled] = await Promise.all([
    canUseArtistConnections({ distinctId: requesterId }),
    canUseArtistConnections({ distinctId: recipientId }),
  ]);
  if (!requesterEnabled || !recipientEnabled) {
    throw new Error("Artist connections are not available for one or both artists.");
  }

  const recipientAllowsRequests = await canArtistReceiveConnectionRequests(recipientId);
  if (!recipientAllowsRequests) {
    throw new Error("This artist is not accepting connection requests right now.");
  }

  const existing = await findConnectionBetween(requesterId, recipientId);
  if (existing?.status === "APPROVED") return existing;
  if (existing?.status === "PENDING") return existing;

  let connection;
  try {
    connection = existing
      ? await artistConnection.update({
          where: { id: existing.id },
          data: {
            requesterId,
            recipientId,
            status: "PENDING",
          },
        })
      : await artistConnection.create({
          data: {
            requesterId,
            recipientId,
            status: "PENDING",
          },
        });
  } catch (error) {
    if (isConnectionStorageUnavailable(error)) throw connectionSetupError();
    throw error;
  }

  await notifyArtistConnectionRequest({
    requesterId,
    requesterName: requester.fullName,
    requesterSlug: requester.slug,
    recipientId,
  });

  return connection;
}

export async function updateConnectionRequest(
  artistId: string,
  connectionId: string,
  status: "APPROVED" | "REJECTED",
) {
  const artistConnection = getArtistConnectionDelegate();
  if (!artistConnection) throw connectionSetupError();

  let connection;
  try {
    connection = await artistConnection.findUnique({
      where: { id: connectionId },
      include: {
        recipient: { select: { fullName: true } },
      },
    });
  } catch (error) {
    if (isConnectionStorageUnavailable(error)) throw connectionSetupError();
    throw error;
  }
  if (!connection || connection.recipientId !== artistId || connection.status !== "PENDING") {
    throw new Error("Connection request not found.");
  }

  let updated;
  try {
    updated = await artistConnection.update({
      where: { id: connectionId },
      data: { status },
    });
  } catch (error) {
    if (isConnectionStorageUnavailable(error)) throw connectionSetupError();
    throw error;
  }

  if (status === "APPROVED") {
    await notifyArtistConnectionApproved({
      requesterId: connection.requesterId,
      recipientId: connection.recipientId,
      recipientName: connection.recipient.fullName,
    });
  }

  return updated;
}

export async function removeConnectionForArtist(artistId: string, connectionId: string) {
  const artistConnection = getArtistConnectionDelegate();
  if (!artistConnection) throw connectionSetupError();

  let deleted;
  try {
    deleted = await artistConnection.deleteMany({
      where: {
        id: connectionId,
        OR: [{ requesterId: artistId }, { recipientId: artistId }],
      },
    });
  } catch (error) {
    if (isConnectionStorageUnavailable(error)) throw connectionSetupError();
    throw error;
  }
  if (deleted.count === 0) throw new Error("Connection not found.");
}
