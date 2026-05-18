"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/session-jwt";
import { getDb } from "@/lib/db";
import { isArtistCollabsRatingsEnabledServer } from "@/lib/feature-flags-server";
import { canUseArtistConnections } from "@/lib/artist-connections";

function checked(formData: FormData, name: string): boolean {
  return formData.get(name) === "on";
}

export async function updateNotificationPreferencesAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const token = (await cookies()).get("session")?.value ?? null;
  const session = token ? await verifySession(token) : null;
  if (!session) return { ok: false, error: "Please sign in again." };

  const [collabsRatingsEnabled, artistConnectionsEnabled] = await Promise.all([
    isArtistCollabsRatingsEnabledServer({
      distinctId: session.artistId,
    }),
    canUseArtistConnections({ distinctId: session.artistId }),
  ]);

  const existing = await getDb().notificationPreference.findUnique({
    where: { artistId: session.artistId },
    select: {
      reviewAddedEnabled: true,
      reviewUpdatedEnabled: true,
      reviewDeletedEnabled: true,
      connectionRequestsAllowed: true,
      connectionRequestEnabled: true,
      connectionApprovedEnabled: true,
    },
  });

  const reviewAddedEnabled = collabsRatingsEnabled
    ? checked(formData, "reviewAddedEnabled")
    : (existing?.reviewAddedEnabled ?? true);
  const reviewUpdatedEnabled = collabsRatingsEnabled
    ? checked(formData, "reviewUpdatedEnabled")
    : (existing?.reviewUpdatedEnabled ?? true);
  const reviewDeletedEnabled = collabsRatingsEnabled
    ? checked(formData, "reviewDeletedEnabled")
    : (existing?.reviewDeletedEnabled ?? true);

  await getDb().notificationPreference.upsert({
    where: { artistId: session.artistId },
    create: {
      artistId: session.artistId,
      inAppEnabled: checked(formData, "inAppEnabled"),
      emailEnabled: checked(formData, "emailEnabled"),
      webPushEnabled: checked(formData, "webPushEnabled"),
      connectionRequestsAllowed: artistConnectionsEnabled
        ? checked(formData, "connectionRequestsAllowed")
        : (existing?.connectionRequestsAllowed ?? true),
      connectionRequestEnabled: artistConnectionsEnabled
        ? checked(formData, "connectionRequestEnabled")
        : (existing?.connectionRequestEnabled ?? true),
      connectionApprovedEnabled: artistConnectionsEnabled
        ? checked(formData, "connectionApprovedEnabled")
        : (existing?.connectionApprovedEnabled ?? true),
      reviewAddedEnabled,
      reviewUpdatedEnabled,
      reviewDeletedEnabled,
      newRegistrationEnabled: checked(formData, "newRegistrationEnabled"),
      registrationApprovedEnabled: checked(formData, "registrationApprovedEnabled"),
      registrationRejectedEnabled: checked(formData, "registrationRejectedEnabled"),
    },
    update: {
      inAppEnabled: checked(formData, "inAppEnabled"),
      emailEnabled: checked(formData, "emailEnabled"),
      webPushEnabled: checked(formData, "webPushEnabled"),
      connectionRequestsAllowed: artistConnectionsEnabled
        ? checked(formData, "connectionRequestsAllowed")
        : (existing?.connectionRequestsAllowed ?? true),
      connectionRequestEnabled: artistConnectionsEnabled
        ? checked(formData, "connectionRequestEnabled")
        : (existing?.connectionRequestEnabled ?? true),
      connectionApprovedEnabled: artistConnectionsEnabled
        ? checked(formData, "connectionApprovedEnabled")
        : (existing?.connectionApprovedEnabled ?? true),
      reviewAddedEnabled,
      reviewUpdatedEnabled,
      reviewDeletedEnabled,
      newRegistrationEnabled: checked(formData, "newRegistrationEnabled"),
      registrationApprovedEnabled: checked(formData, "registrationApprovedEnabled"),
      registrationRejectedEnabled: checked(formData, "registrationRejectedEnabled"),
    },
  });

  revalidatePath("/profile/notifications");
  revalidatePath("/dashboard");
  return { ok: true };
}
