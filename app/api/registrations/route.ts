/**
 * POST /api/registrations
 * Handles new artist registration requests.
 * Requirements: 1.6, 1.7, 1.9
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { StorageError, uploadFile } from '@/lib/storage';
import { notifyAdminRegistrationEvent } from '@/lib/notifications';
import { normalizeSpecialityList } from '@/lib/speciality-catalog';

function getFileExtension(contentType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  return map[contentType] ?? 'bin';
}

// ---------------------------------------------------------------------------
// Server-side Zod validation schema
// ---------------------------------------------------------------------------

export const registrationServerSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Valid email address is required'),
  contactNumber: z.string().min(1, 'Contact number is required'),
  contactType: z.enum(['whatsapp', 'mobile'], {
    required_error: 'Contact type is required',
    invalid_type_error: 'Contact type must be "whatsapp" or "mobile"',
  }),
  specialities: z
    .array(z.string().min(2).max(80))
    .min(1, 'At least one speciality is required')
    .max(3, 'Maximum 3 specialities allowed'),
  bioRichText: z.string().optional(),
  linkedinUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  instagramUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  facebookUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  twitterUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  youtubeUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  websiteUrls: z.array(z.string().url('Must be a valid URL')).optional(),
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

  // Validate profile photo file
  const profilePhotoFile = formData.get('profilePhoto') as File | null;
  if (!profilePhotoFile || profilePhotoFile.size === 0) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', fields: { profilePhoto: 'Profile photo is required' } },
      { status: 400 },
    );
  }

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const MAX_SIZE = 5 * 1024 * 1024;

  if (!ALLOWED_TYPES.includes(profilePhotoFile.type)) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', fields: { profilePhoto: 'Only JPEG, PNG, WebP, and GIF are accepted' } },
      { status: 400 },
    );
  }
  if (profilePhotoFile.size > MAX_SIZE) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', fields: { profilePhoto: 'Profile photo must be 5 MB or less' } },
      { status: 400 },
    );
  }

  const backgroundImageFile = formData.get('backgroundImage') as File | null;
  if (backgroundImageFile && backgroundImageFile.size > 0) {
    if (!ALLOWED_TYPES.includes(backgroundImageFile.type)) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', fields: { backgroundImage: 'Only JPEG, PNG, WebP, and GIF are accepted' } },
        { status: 400 },
      );
    }
    if (backgroundImageFile.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', fields: { backgroundImage: 'Background image must be 5 MB or less' } },
        { status: 400 },
      );
    }
  }

  // Upload files to R2
  const registrationId = crypto.randomUUID();

  let profilePhotoUrl: string;
  try {
    const profileBuffer = Buffer.from(await profilePhotoFile.arrayBuffer());
    const profileExt = getFileExtension(profilePhotoFile.type);
    profilePhotoUrl = await uploadFile({
      key: `registrations/${registrationId}/profile-photo.${profileExt}`,
      buffer: profileBuffer,
      contentType: profilePhotoFile.type,
      sizeBytes: profilePhotoFile.size,
    });
  } catch (err) {
    console.error('Profile photo upload failed:', err);
    const message =
      err instanceof StorageError && err.code === 'STORAGE_UNAVAILABLE'
        ? 'File storage is not available. On localhost, configure Cloudflare R2 in .env.local (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL).'
        : 'Failed to upload profile photo. Please try again.';
    return NextResponse.json({ error: 'UPLOAD_ERROR', message }, { status: 503 });
  }

  let backgroundImageUrl: string | undefined;
  if (backgroundImageFile && backgroundImageFile.size > 0) {
    try {
      const bgBuffer = Buffer.from(await backgroundImageFile.arrayBuffer());
      const bgExt = getFileExtension(backgroundImageFile.type);
      backgroundImageUrl = await uploadFile({
        key: `registrations/${registrationId}/background.${bgExt}`,
        buffer: bgBuffer,
        contentType: backgroundImageFile.type,
        sizeBytes: backgroundImageFile.size,
      });
    } catch (err) {
      console.error('Background image upload failed:', err);
      const message =
        err instanceof StorageError && err.code === 'STORAGE_UNAVAILABLE'
          ? 'File storage is not available. On localhost, configure Cloudflare R2 in .env.local (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL).'
          : 'Failed to upload background image. Please try again.';
      return NextResponse.json({ error: 'UPLOAD_ERROR', message }, { status: 503 });
    }
  }

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
    await getDb().registrationRequest.create({
      data: {
        id: registrationId,
        fullName: validated.fullName,
        email: validated.email,
        contactNumber: validated.contactNumber,
        contactType: validated.contactType as 'whatsapp' | 'mobile',
        profilePhotoUrl,
        backgroundImageUrl,
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
    console.error('Registration persistence failed:', err);
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: 'Failed to save registration. Please try again.' },
      { status: 500 },
    );
  }
}
