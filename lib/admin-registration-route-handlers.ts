/**
 * Registration approve/reject logic aligned with API routes (resolveSpecialityForApproval, reviewedBy, notifications).
 * Used by HTTP handlers and bulk admin actions.
 */

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { analyticsServer } from "@/lib/analytics-server";
import { revalidateHomeMarketing } from "@/lib/cache/home-marketing";
import { buildEncryptedArtistPiiPayload, decryptRegistrationStoredContact } from "@/lib/artist-pii";
import { issueMagicLink } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { notifyAdminRegistrationEvent } from "@/lib/notifications";
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

/**
 * For **approved** registrations only: emails a simple sign-in link (does not change status or review fields).
 */
export async function sendLoginLinkForApprovedRegistration(registrationId: string): Promise<SendLoginLinkForApprovedResult> {
  const db = getDb();
  const registration = await db.registrationRequest.findUnique({ where: { id: registrationId } });
  if (!registration) return { ok: false, error: "NOT_FOUND" };
  if (registration.status !== "approved") return { ok: false, error: "NOT_APPROVED" };
  const plain = decryptRegistrationStoredContact(registration);
  const magicLinkResult = await issueMagicLink(plain.email, undefined, { emailStyle: "admin_login_only" });
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
  analyticsDistinctId: string;
}): Promise<ApproveRouteResult> {
  const { registrationId, reviewerId, reviewComment, analyticsDistinctId } = options;
  const db = getDb();

  const registration = await db.registrationRequest.findUnique({
    where: { id: registrationId },
    include: { specialities: true, links: true },
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
      backgroundImageUrl: registration.backgroundImageUrl ?? undefined,
      bioRichText: registration.bioRichText ?? undefined,
      province: "",
    },
  });

  for (let i = 0; i < registration.specialities.length; i++) {
    const spec = registration.specialities[i];
    const speciality = await resolveSpecialityForApproval(db, spec.specialityName);
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

  const magicLinkResult = await issueMagicLink(plain.email);

  await db.registrationRequest.update({
    where: { id: registrationId },
    data: {
      status: "approved",
      reviewedAt: now,
      reviewedBy: reviewerId ?? undefined,
      reviewComment,
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

  return { ok: true, magicLinkEmailSent: magicLinkResult.emailSent };
}

export type RejectRouteResult = { ok: true } | { ok: false; error: "NOT_FOUND" | "ALREADY_PROCESSED" };

/**
 * Rejects one pending registration (same behaviour as POST /api/admin/registrations/[id]/reject).
 * Does not revalidate caches - caller should revalidate once after bulk operations.
 */
export async function rejectPendingRegistrationRouteStyle(options: {
  registrationId: string;
  reviewerId: string | undefined;
  reviewComment: string;
  analyticsDistinctId: string;
}): Promise<RejectRouteResult> {
  const { registrationId, reviewerId, reviewComment, analyticsDistinctId } = options;
  const db = getDb();

  const registration = await db.registrationRequest.findUnique({
    where: { id: registrationId },
  });

  if (!registration) return { ok: false, error: "NOT_FOUND" };
  if (registration.status !== "pending") return { ok: false, error: "ALREADY_PROCESSED" };

  const now = new Date();

  await db.registrationRequest.update({
    where: { id: registrationId },
    data: {
      status: "rejected",
      reviewedAt: now,
      reviewedBy: reviewerId ?? undefined,
      reviewComment,
    },
  });

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
