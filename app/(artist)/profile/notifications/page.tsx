import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/session-jwt";
import { getDb } from "@/lib/db";
import { PushPreferences } from "./push-preferences";
import { isArtistCollabsRatingsEnabledServer } from "@/lib/feature-flags-server";
import { canUseArtistConnections } from "@/lib/artist-connections";
import { NotificationSettingsForm } from "./notification-settings-form";

export default async function NotificationSettingsPage() {
  const token = (await cookies()).get("session")?.value ?? null;
  const session = token ? await verifySession(token) : null;
  if (!session) redirect("/auth/login");

  const [collabsRatingsEnabled, artistConnectionsEnabled] = await Promise.all([
    isArtistCollabsRatingsEnabledServer({
      distinctId: session.artistId,
    }),
    canUseArtistConnections({ distinctId: session.artistId }),
  ]);

  const pref = (await getDb().notificationPreference.findUnique({
    where: { artistId: session.artistId },
    select: {
      inAppEnabled: true,
      emailEnabled: true,
      webPushEnabled: true,
      connectionRequestsAllowed: true,
      connectionRequestEnabled: true,
      connectionApprovedEnabled: true,
      reviewAddedEnabled: true,
      reviewUpdatedEnabled: true,
      reviewDeletedEnabled: true,
      newRegistrationEnabled: true,
      registrationApprovedEnabled: true,
      registrationRejectedEnabled: true,
    },
  })) ?? {
    inAppEnabled: true,
    emailEnabled: true,
    webPushEnabled: false,
    connectionRequestsAllowed: true,
    connectionRequestEnabled: true,
    connectionApprovedEnabled: true,
    reviewAddedEnabled: true,
    reviewUpdatedEnabled: true,
    reviewDeletedEnabled: true,
    newRegistrationEnabled: true,
    registrationApprovedEnabled: true,
    registrationRejectedEnabled: true,
  };

  return (
    <main className="min-h-screen bg-amber-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="mb-2 inline-block text-sm text-amber-700 hover:text-amber-900"
          >
            ← Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-stone-800">Notification Preferences</h1>
          <p className="mt-1 text-sm text-stone-500">
            Choose how and when you want to be notified.
          </p>
        </div>

        <NotificationSettingsForm
          pref={pref}
          collabsRatingsEnabled={collabsRatingsEnabled}
          artistConnectionsEnabled={artistConnectionsEnabled}
          isAdmin={session.role === "admin"}
        />

        <div className="mt-5">
          <PushPreferences
            vapidPublicKey={process.env.VAPID_PUBLIC_KEY ?? ""}
            defaultEnabled={pref.webPushEnabled}
          />
        </div>
      </div>
    </main>
  );
}
