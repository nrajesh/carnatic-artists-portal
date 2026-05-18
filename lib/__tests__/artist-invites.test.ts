import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  inviteRow: null as { inviterArtistId: string } | null,
  existingConnection: null as { id: string; status: "PENDING" | "APPROVED" | "REJECTED" } | null,
  createdConnection: null as Record<string, unknown> | null,
  updatedConnection: null as Record<string, unknown> | null,
}));

vi.mock("../db", () => {
  const mockClient = {
    artistInvite: {
      findUnique: vi.fn(async () => mockState.inviteRow),
    },
    artistConnection: {
      findFirst: vi.fn(async () => mockState.existingConnection),
      create: vi.fn(async (args: { data: Record<string, unknown> }) => {
        mockState.createdConnection = args.data;
        return { id: "new-connection", ...args.data };
      }),
      update: vi.fn(async (args: { data: Record<string, unknown> }) => {
        mockState.updatedConnection = args.data;
        return { id: "existing-connection", ...args.data };
      }),
    },
  };

  return { getDb: () => mockClient };
});

import { approveInviteAutoConnection } from "../artist-invites";

describe("approveInviteAutoConnection", () => {
  beforeEach(() => {
    mockState.inviteRow = null;
    mockState.existingConnection = null;
    mockState.createdConnection = null;
    mockState.updatedConnection = null;
  });

  it("creates an approved connection when an opted-in invite reaches approval", async () => {
    mockState.inviteRow = { inviterArtistId: "artist-inviter" };

    const result = await approveInviteAutoConnection({
      inviteId: "invite-id",
      artistId: "artist-new",
      autoConnectOptIn: true,
    });

    expect(result).toEqual({
      inviterArtistId: "artist-inviter",
      status: "created",
    });
    expect(mockState.createdConnection).toEqual({
      requesterId: "artist-inviter",
      recipientId: "artist-new",
      status: "APPROVED",
    });
  });

  it("upgrades an existing pending connection to approved", async () => {
    mockState.inviteRow = { inviterArtistId: "artist-inviter" };
    mockState.existingConnection = {
      id: "connection-id",
      status: "PENDING",
    };

    const result = await approveInviteAutoConnection({
      inviteId: "invite-id",
      artistId: "artist-new",
      autoConnectOptIn: true,
    });

    expect(result).toEqual({
      inviterArtistId: "artist-inviter",
      status: "updated",
    });
    expect(mockState.updatedConnection).toEqual({
      requesterId: "artist-inviter",
      recipientId: "artist-new",
      status: "APPROVED",
    });
  });
});
