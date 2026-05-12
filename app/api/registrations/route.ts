/**
 * POST /api/registrations
 * Handles new artist registration requests.
 * Requirements: 1.6, 1.7, 1.9
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  encryptPiiField,
  emailLookupHash,
  isPiiCryptoConfigured,
  normalizeEmailForLookup,
} from "@/lib/pii-crypto";
import { notifyAdminRegistrationEvent } from "@/lib/notifications";
import {
  deleteManagedProfilePhotoBestEffort,
  isUploadedProfilePhotoFile,
  uploadRegistrationProfilePhoto,
} from "@/lib/profile-photo-storage";
import { normalizeSpecialityList } from "@/lib/speciality-catalog";
import { logSafeError } from "@/lib/safe-log";
import { StorageError } from "@/lib/storage";
import { registrationServerSchema } from "@/lib/registration-server-schema";

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "INVALID_REQUEST", message: "Could not parse form data" },
      { status: 400 },
    );
  }

  // Extract text fields
  const specialitiesNormalized = normalizeSpecialityList(
    formData.getAll("specialities") as string[],
  );

  const rawData = {
    fullName: formData.get("fullName") as string | null,
    email: formData.get("email") as string | null,
    province: (formData.get("province") as string | null) ?? "",
    contactNumber: formData.get("contactNumber") as string | null,
    contactType: formData.get("contactType") as string | null,
    profilePhotoUrl: formData.get("profilePhotoUrl") as string | null,
    backgroundImageUrl: formData.get("backgroundImageUrl") as string | null,
    specialities: specialitiesNormalized,
    bioRichText: (formData.get("bioRichText") as string | null) ?? undefined,
    linkedinUrl: (formData.get("linkedinUrl") as string | null) ?? undefined,
    instagramUrl: (formData.get("instagramUrl") as string | null) ?? undefined,
    facebookUrl: (formData.get("facebookUrl") as string | null) ?? undefined,
    twitterUrl: (formData.get("twitterUrl") as string | null) ?? undefined,
    youtubeUrl: (formData.get("youtubeUrl") as string | null) ?? undefined,
    websiteUrls: formData.getAll("websiteUrls") as string[],
  };

  // Server-side validation
  const parseResult = registrationServerSchema.safeParse(rawData);
  if (!parseResult.success) {
    const fields: Record<string, string> = {};
    for (const issue of parseResult.error.issues) {
      const key = issue.path.join(".");
      if (!fields[key]) fields[key] = issue.message;
    }
    return NextResponse.json({ error: "VALIDATION_ERROR", fields }, { status: 400 });
  }

  const validated = parseResult.data;

  if (!isPiiCryptoConfigured()) {
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Registration is temporarily unavailable." },
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
      { error: "DUPLICATE_EMAIL", message: "An artist account already uses this email." },
      { status: 409 },
    );
  }
  const pendingRegistration = await db.registrationRequest.findFirst({
    where: {
      status: "pending",
      OR: [{ emailLookupHash: emailHash }, { email: normalizedEmail }],
    },
    select: { id: true },
  });
  if (pendingRegistration) {
    return NextResponse.json(
      {
        error: "DUPLICATE_REGISTRATION",
        message: "A pending registration already exists for this email.",
      },
      { status: 409 },
    );
  }

  const registrationId = crypto.randomUUID();
  const backgroundImageUrl = validated.backgroundImageUrl;
  const profilePhotoFileEntry = formData.get("profilePhotoFile");
  const hasProfilePhotoFile = isUploadedProfilePhotoFile(profilePhotoFileEntry);
  const profilePhotoRightsConfirmed = formData.get("profilePhotoRightsConfirmed") === "true";
  let uploadedProfilePhoto: { url: string; objectKey: string; rightsConfirmedAt: Date } | null =
    null;

  if (hasProfilePhotoFile) {
    if (!profilePhotoRightsConfirmed) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "Confirm that you have rights to use the profile photo.",
          fields: {
            profilePhotoRightsConfirmed: "Confirm that you have rights to use the profile photo.",
          },
        },
        { status: 400 },
      );
    }

    try {
      const upload = await uploadRegistrationProfilePhoto({
        registrationId,
        file: profilePhotoFileEntry,
      });
      uploadedProfilePhoto = {
        ...upload,
        rightsConfirmedAt: new Date(),
      };
    } catch (err) {
      const message =
        err instanceof StorageError && err.code !== "STORAGE_UNAVAILABLE"
          ? err.message
          : "Profile photo upload is temporarily unavailable.";
      return NextResponse.json(
        {
          error: "PROFILE_PHOTO_UPLOAD_FAILED",
          message,
          fields: { profilePhotoFile: message },
        },
        { status: err instanceof StorageError && err.code !== "STORAGE_UNAVAILABLE" ? 400 : 503 },
      );
    }
  }

  // Persist to DB
  let registrationCreated = false;
  try {
    // Build external links
    const links: Array<{ linkType: string; url: string }> = [];
    if (validated.linkedinUrl) links.push({ linkType: "linkedin", url: validated.linkedinUrl });
    if (validated.instagramUrl) links.push({ linkType: "instagram", url: validated.instagramUrl });
    if (validated.facebookUrl) links.push({ linkType: "facebook", url: validated.facebookUrl });
    if (validated.twitterUrl) links.push({ linkType: "twitter", url: validated.twitterUrl });
    if (validated.youtubeUrl) links.push({ linkType: "youtube", url: validated.youtubeUrl });
    for (const url of validated.websiteUrls ?? []) {
      if (url) links.push({ linkType: "website", url });
    }

    // Create RegistrationRequest + related records in a transaction
    const phoneTrim = validated.contactNumber.trim();
    const hasPhone = phoneTrim.length > 0;
    await db.registrationRequest.create({
      data: {
        id: registrationId,
        fullName: validated.fullName,
        province: validated.province.trim(),
        email: null,
        contactNumber: null,
        emailCipher: encryptPiiField(normalizedEmail),
        emailLookupHash: emailHash,
        contactCipher: hasPhone ? encryptPiiField(phoneTrim) : null,
        contactType: hasPhone ? (validated.contactType as "whatsapp" | "mobile") : null,
        // Empty string when omitted: works before/after DB migration (NOT NULL legacy + optional URL).
        profilePhotoUrl: uploadedProfilePhoto?.url ?? "",
        profilePhotoSourceUrl: null,
        profilePhotoObjectKey: uploadedProfilePhoto?.objectKey ?? null,
        profilePhotoRightsConfirmedAt: uploadedProfilePhoto?.rightsConfirmedAt ?? null,
        backgroundImageUrl: backgroundImageUrl ?? undefined,
        bioRichText: validated.bioRichText,
        status: "pending",
        specialities: {
          create: validated.specialities.map((name) => ({ specialityName: name })),
        },
        links: {
          create: links,
        },
      },
    });
    registrationCreated = true;

    await notifyAdminRegistrationEvent({
      event: "new_registration",
      registrationId,
      applicantName: validated.fullName,
      applicantEmail: validated.email,
      baseUrl: request.nextUrl.origin,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (!registrationCreated) {
      await deleteManagedProfilePhotoBestEffort(uploadedProfilePhoto?.objectKey);
    }
    logSafeError("[api/registrations] Registration persistence failed", err);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Failed to save registration. Please try again." },
      { status: 500 },
    );
  }
}
