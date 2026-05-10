import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  admins: [] as Array<{
    id: string;
    email: string | null;
    fullName: string;
    isAdmin: boolean;
    isSuspended: boolean;
    notificationPreference?: null;
    pushSubscriptions?: Array<{ endpoint: string; p256dh: string; auth: string }>;
  }>,
  capturedArtistFindManyArgs: null as Record<string, unknown> | null,
  capturedNotificationCreateManyArgs: null as { data: Array<Record<string, unknown>> } | null,
}));

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  },
}));

vi.mock("../db", () => {
  const mockClient = {
    artist: {
      findMany: vi.fn(async (args: Record<string, unknown>) => {
        mockState.capturedArtistFindManyArgs = args;
        const where = (args.where ?? {}) as {
          isAdmin?: boolean;
          isSuspended?: boolean;
        };

        return mockState.admins.filter((admin) => {
          if (where.isAdmin === true && !admin.isAdmin) return false;
          if (where.isSuspended === false && admin.isSuspended) return false;
          return true;
        });
      }),
    },
    notification: {
      createMany: vi.fn(async (args: { data: Array<Record<string, unknown>> }) => {
        mockState.capturedNotificationCreateManyArgs = args;
        return { count: args.data.length };
      }),
    },
  };

  return { getDb: () => mockClient };
});

vi.mock("@/lib/artist-pii", () => ({
  decryptArtistStoredContact: vi.fn((artist: { email: string | null }) => ({
    email: artist.email ?? "",
  })),
}));

vi.mock("@/lib/email-templates", () => ({
  getPortalNameForEmail: vi.fn(() => "Portal"),
  transactionalEmailHtml: vi.fn(() => "<p>Email</p>"),
  transactionalEmailPlainText: vi.fn(() => "Email"),
}));

vi.mock("@/lib/resend-email", () => ({
  sendResendEmail: vi.fn(),
}));

import { notifyAdminRegistrationEvent } from "../notifications";

describe("notifyAdminRegistrationEvent", () => {
  beforeEach(() => {
    mockState.admins = [];
    mockState.capturedArtistFindManyArgs = null;
    mockState.capturedNotificationCreateManyArgs = null;
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
  });

  it("skips suspended admins when notifying about a new registration", async () => {
    mockState.admins = [
      {
        id: "admin-active",
        email: "active@example.com",
        fullName: "Active Admin",
        isAdmin: true,
        isSuspended: false,
        notificationPreference: null,
        pushSubscriptions: [],
      },
      {
        id: "admin-suspended",
        email: "suspended@example.com",
        fullName: "Suspended Admin",
        isAdmin: true,
        isSuspended: true,
        notificationPreference: null,
        pushSubscriptions: [],
      },
    ];

    await notifyAdminRegistrationEvent({
      event: "new_registration",
      registrationId: "reg-1",
      applicantName: "New Artist",
      applicantEmail: "artist@example.com",
    });

    expect(mockState.capturedArtistFindManyArgs).toMatchObject({
      where: {
        isAdmin: true,
        isSuspended: false,
      },
    });
    expect(mockState.capturedNotificationCreateManyArgs?.data).toEqual([
      expect.objectContaining({
        artistId: "admin-active",
        type: "new_registration",
        isRead: false,
      }),
    ]);
  });

  it("creates no notifications when every matching admin is suspended", async () => {
    mockState.admins = [
      {
        id: "admin-suspended",
        email: "suspended@example.com",
        fullName: "Suspended Admin",
        isAdmin: true,
        isSuspended: true,
        notificationPreference: null,
        pushSubscriptions: [],
      },
    ];

    await notifyAdminRegistrationEvent({
      event: "new_registration",
      registrationId: "reg-2",
      applicantName: "Another Artist",
      applicantEmail: "another@example.com",
    });

    expect(mockState.capturedNotificationCreateManyArgs).toBeNull();
  });
});
