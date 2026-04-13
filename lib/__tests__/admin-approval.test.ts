/**
 * Property-based tests for admin approval workflow.
 *
 * Feature: carnatic-artist-portal
 *
 * Property 4: Approval creates artist and token  - Validates: Requirements 2.3
 * Property 5: Rejection does not create artist   - Validates: Requirements 2.4
 * Property 7: Registration request filter correctness - Validates: Requirements 2.8
 *
 * Testing framework: Vitest + fast-check (≥100 iterations per property)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Hoisted mock state
// ---------------------------------------------------------------------------

const mockState = vi.hoisted(() => {
  interface CapturedArtist {
    slug: string;
    fullName: string;
    email: string;
    contactNumber: string;
    contactType: string;
    profilePhotoUrl: string;
    backgroundImageUrl?: string;
    bioRichText?: string;
    province: string;
  }

  interface CapturedMagicLinkToken {
    artistId: string;
    tokenHash: string;
    expiresAt: Date;
    usedAt: Date | null;
  }

  interface CapturedRegistrationUpdate {
    where: { id: string };
    data: { status: string; reviewedAt: Date };
  }

  const state = {
    // DB state
    mockRegistration: null as Record<string, unknown> | null,
    mockSlugConflict: false,

    // Captured calls
    capturedArtistCreate: null as CapturedArtist | null,
    capturedMagicLinkToken: null as CapturedMagicLinkToken | null,
    capturedRegistrationUpdate: null as CapturedRegistrationUpdate | null,
    artistCreateCallCount: 0,

    // issueMagicLink mock
    issueMagicLinkCallCount: 0,
    issueMagicLinkCalledWith: null as string | null,
  };

  return state;
});

// ---------------------------------------------------------------------------
// Mock the DB
// ---------------------------------------------------------------------------

vi.mock('../db', () => {
  return {
    db: {
      registrationRequest: {
        findUnique: vi.fn(async () => mockState.mockRegistration),
        update: vi.fn(async (args: { where: { id: string }; data: Record<string, unknown> }) => {
          mockState.capturedRegistrationUpdate = args as typeof mockState.capturedRegistrationUpdate;
          return { ...mockState.mockRegistration, ...args.data };
        }),
      },
      artist: {
        findUnique: vi.fn(async () => {
          // Return null unless slug conflict is set
          return mockState.mockSlugConflict ? { id: 'existing', slug: 'test-slug' } : null;
        }),
        create: vi.fn(async (args: { data: Record<string, unknown> }) => {
          mockState.capturedArtistCreate = args.data as typeof mockState.capturedArtistCreate;
          mockState.artistCreateCallCount += 1;
          return { id: 'new-artist-id', ...args.data };
        }),
      },
      speciality: {
        findUnique: vi.fn(async () => ({ id: 'spec-id', name: 'Vocal', primaryColor: '#000', textColor: '#fff' })),
      },
      artistSpeciality: {
        create: vi.fn(async () => ({})),
      },
      externalLink: {
        createMany: vi.fn(async () => ({ count: 0 })),
      },
      magicLinkToken: {
        updateMany: vi.fn(async () => ({ count: 0 })),
        create: vi.fn(async (args: { data: Record<string, unknown> }) => {
          mockState.capturedMagicLinkToken = args.data as typeof mockState.capturedMagicLinkToken;
          return { id: 'token-id', ...args.data };
        }),
        findUnique: vi.fn(async () => null),
      },
    },
  };
});

// ---------------------------------------------------------------------------
// Mock issueMagicLink (from lib/auth)
// ---------------------------------------------------------------------------

vi.mock('../auth', () => {
  return {
    issueMagicLink: vi.fn(async (email: string) => {
      mockState.issueMagicLinkCallCount += 1;
      mockState.issueMagicLinkCalledWith = email;
    }),
  };
});

// ---------------------------------------------------------------------------
// Import under test AFTER mocks
// ---------------------------------------------------------------------------

import { approveRegistration, rejectRegistration, filterRegistrations } from '../admin-approval';
import type { RegistrationRecord, RegistrationFilter } from '../admin-approval';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetState() {
  mockState.mockRegistration = null;
  mockState.mockSlugConflict = false;
  mockState.capturedArtistCreate = null;
  mockState.capturedMagicLinkToken = null;
  mockState.capturedRegistrationUpdate = null;
  mockState.artistCreateCallCount = 0;
  mockState.issueMagicLinkCallCount = 0;
  mockState.issueMagicLinkCalledWith = null;
}

// Arbitrary: non-empty string (ASCII-safe for slugs)
const arbNonEmptyString = fc
  .string({ minLength: 1, maxLength: 60 })
  .filter((s) => s.trim().length > 0);

// Arbitrary: valid email
const arbEmail = fc
  .tuple(
    fc.stringMatching(/^[a-z]{3,10}$/),
    fc.stringMatching(/^[a-z]{3,10}$/),
    fc.constantFrom('com', 'nl', 'org'),
  )
  .map(([u, d, t]) => `${u}@${d}.${t}`);

// Arbitrary: contact type
const arbContactType = fc.constantFrom('whatsapp' as const, 'mobile' as const);

// Arbitrary: speciality names
const arbSpecialityNames = fc
  .array(fc.constantFrom('Vocal', 'Violin', 'Mridangam', 'Veena', 'Flute'), {
    minLength: 1,
    maxLength: 3,
  })
  .map((arr) => [...new Set(arr)])
  .filter((arr) => arr.length >= 1);

// Arbitrary: pending registration record
const arbPendingRegistration = fc.record({
  id: fc.uuid(),
  fullName: arbNonEmptyString,
  email: arbEmail,
  contactNumber: arbNonEmptyString,
  contactType: arbContactType,
  profilePhotoUrl: fc.constant('https://cdn.example.com/photo.jpg'),
  backgroundImageUrl: fc.option(fc.constant('https://cdn.example.com/bg.jpg'), { nil: undefined }),
  bioRichText: fc.option(arbNonEmptyString, { nil: undefined }),
  status: fc.constant('pending' as const),
  submittedAt: fc.constant(new Date('2024-01-01')),
  reviewedAt: fc.constant(null),
  reviewedBy: fc.constant(null),
  specialities: arbSpecialityNames.map((names) =>
    names.map((name) => ({ registrationId: 'reg-id', specialityName: name })),
  ),
  links: fc.constant([] as Array<{ id: string; registrationId: string; linkType: string; url: string }>),
});

// ---------------------------------------------------------------------------
// Property 4: Approval creates artist and token
// Validates: Requirements 2.3
// ---------------------------------------------------------------------------

describe('Property 4: Approval creates artist and token', () => {
  beforeEach(() => {
    resetState();
  });

  it('creates exactly one Artist and one MagicLinkToken for any pending registration', async () => {
    await fc.assert(
      fc.asyncProperty(arbPendingRegistration, async (registration) => {
        resetState();

        // Set up mock DB to return this registration
        mockState.mockRegistration = registration as unknown as Record<string, unknown>;

        const result = await approveRegistration(registration.id);

        // Must succeed
        expect(result).toHaveProperty('success', true);

        // Exactly one Artist created
        expect(mockState.artistCreateCallCount).toBe(1);
        expect(mockState.capturedArtistCreate).not.toBeNull();

        // Artist has the registration's data
        const artist = mockState.capturedArtistCreate!;
        expect(artist.fullName).toBe(registration.fullName);
        expect(artist.email).toBe(registration.email);
        expect(artist.contactNumber).toBe(registration.contactNumber);
        expect(artist.contactType).toBe(registration.contactType);
        expect(artist.profilePhotoUrl).toBe(registration.profilePhotoUrl);

        // issueMagicLink was called exactly once with the correct email
        expect(mockState.issueMagicLinkCallCount).toBe(1);
        expect(mockState.issueMagicLinkCalledWith).toBe(registration.email);

        // Registration was updated to "approved"
        expect(mockState.capturedRegistrationUpdate).not.toBeNull();
        expect(mockState.capturedRegistrationUpdate!.data.status).toBe('approved');
        expect(mockState.capturedRegistrationUpdate!.data.reviewedAt).toBeInstanceOf(Date);
      }),
      { numRuns: 100 },
    );
  });

  it('returns NOT_FOUND for a non-existent registration', async () => {
    resetState();
    mockState.mockRegistration = null;

    const result = await approveRegistration('non-existent-id');
    expect(result).toEqual({ error: 'NOT_FOUND' });
    expect(mockState.artistCreateCallCount).toBe(0);
    expect(mockState.issueMagicLinkCallCount).toBe(0);
  });

  it('returns ALREADY_PROCESSED for an already-approved registration', async () => {
    resetState();
    mockState.mockRegistration = {
      id: 'reg-1',
      status: 'approved',
      fullName: 'Test',
      email: 'test@example.com',
      contactNumber: '123',
      contactType: 'whatsapp',
      profilePhotoUrl: 'https://cdn.example.com/photo.jpg',
      specialities: [],
      links: [],
    };

    const result = await approveRegistration('reg-1');
    expect(result).toEqual({ error: 'ALREADY_PROCESSED' });
    expect(mockState.artistCreateCallCount).toBe(0);
    expect(mockState.issueMagicLinkCallCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Property 5: Rejection does not create artist
// Validates: Requirements 2.4
// ---------------------------------------------------------------------------

describe('Property 5: Rejection does not create artist', () => {
  beforeEach(() => {
    resetState();
  });

  it('sets status to "rejected" and does NOT create an Artist for any pending registration', async () => {
    await fc.assert(
      fc.asyncProperty(arbPendingRegistration, async (registration) => {
        resetState();

        mockState.mockRegistration = registration as unknown as Record<string, unknown>;

        const result = await rejectRegistration(registration.id);

        // Must succeed
        expect(result).toHaveProperty('success', true);

        // No Artist created
        expect(mockState.artistCreateCallCount).toBe(0);
        expect(mockState.capturedArtistCreate).toBeNull();

        // No magic link issued
        expect(mockState.issueMagicLinkCallCount).toBe(0);

        // Registration updated to "rejected"
        expect(mockState.capturedRegistrationUpdate).not.toBeNull();
        expect(mockState.capturedRegistrationUpdate!.data.status).toBe('rejected');
        expect(mockState.capturedRegistrationUpdate!.data.reviewedAt).toBeInstanceOf(Date);
      }),
      { numRuns: 100 },
    );
  });

  it('returns NOT_FOUND for a non-existent registration', async () => {
    resetState();
    mockState.mockRegistration = null;

    const result = await rejectRegistration('non-existent-id');
    expect(result).toEqual({ error: 'NOT_FOUND' });
    expect(mockState.artistCreateCallCount).toBe(0);
  });

  it('returns ALREADY_PROCESSED for an already-rejected registration', async () => {
    resetState();
    mockState.mockRegistration = {
      id: 'reg-1',
      status: 'rejected',
      fullName: 'Test',
      email: 'test@example.com',
      contactNumber: '123',
      contactType: 'whatsapp',
      profilePhotoUrl: 'https://cdn.example.com/photo.jpg',
    };

    const result = await rejectRegistration('reg-1');
    expect(result).toEqual({ error: 'ALREADY_PROCESSED' });
    expect(mockState.artistCreateCallCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Property 7: Registration request filter correctness
// Validates: Requirements 2.8
// ---------------------------------------------------------------------------

describe('Property 7: Registration request filter correctness', () => {
  // Arbitrary: a single registration record
  const arbStatus = fc.constantFrom('pending', 'approved', 'rejected');

  // Dates between 2023-01-01 and 2025-12-31
  const arbDate = fc
    .integer({ min: new Date('2023-01-01').getTime(), max: new Date('2025-12-31').getTime() })
    .map((ms) => new Date(ms));

  const arbRegistrationRecord = fc.record({
    id: fc.uuid(),
    status: arbStatus,
    submittedAt: arbDate,
    fullName: fc.string({ minLength: 1, maxLength: 40 }),
    email: arbEmail,
  });

  // Arbitrary: array of registration records (0–20)
  const arbRegistrationArray = fc.array(arbRegistrationRecord, { minLength: 0, maxLength: 20 });

  // Arbitrary: filter (status and/or date range)
  const arbFilter = fc.record({
    status: fc.option(arbStatus, { nil: undefined }),
    from: fc.option(arbDate, { nil: undefined }),
    to: fc.option(arbDate, { nil: undefined }),
  });

  it('every result satisfies all applied filter criteria', () => {
    fc.assert(
      fc.property(arbRegistrationArray, arbFilter, (requests, filter) => {
        const results = filterRegistrations(requests, filter);

        for (const result of results) {
          // Status filter
          if (filter.status !== undefined && filter.status !== '') {
            expect(result.status).toBe(filter.status);
          }

          // Date range filter
          if (filter.from !== undefined) {
            expect(result.submittedAt.getTime()).toBeGreaterThanOrEqual(filter.from.getTime());
          }
          if (filter.to !== undefined) {
            expect(result.submittedAt.getTime()).toBeLessThanOrEqual(filter.to.getTime());
          }
        }
      }),
      { numRuns: 200 },
    );
  });

  it('no matching result is omitted from the filtered output', () => {
    fc.assert(
      fc.property(arbRegistrationArray, arbFilter, (requests, filter) => {
        const results = filterRegistrations(requests, filter);
        const resultIds = new Set(results.map((r) => r.id));

        // Every request that satisfies all criteria must appear in results
        for (const req of requests) {
          const matchesStatus =
            filter.status === undefined || filter.status === '' || req.status === filter.status;
          const matchesFrom =
            filter.from === undefined || req.submittedAt.getTime() >= filter.from.getTime();
          const matchesTo =
            filter.to === undefined || req.submittedAt.getTime() <= filter.to.getTime();

          if (matchesStatus && matchesFrom && matchesTo) {
            expect(resultIds.has(req.id)).toBe(true);
          }
        }
      }),
      { numRuns: 200 },
    );
  });

  it('returns all records when no filters are applied', () => {
    fc.assert(
      fc.property(arbRegistrationArray, (requests) => {
        const results = filterRegistrations(requests, {});
        expect(results).toHaveLength(requests.length);
      }),
      { numRuns: 100 },
    );
  });

  it('returns empty array when no records match the filter', () => {
    // All records are "pending", filter for "approved"
    const pendingRecords: RegistrationRecord[] = [
      { id: '1', status: 'pending', submittedAt: new Date('2024-06-01'), fullName: 'A', email: 'a@b.com' },
      { id: '2', status: 'pending', submittedAt: new Date('2024-06-02'), fullName: 'B', email: 'b@c.com' },
    ];
    const filter: RegistrationFilter = { status: 'approved' };
    const results = filterRegistrations(pendingRecords, filter);
    expect(results).toHaveLength(0);
  });

  it('date range filter is inclusive on both ends', () => {
    const from = new Date('2024-03-01T00:00:00.000Z');
    const to = new Date('2024-03-31T23:59:59.999Z');

    const records: RegistrationRecord[] = [
      { id: '1', status: 'pending', submittedAt: new Date('2024-03-01T00:00:00.000Z'), fullName: 'A', email: 'a@b.com' },
      { id: '2', status: 'pending', submittedAt: new Date('2024-03-15T12:00:00.000Z'), fullName: 'B', email: 'b@c.com' },
      { id: '3', status: 'pending', submittedAt: new Date('2024-03-31T23:59:59.999Z'), fullName: 'C', email: 'c@d.com' },
      { id: '4', status: 'pending', submittedAt: new Date('2024-02-28T23:59:59.999Z'), fullName: 'D', email: 'd@e.com' },
      { id: '5', status: 'pending', submittedAt: new Date('2024-04-01T00:00:00.000Z'), fullName: 'E', email: 'e@f.com' },
    ];

    const results = filterRegistrations(records, { from, to });
    const resultIds = results.map((r) => r.id).sort();
    expect(resultIds).toEqual(['1', '2', '3']);
  });
});
