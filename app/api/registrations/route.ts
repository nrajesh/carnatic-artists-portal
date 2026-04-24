/**
 * POST /api/registrations
 * Handles new artist registration requests.
 * Requirements: 1.6, 1.7, 1.9
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { encryptPiiField, emailLookupHash, isPiiCryptoConfigured, normalizeEmailForLookup } from '@/lib/pii-crypto';
import { notifyAdminRegistrationEvent } from '@/lib/notifications';
import { normalizeSpecialityList } from '@/lib/speciality-catalog';
import { logSafeError } from '@/lib/safe-log';
import {
  mergeFacebookUrl,
  mergeInstagramUrl,
  mergeLinkedinUrl,
  mergeTwitterUrl,
  mergeWebsitePath,
  mergeYoutubeUrl,
  isPlausibleContactNumber,
  sanitizeContactNumberInput,
} from '@/lib/registration-input-normalize';

/** Empty / missing → undefined. When set, must be a valid HTTPS image URL (path merged with https://). */
const optionalHttpsPhotoUrl = z.preprocess((val: unknown) => {
  if (val === undefined || val === null) return undefined;
  if (typeof val !== 'string') return undefined;
  const t = val.trim();
  if (t === '') return undefined;
  return mergeWebsitePath(t);
}, z.union([z.undefined(), z.string().url('Must be a valid URL').refine((u) => /^https:\/\//i.test(u), 'Must use HTTPS')]));

function optionalMergedSocial(merge: (s: string) => string) {
  return z.preprocess(
    (val: unknown) => (typeof val === 'string' ? merge(val.trim()) : ''),
    z.union([z.literal(''), z.string().url('Must be a valid URL')]),
  );
}

// ---------------------------------------------------------------------------
// Server-side Zod validation schema
// ---------------------------------------------------------------------------

export const registrationServerSchema = z
  .object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Valid email address is required'),
  contactNumber: z.preprocess(
    (v: unknown) => (typeof v === 'string' ? sanitizeContactNumberInput(v) : ''),
    z.string(),
  ),
  contactType: z.preprocess((v: unknown) => {
    if (v === null || v === undefined) return '';
    if (typeof v !== 'string') return '';
    return v.trim();
  }, z.union([z.literal(''), z.enum(['whatsapp', 'mobile'])])),
  profilePhotoUrl: optionalHttpsPhotoUrl,
  backgroundImageUrl: optionalHttpsPhotoUrl,
  specialities: z
    .array(z.string().min(2).max(80))
    .min(1, 'At least one speciality is required')
    .max(3, 'Maximum 3 specialities allowed'),
  bioRichText: z.string().optional(),
  linkedinUrl: optionalMergedSocial(mergeLinkedinUrl),
  instagramUrl: optionalMergedSocial(mergeInstagramUrl),
  facebookUrl: optionalMergedSocial(mergeFacebookUrl),
  twitterUrl: optionalMergedSocial(mergeTwitterUrl),
  youtubeUrl: optionalMergedSocial(mergeYoutubeUrl),
  websiteUrls: z.preprocess(
    (val: unknown) => {
      if (!Array.isArray(val)) return [];
      return val
        .filter((x): x is string => typeof x === 'string')
        .map((s) => mergeWebsitePath(s.trim()))
        .filter((u) => u !== '');
    },
    z.array(z.string().url('Must be a valid URL')).optional(),
  ),
})
  .superRefine((data, ctx) => {
    const phone = data.contactNumber.trim();
    if (!phone) return;
    if (!isPlausibleContactNumber(phone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Use 7-15 digits. Optional + only at the start.',
        path: ['contactNumber'],
      });
    }
    if (data.contactType !== 'whatsapp' && data.contactType !== 'mobile') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Select WhatsApp or mobile for your contact number.',
        path: ['contactType'],
      });
    }
  });

export type RegistrationServerData = z.infer<typeof registrationServerSchema>;

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: 'INVALID_REQUEST', message: 'Could not parse form data' },
      { status: 400 },
    );
  }

  // Extract text fields
  const specialitiesNormalized = normalizeSpecialityList(formData.getAll('specialities') as string[]);

  const rawData = {
    fullName: formData.get('fullName') as string | null,
    email: formData.get('email') as string | null,
    contactNumber: formData.get('contactNumber') as string | null,
    contactType: formData.get('contactType') as string | null,
    profilePhotoUrl: formData.get('profilePhotoUrl') as string | null,
    backgroundImageUrl: formData.get('backgroundImageUrl') as string | null,
    specialities: specialitiesNormalized,
    bioRichText: (formData.get('bioRichText') as string | null) ?? undefined,
    linkedinUrl: (formData.get('linkedinUrl') as string | null) ?? undefined,
    instagramUrl: (formData.get('instagramUrl') as string | null) ?? undefined,
    facebookUrl: (formData.get('facebookUrl') as string | null) ?? undefined,
    twitterUrl: (formData.get('twitterUrl') as string | null) ?? undefined,
    youtubeUrl: (formData.get('youtubeUrl') as string | null) ?? undefined,
    websiteUrls: formData.getAll('websiteUrls') as string[],
  };

  // Server-side validation
  const parseResult = registrationServerSchema.safeParse(rawData);
  if (!parseResult.success) {
    const fields: Record<string, string> = {};
    for (const issue of parseResult.error.issues) {
      const key = issue.path.join('.');
      if (!fields[key]) fields[key] = issue.message;
    }
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', fields },
      { status: 400 },
    );
  }

  const validated = parseResult.data;

  if (!isPiiCryptoConfigured()) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: 'Registration is temporarily unavailable.' },
      { status: 503 },
    );
  }

  const normalizedEmail = normalizeEmailForLookup(validated.email);
  const emailHash = emailLookupHash(normalizedEmail);
  const db = getDb();
  const existingArtist = await db.artist.findFirst({
    where: {
      OR: [{ emailLookupHash: emailHash }, { email: normalizedEmail }],
    },
    select: { id: true },
  });
  if (existingArtist) {
    return NextResponse.json(
      { error: 'DUPLICATE_EMAIL', message: 'An artist account already uses this email.' },
      { status: 409 },
    );
  }
  const pendingRegistration = await db.registrationRequest.findFirst({
    where: {
      status: 'pending',
      OR: [{ emailLookupHash: emailHash }, { email: normalizedEmail }],
    },
    select: { id: true },
  });
  if (pendingRegistration) {
    return NextResponse.json(
      { error: 'DUPLICATE_REGISTRATION', message: 'A pending registration already exists for this email.' },
      { status: 409 },
    );
  }

  const registrationId = crypto.randomUUID();
  const profilePhotoUrl = validated.profilePhotoUrl;
  const backgroundImageUrl = validated.backgroundImageUrl;

  // Persist to DB
  try {
    // Build external links
    const links: Array<{ linkType: string; url: string }> = [];
    if (validated.linkedinUrl) links.push({ linkType: 'linkedin', url: validated.linkedinUrl });
    if (validated.instagramUrl) links.push({ linkType: 'instagram', url: validated.instagramUrl });
    if (validated.facebookUrl) links.push({ linkType: 'facebook', url: validated.facebookUrl });
    if (validated.twitterUrl) links.push({ linkType: 'twitter', url: validated.twitterUrl });
    if (validated.youtubeUrl) links.push({ linkType: 'youtube', url: validated.youtubeUrl });
    for (const url of validated.websiteUrls ?? []) {
      if (url) links.push({ linkType: 'website', url });
    }

    // Create RegistrationRequest + related records in a transaction
    const phoneTrim = validated.contactNumber.trim();
    const hasPhone = phoneTrim.length > 0;
    await db.registrationRequest.create({
      data: {
        id: registrationId,
        fullName: validated.fullName,
        email: null,
        contactNumber: null,
        emailCipher: encryptPiiField(normalizedEmail),
        emailLookupHash: emailHash,
        contactCipher: hasPhone ? encryptPiiField(phoneTrim) : null,
        contactType: hasPhone ? (validated.contactType as 'whatsapp' | 'mobile') : null,
        // Empty string when omitted: works before/after DB migration (NOT NULL legacy + optional URL).
        profilePhotoUrl: profilePhotoUrl ?? '',
        backgroundImageUrl: backgroundImageUrl ?? undefined,
        bioRichText: validated.bioRichText,
        status: 'pending',
        specialities: {
          create: validated.specialities.map((name) => ({ specialityName: name })),
        },
        links: {
          create: links,
        },
      },
    });

    await notifyAdminRegistrationEvent({
      event: 'new_registration',
      registrationId,
      applicantName: validated.fullName,
      applicantEmail: validated.email,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    logSafeError('[api/registrations] Registration persistence failed', err);
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: 'Failed to save registration. Please try again.' },
      { status: 500 },
    );
  }
}
