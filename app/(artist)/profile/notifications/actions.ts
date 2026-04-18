"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/session-jwt";
import { getDb } from "@/lib/db";

function checked(formData: FormData, name: string): boolean {
  return formData.get(name) === "on";
}

export async function updateNotificationPreferencesAction(formData: FormData): Promise<void> {
  const token = (await cookies()).get("session")?.value ?? null;
  const session = token ? await verifySession(token) : null;
  if (!session) throw new Error("UNAUTHENTICATED");

  await getDb().notificationPreference.upsert({
    where: { artistId: session.artistId },
    create: {
      artistId: session.artistId,
      inAppEnabled: checked(formData, "inAppEnabled"),
      emailEnabled: checked(formData, "emailEnabled"),
      webPushEnabled: checked(formData, "webPushEnabled"),
      reviewAddedEnabled: checked(formData, "reviewAddedEnabled"),
      reviewUpdatedEnabled: checked(formData, "reviewUpdatedEnabled"),
      reviewDeletedEnabled: checked(formData, "reviewDeletedEnabled"),
      newRegistrationEnabled: checked(formData, "newRegistrationEnabled"),
      registrationApprovedEnabled: checked(formData, "registrationApprovedEnabled"),
      registrationRejectedEnabled: checked(formData, "registrationRejectedEnabled"),
    },
    update: {
      inAppEnabled: checked(formData, "inAppEnabled"),
      emailEnabled: checked(formData, "emailEnabled"),
      webPushEnabled: checked(formData, "webPushEnabled"),
      reviewAddedEnabled: checked(formData, "reviewAddedEnabled"),
      reviewUpdatedEnabled: checked(formData, "reviewUpdatedEnabled"),
      reviewDeletedEnabled: checked(formData, "reviewDeletedEnabled"),
      newRegistrationEnabled: checked(formData, "newRegistrationEnabled"),
      registrationApprovedEnabled: checked(formData, "registrationApprovedEnabled"),
      registrationRejectedEnabled: checked(formData, "registrationRejectedEnabled"),
    },
  });

  revalidatePath("/profile/notifications");
  revalidatePath("/dashboard");
}
