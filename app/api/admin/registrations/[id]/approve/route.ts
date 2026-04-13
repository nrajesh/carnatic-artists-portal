/**
 * POST /api/admin/registrations/[id]/approve
 *
 * Approves a pending RegistrationRequest:
 * 1. Fetch the RegistrationRequest by ID; return 404 if not found or already processed
 * 2. Generate a URL-friendly slug from the applicant's full name
 * 3. Create an Artist record from the registration data
 * 4. Create ArtistSpeciality records for each speciality
 * 5. Create ExternalLink records from the registration links
 * 6. Call issueMagicLink(email) to send the login link
 * 7. Update the RegistrationRequest status to "approved" with reviewedAt = now
 * 8. Return { success: true }
 *
 * Requirements: 2.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { issueMagicLink } from '@/lib/auth';

// ---------------------------------------------------------------------------
// Slug generation
// ---------------------------------------------------------------------------

/**
 * Generates a URL-friendly slug from a full name.
 * Appends a numeric suffix if the slug already exists.
 * e.g. "Ravi Shankar" → "ravi-shankar" or "ravi-shankar-1"
 */
export async function generateSlug(fullName: string): Promise<string> {
  const base = fullName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  // Check if base slug is available
  const existing = await db.artist.findUnique({ where: { slug: base } });
  if (!existing) return base;

  // Try numeric suffixes
  for (let i = 1; i <= 999; i++) {
    const candidate = `${base}-${i}`;
    const conflict = await db.artist.findUnique({ where: { slug: candidate } });
    if (!conflict) return candidate;
  }

  // Fallback: append timestamp
  return `${base}-${Date.now()}`;
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;

  // 1. Fetch the RegistrationRequest
  const registration = await db.registrationRequest.findUnique({
    where: { id },
    include: {
      specialities: true,
      links: true,
    },
  });

  if (!registration) {
    return NextResponse.json({ error: 'NOT_FOUND', message: 'Registration not found.' }, { status: 404 });
  }

  if (registration.status !== 'pending') {
    return NextResponse.json(
      { error: 'ALREADY_PROCESSED', message: 'This registration has already been processed.' },
      { status: 404 },
    );
  }

  const now = new Date();

  // 2. Generate slug
  const slug = await generateSlug(registration.fullName);

  // 3. Create Artist record
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

  // 4. Create ArtistSpeciality records
  for (let i = 0; i < registration.specialities.length; i++) {
    const spec = registration.specialities[i];
    // Look up the Speciality by name
    const speciality = await db.speciality.findUnique({
      where: { name: spec.specialityName },
    });
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

  // 5. Create ExternalLink records
  if (registration.links.length > 0) {
    await db.externalLink.createMany({
      data: registration.links.map((link) => ({
        artistId: artist.id,
        linkType: link.linkType,
        url: link.url,
      })),
    });
  }

  // 6. Issue magic link (send login email)
  await issueMagicLink(registration.email);

  // 7. Update RegistrationRequest status
  await db.registrationRequest.update({
    where: { id },
    data: {
      status: 'approved',
      reviewedAt: now,
    },
  });

  // 8. Return success
  return NextResponse.json({ success: true });
}
