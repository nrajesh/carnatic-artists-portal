/**
 * Admin approval/rejection core logic.
 * Extracted from HTTP handlers so it can be unit/property tested independently.
 *
 * Requirements: 2.3, 2.4
 */

import { randomUUID } from 'crypto';
import { buildEncryptedArtistPiiPayload, decryptRegistrationStoredContact } from '@/lib/artist-pii';
import { getDb } from './db';
import { issueMagicLink } from './auth';
import { REGISTRATION_APPROVE_DEFAULT_COMMENT } from './admin-review-comment';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApprovalResult {
  success: true;
  artistId: string;
  slug: string;
  /** False when RESEND_API_KEY is missing or Resend rejected the send (token still created). */
  magicLinkEmailSent: boolean;
}

export interface RejectionResult {
  success: true;
}

export type ApprovalError =
  | { error: 'NOT_FOUND' }
  | { error: 'ALREADY_PROCESSED' };

export type RejectionError =
  | { error: 'NOT_FOUND' }
  | { error: 'ALREADY_PROCESSED' }
  | { error: 'COMMENT_REQUIRED' };

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

  const existing = await getDb().artist.findUnique({ where: { slug: base } });
  if (!existing) return base;

  for (let i = 1; i <= 999; i++) {
    const candidate = `${base}-${i}`;
    const conflict = await getDb().artist.findUnique({ where: { slug: candidate } });
    if (!conflict) return candidate;
  }

  return `${base}-${Date.now()}`;
}

// ---------------------------------------------------------------------------
// approveRegistration
// ---------------------------------------------------------------------------

/**
 * Approves a RegistrationRequest in **pending** or **rejected** state.
 * Already **approved** returns ALREADY_PROCESSED (use send-login-link for email-only).
 */
export async function approveRegistration(
  registrationId: string,
  reviewComment: string = REGISTRATION_APPROVE_DEFAULT_COMMENT,
): Promise<ApprovalResult | ApprovalError> {
  const registration = await getDb().registrationRequest.findUnique({
    where: { id: registrationId },
    include: { specialities: true, links: true },
  });

  if (!registration) return { error: 'NOT_FOUND' };

  if (registration.status !== 'pending' && registration.status !== 'rejected') {
    return { error: 'ALREADY_PROCESSED' };
  }

  const now = new Date();
  const slug = await generateSlug(registration.fullName);

  const plain = decryptRegistrationStoredContact(registration);
  const artistId = randomUUID();
  const pii = buildEncryptedArtistPiiPayload(artistId, plain.email, plain.contactNumber);

  // Create Artist
  const artist = await getDb().artist.create({
    data: {
      id: artistId,
      slug,
      fullName: registration.fullName,
      email: pii.emailPlaceholder,
      contactNumber: null,
      emailCipher: pii.emailCipher,
      emailLookupHash: pii.emailLookupHash,
      contactCipher: pii.contactCipher,
      contactType: registration.contactType,
      profilePhotoUrl: registration.profilePhotoUrl ?? '',
      backgroundImageUrl: registration.backgroundImageUrl ?? undefined,
      bioRichText: registration.bioRichText ?? undefined,
      province: '',
    },
  });

  // Create ArtistSpeciality records
  for (let i = 0; i < registration.specialities.length; i++) {
    const spec = registration.specialities[i];
    const speciality = await getDb().speciality.findUnique({ where: { name: spec.specialityName } });
    if (speciality) {
      await getDb().artistSpeciality.create({
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
    await getDb().externalLink.createMany({
      data: registration.links.map((link) => ({
        artistId: artist.id,
        linkType: link.linkType,
        url: link.url,
      })),
    });
  }

  const magicLinkResult = await issueMagicLink(plain.email);

  // Mark as approved
  await getDb().registrationRequest.update({
    where: { id: registrationId },
    data: { status: 'approved', reviewedAt: now, reviewComment },
  });

  return { success: true, artistId: artist.id, slug, magicLinkEmailSent: magicLinkResult.emailSent };
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
  reviewComment: string,
): Promise<RejectionResult | RejectionError> {
  const registration = await getDb().registrationRequest.findUnique({
    where: { id: registrationId },
  });

  if (!registration) return { error: 'NOT_FOUND' };
  if (registration.status !== 'pending') return { error: 'ALREADY_PROCESSED' };

  const trimmed = reviewComment.trim();
  if (!trimmed) return { error: 'COMMENT_REQUIRED' };

  const now = new Date();

  await getDb().registrationRequest.update({
    where: { id: registrationId },
    data: { status: 'rejected', reviewedAt: now, reviewComment: trimmed },
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
