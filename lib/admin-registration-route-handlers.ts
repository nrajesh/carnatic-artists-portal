/**
 * Registration approve/reject logic aligned with API routes (resolveSpecialityForApproval, reviewedBy, notifications).
 * Used by HTTP handlers and bulk admin actions.
 */

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { analyticsServer } from "@/lib/analytics-server";
import { approveInviteAutoConnection } from "@/lib/artist-invites";
import { revalidateHomeMarketing } from "@/lib/cache/home-marketing";
import { buildEncryptedArtistPiiPayload, decryptRegistrationStoredContact } from "@/lib/artist-pii";
import { issueMagicLink } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { notifyAdminRegistrationEvent } from "@/lib/notifications";
import {
  deleteManagedFileByUrlBestEffort,
  deleteManagedProfilePhotoBestEffort,
} from "@/lib/profile-photo-storage";
import { resolveSpecialityForApproval } from "@/lib/speciality-resolve";

export async function generateRegistrationArtistSlug(fullName: string): Promise<string> {
  const base = fullName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const db = getDb();
  const existing = await db.artist.findUnique({ where: { slug: base } });
  if (!existing) return base;

  for (let i = 1; i <= 999; i++) {
    const candidate = `${base}-${i}`;
    const conflict = await db.artist.findUnique({ where: { slug: candidate } });
    if (!conflict) return candidate;
  }

  return `${base}-${Date.now()}`;
}

export type ApproveRouteResult =
  | { ok: true; magicLinkEmailSent: boolean }
  | { ok: false; error: "NOT_FOUND" | "ALREADY_PROCESSED" };

export type SendLoginLinkForApprovedResult =
  | { ok: true; magicLinkEmailSent: boolean }
  | { ok: false; error: "NOT_FOUND" | "NOT_APPROVED" | "NO_ARTIST" };

export type UpdateRegistrationSpecialitiesResult =
  | { ok: true }
  | { ok: false; error: "NOT_FOUND" | "ALREADY_APPROVED" };

export async function updateRegistrationSpecialitiesRouteStyle(options: {
  registrationId: string;
  specialityNames: string[];
}): Promise<UpdateRegistrationSpecialitiesResult> {
  const { registrationId, specialityNames } = options;
  const db = getDb();

  const registration = await db.registrationRequest.findUnique({
    where: { id: registrationId },
    select: { id: true, status: true },
  });
  if (!registration) return { ok: false, error: "NOT_FOUND" };
  if (registration.status === "approved") return { ok: false, error: "ALREADY_APPROVED" };

  for (const specialityName of specialityNames) {
    await resolveSpecialityForApproval(db, specialityName);
  }

  await db.registrationRequest.update({
    where: { id: registrationId },
    data: {
      specialities: {
        deleteMany: {},
        create: specialityNames.map((specialityName) => ({ specialityName })),
      },
    },
  });

  return { ok: true };
}

/**
 * For **approved** registrations only: emails a simple sign-in link (does not change status or review fields).
 */
export async function sendLoginLinkForApprovedRegistration(
  registrationId: string,
  baseUrl?: string,
): Promise<SendLoginLinkForApprovedResult> {
  const db = getDb();
  const registration = await db.registrationRequest.findUnique({ where: { id: registrationId } });
  if (!registration) return { ok: false, error: "NOT_FOUND" };
  if (registration.status !== "approved") return { ok: false, error: "NOT_APPROVED" };
  const plain = decryptRegistrationStoredContact(registration);
  const magicLinkResult = await issueMagicLink(plain.email, undefined, {
    emailStyle: "admin_login_only",
    baseUrl,
  });
  if (!magicLinkResult.emailSent && magicLinkResult.reason === "artist_not_found") {
    return { ok: false, error: "NO_ARTIST" };
  }
  return { ok: true, magicLinkEmailSent: magicLinkResult.emailSent };
}

/**
 * Approves **pending** or **rejected** (creates artist + magic link). Already **approved** is not handled here — use
 * {@link sendLoginLinkForApprovedRegistration} instead.
 */
export async function approvePendingRegistrationRouteStyle(options: {
  registrationId: string;
  reviewerId: string | undefined;
  reviewComment: string;
  specialityNames?: string[];
  analyticsDistinctId: string;
  baseUrl?: string;
}): Promise<ApproveRouteResult> {
  const {
    registrationId,
    reviewerId,
    reviewComment,
    specialityNames,
    analyticsDistinctId,
    baseUrl,
  } = options;
  const db = getDb();

  const registration = await db.registrationRequest.findUnique({
    where: { id: registrationId },
    include: {
      specialities: true,
      links: true,
      invite: {
        select: {
          inviterArtistId: true,
          selectedLinkType: true,
          selectedLinkUrl: true,
        },
      },
    },
  });

  if (!registration) return { ok: false, error: "NOT_FOUND" };

  if (registration.status !== "pending" && registration.status !== "rejected") {
    return { ok: false, error: "ALREADY_PROCESSED" };
  }

  const now = new Date();
  const slug = await generateRegistrationArtistSlug(registration.fullName);
  const plain = decryptRegistrationStoredContact(registration);
  const artistId = randomUUID();
  const pii = buildEncryptedArtistPiiPayload(artistId, plain.email, plain.contactNumber);
  const selectedSpecialityNames =
    specialityNames ?? registration.specialities.map((spec) => spec.specialityName);

  const artist = await db.artist.create({
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
      profilePhotoUrl: registration.profilePhotoUrl ?? "",
      profilePhotoSourceUrl: registration.profilePhotoSourceUrl ?? null,
      profilePhotoObjectKey: registration.profilePhotoObjectKey ?? null,
      profilePhotoRightsConfirmedAt: registration.profilePhotoRightsConfirmedAt ?? null,
      backgroundImageUrl: registration.backgroundImageUrl ?? undefined,
      bioRichText: registration.bioRichText ?? undefined,
      province: registration.province,
    },
  });

  for (let i = 0; i < selectedSpecialityNames.length; i++) {
    const specialityName = selectedSpecialityNames[i]!;
    const speciality = await resolveSpecialityForApproval(db, specialityName);
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

  if (registration.links.length > 0) {
    await db.externalLink.createMany({
      data: registration.links.map((link) => ({
        artistId: artist.id,
        linkType: link.linkType,
        url: link.url,
      })),
    });
  }

  const inviteAutoConnection = await approveInviteAutoConnection({
    inviteId: registration.inviteId,
    artistId: artist.id,
    autoConnectOptIn: registration.inviteAutoConnectOptIn,
  });

  const magicLinkResult = await issueMagicLink(plain.email, undefined, { baseUrl });

  await db.registrationRequest.update({
    where: { id: registrationId },
    data: {
      status: "approved",
      reviewedAt: now,
      reviewedBy: reviewerId ?? undefined,
      reviewComment,
      ...(specialityNames
        ? {
            specialities: {
              deleteMany: {},
              create: selectedSpecialityNames.map((specialityName) => ({ specialityName })),
            },
          }
        : {}),
    },
  });

  const reviewer = reviewerId
    ? await db.artist.findUnique({
        where: { id: reviewerId },
        select: { fullName: true },
      })
    : null;

  await notifyAdminRegistrationEvent({
    event: "registration_approved",
    registrationId,
    applicantName: registration.fullName,
    applicantEmail: plain.email,
    baseUrl,
    reviewedByName: reviewer?.fullName,
    reviewComment,
  });

  try {
    analyticsServer?.capture({
      distinctId: analyticsDistinctId,
      event: "registration_approved",
      properties: { registration_id: registrationId },
    });
  } catch {
    /* ignore */
  }

  if (registration.invite) {
    try {
      analyticsServer?.capture({
        distinctId: registration.invite.inviterArtistId,
        event: "invite_registration_approved",
        properties: {
          registration_id: registrationId,
          invited_artist_id: artist.id,
          featured_link_type: registration.invite.selectedLinkType,
          featured_link_url: registration.invite.selectedLinkUrl,
          invite_auto_connect_opt_in: registration.inviteAutoConnectOptIn,
          invite_auto_connection_status: inviteAutoConnection.status,
        },
      });

      if (inviteAutoConnection.status === "created" || inviteAutoConnection.status === "updated") {
        analyticsServer?.capture({
          distinctId: registration.invite.inviterArtistId,
          event: "invite_auto_connection_created",
          properties: {
            registration_id: registrationId,
            invited_artist_id: artist.id,
            featured_link_type: registration.invite.selectedLinkType,
            invite_auto_connection_status: inviteAutoConnection.status,
          },
        });
      }
    } catch {
      //
    }
  }

  return { ok: true, magicLinkEmailSent: magicLinkResult.emailSent };
}

export type RejectRouteResult =
  | { ok: true }
  | { ok: false; error: "NOT_FOUND" | "ALREADY_PROCESSED" };

/**
 * Rejects one pending registration (same behaviour as POST /api/admin/registrations/[id]/reject).
 * Does not revalidate caches - caller should revalidate once after bulk operations.
 */
export async function rejectPendingRegistrationRouteStyle(options: {
  registrationId: string;
  reviewerId: string | undefined;
  reviewComment: string;
  analyticsDistinctId: string;
  baseUrl?: string;
}): Promise<RejectRouteResult> {
  const { registrationId, reviewerId, reviewComment, analyticsDistinctId, baseUrl } = options;
  const db = getDb();

  const registration = await db.registrationRequest.findUnique({
    where: { id: registrationId },
  });

  if (!registration) return { ok: false, error: "NOT_FOUND" };
  if (registration.status !== "pending") return { ok: false, error: "ALREADY_PROCESSED" };

  const now = new Date();

  const profilePhotoObjectKey = registration.profilePhotoObjectKey;
  const backgroundImageUrl = registration.backgroundImageUrl;

  await db.registrationRequest.update({
    where: { id: registrationId },
    data: {
      status: "rejected",
      reviewedAt: now,
      reviewedBy: reviewerId ?? undefined,
      reviewComment,
      profilePhotoUrl: "",
      profilePhotoSourceUrl: registration.profilePhotoSourceUrl ?? registration.profilePhotoUrl,
      profilePhotoObjectKey: null,
      profilePhotoRightsConfirmedAt: null,
    },
  });

  await deleteManagedProfilePhotoBestEffort(profilePhotoObjectKey);
  await deleteManagedFileByUrlBestEffort(backgroundImageUrl);

  const reviewer = reviewerId
    ? await db.artist.findUnique({
        where: { id: reviewerId },
        select: { fullName: true },
      })
    : null;

  const plainContact = decryptRegistrationStoredContact(registration);

  await notifyAdminRegistrationEvent({
    event: "registration_rejected",
    registrationId,
    applicantName: registration.fullName,
    applicantEmail: plainContact.email,
    baseUrl,
    reviewedByName: reviewer?.fullName,
    reviewComment,
  });

  try {
    analyticsServer?.capture({
      distinctId: analyticsDistinctId,
      event: "registration_rejected",
      properties: { registration_id: registrationId },
    });
  } catch {
    /* ignore */
  }

  return { ok: true };
}

export function revalidateAfterRegistrationMutation(): void {
  revalidatePath("/admin/specialities");
  revalidateHomeMarketing();
}
