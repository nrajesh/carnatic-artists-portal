/**
 * Admin approval/rejection core logic.
 * Extracted from HTTP handlers so it can be unit/property tested independently.
 *
 * Requirements: 2.3, 2.4
 */

import { db } from './db';
import { issueMagicLink } from './auth';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApprovalResult {
  success: true;
  artistId: string;
  slug: string;
}

export interface RejectionResult {
  success: true;
}

export type ApprovalError =
  | { error: 'NOT_FOUND' }
  | { error: 'ALREADY_PROCESSED' };

export type RejectionError =
  | { error: 'NOT_FOUND' }
  | { error: 'ALREADY_PROCESSED' };

// ---------------------------------------------------------------------------
// Slug generation
// ---------------------------------------------------------------------------

/**
 * Generates a URL-friendly slug from a full name.
 * Appends a numeric suffix if the slug already exists.
 */
export async function generateSlug(fullName: string): Promise<string> {
  const base = fullName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const existing = await db.artist.findUnique({ where: { slug: base } });
  if (!existing) return base;

  for (let i = 1; i <= 999; i++) {
    const candidate = `${base}-${i}`;
    const conflict = await db.artist.findUnique({ where: { slug: candidate } });
    if (!conflict) return candidate;
  }

  return `${base}-${Date.now()}`;
}

// ---------------------------------------------------------------------------
// approveRegistration
// ---------------------------------------------------------------------------

/**
 * Approves a pending RegistrationRequest.
 * Creates Artist, ArtistSpeciality, ExternalLink records, issues magic link,
 * and marks the request as approved.
 */
export async function approveRegistration(
  registrationId: string,
): Promise<ApprovalResult | ApprovalError> {
  const registration = await db.registrationRequest.findUnique({
    where: { id: registrationId },
    include: { specialities: true, links: true },
  });

  if (!registration) return { error: 'NOT_FOUND' };
  if (registration.status !== 'pending') return { error: 'ALREADY_PROCESSED' };

  const now = new Date();
  const slug = await generateSlug(registration.fullName);

  // Create Artist
  const artist = await db.artist.create({
    data: {
      slug,
      fullName: registration.fullName,
      email: registration.email,
      contactNumber: registration.contactNumber,
      contactType: registration.contactType,
      profilePhotoUrl: registration.profilePhotoUrl,
      backgroundImageUrl: registration.backgroundImageUrl ?? undefined,
      bioRichText: registration.bioRichText ?? undefined,
      province: '',
    },
  });

  // Create ArtistSpeciality records
  for (let i = 0; i < registration.specialities.length; i++) {
    const spec = registration.specialities[i];
    const speciality = await db.speciality.findUnique({ where: { name: spec.specialityName } });
    if (speciality) {
      await db.artistSpeciality.create({
        data: {
          artistId: artist.id,
          specialityId: speciality.id,
          displayOrder: i,
        },
      });
    }
  }

  // Create ExternalLink records
  if (registration.links.length > 0) {
    await db.externalLink.createMany({
      data: registration.links.map((link) => ({
        artistId: artist.id,
        linkType: link.linkType,
        url: link.url,
      })),
    });
  }

  // Issue magic link
  await issueMagicLink(registration.email);

  // Mark as approved
  await db.registrationRequest.update({
    where: { id: registrationId },
    data: { status: 'approved', reviewedAt: now },
  });

  return { success: true, artistId: artist.id, slug };
}

// ---------------------------------------------------------------------------
// rejectRegistration
// ---------------------------------------------------------------------------

/**
 * Rejects a pending RegistrationRequest.
 * Does NOT create an Artist record.
 */
export async function rejectRegistration(
  registrationId: string,
): Promise<RejectionResult | RejectionError> {
  const registration = await db.registrationRequest.findUnique({
    where: { id: registrationId },
  });

  if (!registration) return { error: 'NOT_FOUND' };
  if (registration.status !== 'pending') return { error: 'ALREADY_PROCESSED' };

  const now = new Date();

  await db.registrationRequest.update({
    where: { id: registrationId },
    data: { status: 'rejected', reviewedAt: now },
  });

  return { success: true };
}

// ---------------------------------------------------------------------------
// filterRegistrations - pure function for Property 7
// ---------------------------------------------------------------------------

export interface RegistrationFilter {
  status?: string;
  from?: Date;
  to?: Date;
}

export interface RegistrationRecord {
  id: string;
  status: string;
  submittedAt: Date;
  fullName: string;
  email: string;
}

/**
 * Pure function that filters an array of registration records by status and/or date range.
 * Used for Property 7 testing.
 */
export function filterRegistrations(
  requests: RegistrationRecord[],
  filters: RegistrationFilter,
): RegistrationRecord[] {
  return requests.filter((req) => {
    // Status filter
    if (filters.status !== undefined && filters.status !== '') {
      if (req.status !== filters.status) return false;
    }

    // Date range filter
    if (filters.from !== undefined) {
      if (req.submittedAt < filters.from) return false;
    }
    if (filters.to !== undefined) {
      if (req.submittedAt > filters.to) return false;
    }

    return true;
  });
}
