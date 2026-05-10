import webpush from "web-push";
import { decryptArtistStoredContact } from "@/lib/artist-pii";
import { maskEmailForDisplay } from "@/lib/pii-display";
import { getDb } from "@/lib/db";
import {
  getPortalNameForEmail,
  transactionalEmailHtml,
  transactionalEmailPlainText,
} from "@/lib/email-templates";
import { sendResendEmail } from "@/lib/resend-email";

export type ReviewNotificationEvent = "added" | "updated" | "deleted";
export type AdminRegistrationNotificationEvent =
  | "new_registration"
  | "registration_approved"
  | "registration_rejected";

type NotificationPreferenceSnapshot = {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  webPushEnabled: boolean;
  reviewAddedEnabled: boolean;
  reviewUpdatedEnabled: boolean;
  reviewDeletedEnabled: boolean;
  newRegistrationEnabled: boolean;
  registrationApprovedEnabled: boolean;
  registrationRejectedEnabled: boolean;
};

function normalizeAppUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
}

function buildReviewMessage(input: {
  reviewerName: string;
  collabName: string;
  action: ReviewNotificationEvent;
  rating?: number;
}): string {
  if (input.action === "deleted") {
    return `${input.reviewerName} deleted a review for ${input.collabName}.`;
  }
  return `${input.reviewerName} ${input.action} a ${input.rating ?? 0}★ review for ${input.collabName}.`;
}

function reviewEventEnabled(
  pref: Pick<
    NotificationPreferenceSnapshot,
    "reviewAddedEnabled" | "reviewUpdatedEnabled" | "reviewDeletedEnabled"
  >,
  action: ReviewNotificationEvent,
): boolean {
  if (action === "added") return pref.reviewAddedEnabled;
  if (action === "updated") return pref.reviewUpdatedEnabled;
  return pref.reviewDeletedEnabled;
}

function adminRegistrationEventEnabled(
  pref: Pick<
    NotificationPreferenceSnapshot,
    "newRegistrationEnabled" | "registrationApprovedEnabled" | "registrationRejectedEnabled"
  >,
  event: AdminRegistrationNotificationEvent,
): boolean {
  if (event === "new_registration") return pref.newRegistrationEnabled;
  if (event === "registration_approved") return pref.registrationApprovedEnabled;
  return pref.registrationRejectedEnabled;
}

function ensureWebPushConfigured(): boolean {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

function defaultNotificationPreferences(): NotificationPreferenceSnapshot {
  return {
    inAppEnabled: true,
    emailEnabled: true,
    webPushEnabled: false,
    reviewAddedEnabled: true,
    reviewUpdatedEnabled: true,
    reviewDeletedEnabled: true,
    newRegistrationEnabled: true,
    registrationApprovedEnabled: true,
    registrationRejectedEnabled: true,
  };
}

async function sendPushNotifications(input: {
  subscriptions: Array<{ endpoint: string; p256dh: string; auth: string }>;
  title: string;
  body: string;
  url: string;
}): Promise<void> {
  if (!ensureWebPushConfigured() || input.subscriptions.length === 0) return;

  const payload = JSON.stringify({
    title: input.title,
    body: input.body,
    url: input.url,
  });

  await Promise.all(
    input.subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
        );
      } catch {
        // Ignore stale subscriptions; a dedicated cleanup job can prune these.
      }
    }),
  );
}

export async function notifyReviewEvent(input: {
  revieweeId: string;
  reviewerName: string;
  collabId: string;
  collabName: string;
  action: ReviewNotificationEvent;
  rating?: number;
}): Promise<void> {
  const db = getDb();
  const revieweeRow = await db.artist.findUnique({
    where: { id: input.revieweeId },
    select: {
      id: true,
      email: true,
      emailCipher: true,
      contactCipher: true,
      contactNumber: true,
      slug: true,
      fullName: true,
    },
  });
  if (!revieweeRow) return;
  const revieweeAddr = decryptArtistStoredContact(revieweeRow).email;

  const pref =
    (await db.notificationPreference.findUnique({
      where: { artistId: revieweeRow.id },
      select: {
        inAppEnabled: true,
        emailEnabled: true,
        webPushEnabled: true,
        reviewAddedEnabled: true,
        reviewUpdatedEnabled: true,
        reviewDeletedEnabled: true,
        newRegistrationEnabled: true,
        registrationApprovedEnabled: true,
        registrationRejectedEnabled: true,
      },
    })) ?? defaultNotificationPreferences();

  if (!reviewEventEnabled(pref, input.action)) return;

  const message = buildReviewMessage(input);
  const href = `/artists/${revieweeRow.slug}#reviews`;

  if (pref.inAppEnabled) {
    await db.notification.create({
      data: {
        artistId: revieweeRow.id,
        type: `feedback_${input.action}`,
        payload: {
          text: message,
          href,
          collabId: input.collabId,
          action: input.action,
        },
      },
    });
  }

  if (pref.emailEnabled) {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      const fromEmail = process.env.RESEND_FROM_EMAIL ?? "noreply@artist-discovery.example";
      const profileUrl = `${normalizeAppUrl()}${href}`;
      const portal = getPortalNameForEmail();
      const reviewContent = {
        eyebrow: `Hi ${revieweeRow.fullName},`,
        title: `Review ${input.action}`,
        paragraphs: [message],
        primaryCta: { href: profileUrl, label: "View your reviews" },
      };
      await sendResendEmail({
        apiKey: resendApiKey,
        from: fromEmail,
        to: revieweeAddr,
        subject: `Review ${input.action} · ${portal}`,
        html: transactionalEmailHtml(reviewContent),
        text: transactionalEmailPlainText(reviewContent),
      });
    }
  }

  if (pref.webPushEnabled && ensureWebPushConfigured()) {
    const subscriptions = await db.pushSubscription.findMany({
      where: { artistId: revieweeRow.id },
      select: { endpoint: true, p256dh: true, auth: true },
    });
    await sendPushNotifications({
      subscriptions,
      title: "Review activity",
      body: message,
      url: href,
    });
  }
}

function buildAdminRegistrationMessage(input: {
  event: AdminRegistrationNotificationEvent;
  applicantName: string;
  applicantEmail: string;
  reviewedByName?: string;
  reviewComment?: string;
}): { title: string; text: string; emailSubject: string } {
  if (input.event === "new_registration") {
    return {
      title: "New registration",
      text: `New registration from ${input.applicantName}.`,
      emailSubject: "New artist registration request",
    };
  }

  if (input.event === "registration_approved") {
    const byText = input.reviewedByName ? ` by ${input.reviewedByName}` : "";
    const note =
      input.reviewComment && input.reviewComment.trim()
        ? ` Review note: ${input.reviewComment.trim()}`
        : "";
    return {
      title: "Registration approved",
      text: `Registration for ${input.applicantName} was approved${byText}.${note}`,
      emailSubject: "Registration approved",
    };
  }

  const byText = input.reviewedByName ? ` by ${input.reviewedByName}` : "";
  const reason = input.reviewComment?.trim()
    ? ` Reason: ${input.reviewComment.trim()}`
    : "";
  return {
    title: "Registration rejected",
    text: `Registration for ${input.applicantName} was rejected${byText}.${reason}`,
    emailSubject: "Registration rejected",
  };
}

export async function notifyAdminRegistrationEvent(input: {
  event: AdminRegistrationNotificationEvent;
  registrationId: string;
  applicantName: string;
  applicantEmail: string;
  baseUrl?: string;
  reviewedByName?: string;
  /** Stored admin review text (reject: required; approve: optional, may be default “Approved”). */
  reviewComment?: string;
}): Promise<void> {
  const db = getDb();
  const admins = await db.artist.findMany({
    where: {
      isAdmin: true,
      isSuspended: false,
    },
    select: {
      id: true,
      email: true,
      emailCipher: true,
      contactCipher: true,
      contactNumber: true,
      fullName: true,
      notificationPreference: {
        select: {
          inAppEnabled: true,
          emailEnabled: true,
          webPushEnabled: true,
          reviewAddedEnabled: true,
          reviewUpdatedEnabled: true,
          reviewDeletedEnabled: true,
          newRegistrationEnabled: true,
          registrationApprovedEnabled: true,
          registrationRejectedEnabled: true,
        },
      },
      pushSubscriptions: {
        select: {
          endpoint: true,
          p256dh: true,
          auth: true,
        },
      },
    },
  });
  if (admins.length === 0) return;

  const appUrl = (input.baseUrl?.trim() || normalizeAppUrl()).replace(/\/+$/, "");
  const href = `/admin/registrations/${input.registrationId}`;
  const fullHref = appUrl ? `${appUrl}${href}` : href;
  const rendered = buildAdminRegistrationMessage(input);
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "noreply@artist-discovery.example";

  const inAppRows = admins
    .map((admin) => {
      const pref = admin.notificationPreference ?? defaultNotificationPreferences();
      if (!adminRegistrationEventEnabled(pref, input.event) || !pref.inAppEnabled) {
        return null;
      }

      return {
        artistId: admin.id,
        type: input.event,
        payload: {
          text: rendered.text,
          href,
          registrationId: input.registrationId,
          applicantName: input.applicantName,
          applicantEmailMasked: maskEmailForDisplay(input.applicantEmail),
          ...(input.reviewComment != null && input.reviewComment !== ""
            ? { reviewComment: input.reviewComment }
            : {}),
        },
        isRead: false,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (inAppRows.length > 0) {
    await db.notification.createMany({
      data: inAppRows,
    });
  }

  if (resendApiKey) {
    await Promise.all(
      admins.map(async (admin) => {
        const pref = admin.notificationPreference ?? defaultNotificationPreferences();
        if (!adminRegistrationEventEnabled(pref, input.event) || !pref.emailEnabled) return;

        const adminInbox = decryptArtistStoredContact(admin).email;
        const regContent = {
          eyebrow: `Hi ${admin.fullName},`,
          title: rendered.emailSubject,
          paragraphs: [rendered.text],
          primaryCta: { href: fullHref, label: "Open registration request" },
        };
        await sendResendEmail({
          apiKey: resendApiKey,
          from: fromEmail,
          to: adminInbox,
          subject: `${rendered.emailSubject} · ${getPortalNameForEmail()}`,
          html: transactionalEmailHtml(regContent),
          text: transactionalEmailPlainText(regContent),
        });
      }),
    );
  }

  await Promise.all(
    admins.map(async (admin) => {
      const pref = admin.notificationPreference ?? defaultNotificationPreferences();
      if (!adminRegistrationEventEnabled(pref, input.event) || !pref.webPushEnabled) return;

      await sendPushNotifications({
        subscriptions: admin.pushSubscriptions,
        title: rendered.title,
        body: rendered.text,
        url: href,
      });
    }),
  );
}
