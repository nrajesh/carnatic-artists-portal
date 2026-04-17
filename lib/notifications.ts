import webpush from "web-push";
import { getDb } from "@/lib/db";
import { Resend } from "resend";

export type ReviewNotificationEvent = "added" | "updated" | "deleted";

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

function eventEnabled(pref: {
  reviewAddedEnabled: boolean;
  reviewUpdatedEnabled: boolean;
  reviewDeletedEnabled: boolean;
}, action: ReviewNotificationEvent): boolean {
  if (action === "added") return pref.reviewAddedEnabled;
  if (action === "updated") return pref.reviewUpdatedEnabled;
  return pref.reviewDeletedEnabled;
}

function ensureWebPushConfigured(): boolean {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
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
  const reviewee = await db.artist.findUnique({
    where: { id: input.revieweeId },
    select: { id: true, email: true, slug: true, fullName: true },
  });
  if (!reviewee) return;

  const pref =
    (await db.notificationPreference.findUnique({
      where: { artistId: reviewee.id },
      select: {
        inAppEnabled: true,
        emailEnabled: true,
        webPushEnabled: true,
        reviewAddedEnabled: true,
        reviewUpdatedEnabled: true,
        reviewDeletedEnabled: true,
      },
    })) ?? {
      inAppEnabled: true,
      emailEnabled: true,
      webPushEnabled: false,
      reviewAddedEnabled: true,
      reviewUpdatedEnabled: true,
      reviewDeletedEnabled: true,
    };

  if (!eventEnabled(pref, input.action)) return;

  const message = buildReviewMessage(input);
  const href = `/artists/${reviewee.slug}#reviews`;

  if (pref.inAppEnabled) {
    await db.notification.create({
      data: {
        artistId: reviewee.id,
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
      const fromEmail = process.env.RESEND_FROM_EMAIL ?? "noreply@carnaticportal.nl";
      const profileUrl = `${normalizeAppUrl()}${href}`;
      const resend = new Resend(resendApiKey);
      await resend.emails.send({
        from: fromEmail,
        to: reviewee.email,
        subject: `Review ${input.action} on Carnatic Artist Portal`,
        html: `<p>Hi ${reviewee.fullName},</p>
<p>${message}</p>
<p><a href="${profileUrl}">View your reviews</a></p>`,
      });
    }
  }

  if (pref.webPushEnabled && ensureWebPushConfigured()) {
    const subscriptions = await db.pushSubscription.findMany({
      where: { artistId: reviewee.id },
      select: { endpoint: true, p256dh: true, auth: true },
    });
    const payload = JSON.stringify({
      title: "Review activity",
      body: message,
      url: href,
    });
    await Promise.all(
      subscriptions.map(async (sub) => {
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
}
