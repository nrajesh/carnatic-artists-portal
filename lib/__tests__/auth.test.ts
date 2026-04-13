/**
 * Property-based tests for lib/auth.ts
 *
 * Feature: carnatic-artist-portal
 *
 * Property 6:  Magic link token expiry invariant   - Validates: Requirements 2.5
 * Property 20: Magic link invalidation on re-issue - Validates: Requirements 12.2
 * Property 21: Session expiry invariant            - Validates: Requirements 12.3
 *
 * Testing framework: Vitest + fast-check (≥100 iterations per property)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Hoisted mock state - must be defined before vi.mock calls
// ---------------------------------------------------------------------------

const mockState = vi.hoisted(() => {
  interface MockMagicLinkToken {
    id: string;
    artistId: string;
    tokenHash: string;
    expiresAt: Date;
    usedAt: Date | null;
  }

  interface MockSession {
    id: string;
    artistId: string;
    sessionTokenHash: string;
    role: string;
    expiresAt: Date;
    lastActiveAt: Date;
  }

  const state = {
    capturedTokenCreate: null as MockMagicLinkToken | null,
    capturedSessionCreate: null as MockSession | null,
    capturedUpdateManyArgs: null as { where: Record<string, unknown>; data: Record<string, unknown> } | null,
    mockExistingTokens: [] as MockMagicLinkToken[],
    mockArtist: null as { id: string; email: string } | null,
    mockTokenRecord: null as (MockMagicLinkToken & { artist: { id: string; email: string } }) | null,
  };

  return state;
});

// ---------------------------------------------------------------------------
// Mock the DB (hoisted-safe factory)
// ---------------------------------------------------------------------------

vi.mock('../db', () => {
  return {
    db: {
      artist: {
        findUnique: vi.fn(async () => mockState.mockArtist),
      },
      magicLinkToken: {
        updateMany: vi.fn(async (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
          mockState.capturedUpdateManyArgs = args;
          // Simulate marking tokens as used
          for (const token of mockState.mockExistingTokens) {
            if (token.usedAt === null) {
              token.usedAt = args.data.usedAt as Date;
            }
          }
          return { count: mockState.mockExistingTokens.length };
        }),
        create: vi.fn(async (args: { data: Record<string, unknown> }) => {
          const token = { id: 'new-token-id', ...args.data };
          mockState.capturedTokenCreate = token as typeof mockState.capturedTokenCreate;
          return token;
        }),
        findUnique: vi.fn(async () => mockState.mockTokenRecord),
        update: vi.fn(async () => mockState.mockTokenRecord),
      },
      session: {
        create: vi.fn(async (args: { data: Record<string, unknown> }) => {
          const session = { id: 'new-session-id', ...args.data };
          mockState.capturedSessionCreate = session as typeof mockState.capturedSessionCreate;
          return session;
        }),
      },
    },
  };
});

// Mock Resend so no real emails are sent
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ id: 'mock-email-id' }),
    },
  })),
}));

// ---------------------------------------------------------------------------
// Import the module under test AFTER mocks are set up
// ---------------------------------------------------------------------------

import { issueMagicLink, verifyMagicLink } from '../auth';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetState() {
  mockState.capturedTokenCreate = null;
  mockState.capturedSessionCreate = null;
  mockState.capturedUpdateManyArgs = null;
  mockState.mockExistingTokens = [];
  mockState.mockArtist = null;
  mockState.mockTokenRecord = null;
}

// Arbitrary that generates a Date within a reasonable range
// (between year 2000 and year 2100)
const arbDate = fc.integer({ min: 946684800000, max: 4102444800000 }).map((ms) => new Date(ms));

// ---------------------------------------------------------------------------
// Property 6: Magic link token expiry invariant
// Validates: Requirements 2.5
// ---------------------------------------------------------------------------

describe('Property 6: Magic link token expiry invariant', () => {
  beforeEach(() => {
    resetState();
    process.env.RESEND_API_KEY = 'test-key';
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com';
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  it('expiresAt === issuedAt + 72 hours for every issued token', async () => {
    await fc.assert(
      fc.asyncProperty(arbDate, async (issuedAt) => {
        resetState();
        mockState.mockArtist = { id: 'artist-1', email: 'test@example.com' };

        // Pass the frozen "now" directly to issueMagicLink
        await issueMagicLink('test@example.com', issuedAt);

        expect(mockState.capturedTokenCreate).not.toBeNull();
        const token = mockState.capturedTokenCreate!;

        const expectedExpiresAt = new Date(issuedAt.getTime() + 72 * 60 * 60 * 1000);
        expect(token.expiresAt.getTime()).toBe(expectedExpiresAt.getTime());
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 20: Magic link invalidation on re-issue
// Validates: Requirements 12.2
// ---------------------------------------------------------------------------

describe('Property 20: Magic link invalidation on re-issue', () => {
  beforeEach(() => {
    resetState();
    process.env.RESEND_API_KEY = 'test-key';
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com';
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  it('all prior unused tokens have usedAt set after issueMagicLink is called', async () => {
    // Generate a random count of prior tokens (1–5)
    const arbPriorTokenCount = fc.integer({ min: 1, max: 5 });

    await fc.assert(
      fc.asyncProperty(arbPriorTokenCount, async (priorCount) => {
        resetState();

        const artistId = 'artist-1';
        mockState.mockArtist = { id: artistId, email: 'test@example.com' };

        // Create prior unused tokens with a future expiry
        const now = new Date(1700000000000); // fixed reference point
        const futureExpiry = new Date(now.getTime() + 72 * 60 * 60 * 1000);
        mockState.mockExistingTokens = Array.from({ length: priorCount }, (_, i) => ({
          id: `prior-token-${i}`,
          artistId,
          tokenHash: `hash-${i}`,
          expiresAt: futureExpiry,
          usedAt: null,
        }));

        await issueMagicLink('test@example.com', now);

        // invalidatePriorTokens should have been called (via updateMany)
        expect(mockState.capturedUpdateManyArgs).not.toBeNull();

        // The updateMany call should target the correct artist and only unused tokens
        const updateArgs = mockState.capturedUpdateManyArgs!;
        expect(updateArgs.where.artistId).toBe(artistId);
        expect(updateArgs.where.usedAt).toBeNull();
        expect(updateArgs.data.usedAt).toBeInstanceOf(Date);

        // All prior tokens should now have usedAt set (simulated by mock)
        for (const token of mockState.mockExistingTokens) {
          expect(token.usedAt).not.toBeNull();
        }

        // A new token should have been created
        expect(mockState.capturedTokenCreate).not.toBeNull();
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 21: Session expiry invariant
// Validates: Requirements 12.3
// ---------------------------------------------------------------------------

describe('Property 21: Session expiry invariant', () => {
  beforeEach(() => {
    resetState();
  });

  it('expiresAt === createdAt + 30 days for every created session', async () => {
    await fc.assert(
      fc.asyncProperty(arbDate, async (createdAt) => {
        resetState();

        const artistId = 'artist-1';
        const artistEmail = 'test@example.com';

        // Token that is valid (not used, not expired relative to createdAt)
        const tokenExpiresAt = new Date(createdAt.getTime() + 72 * 60 * 60 * 1000);
        mockState.mockTokenRecord = {
          id: 'token-1',
          artistId,
          tokenHash: 'some-hash',
          expiresAt: tokenExpiresAt,
          usedAt: null,
          artist: { id: artistId, email: artistEmail },
        };

        // Pass the frozen "now" directly to verifyMagicLink
        await verifyMagicLink('raw-token-value', createdAt);

        expect(mockState.capturedSessionCreate).not.toBeNull();
        const session = mockState.capturedSessionCreate!;

        const expectedExpiresAt = new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);
        expect(session.expiresAt.getTime()).toBe(expectedExpiresAt.getTime());
      }),
      { numRuns: 100 },
    );
  });
});
