import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/session-jwt";
import { getDb } from "@/lib/db";
import { updateNotificationPreferencesAction } from "./actions";
import { PushPreferences } from "./push-preferences";

export default async function NotificationSettingsPage() {
  const token = (await cookies()).get("session")?.value ?? null;
  const session = token ? await verifySession(token) : null;
  if (!session) redirect("/auth/login");

  const pref =
    (await getDb().notificationPreference.findUnique({
      where: { artistId: session.artistId },
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
    })) ?? {
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

  return (
    <main className="min-h-screen bg-amber-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <Link href="/dashboard" className="mb-2 inline-block text-sm text-amber-700 hover:text-amber-900">
            ← Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-stone-800">Notification Preferences</h1>
          <p className="mt-1 text-sm text-stone-500">Choose how and when you want to be notified.</p>
        </div>

        <form action={updateNotificationPreferencesAction} className="space-y-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-semibold text-stone-700">Channels</legend>
            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input type="checkbox" name="inAppEnabled" defaultChecked={pref.inAppEnabled} className="accent-amber-700" />
              In-app notifications (dashboard feed)
            </label>
            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input type="checkbox" name="emailEnabled" defaultChecked={pref.emailEnabled} className="accent-amber-700" />
              Email notifications
            </label>
            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input type="checkbox" name="webPushEnabled" defaultChecked={pref.webPushEnabled} className="accent-amber-700" />
              Browser push notifications
            </label>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-semibold text-stone-700">Review events</legend>
            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input type="checkbox" name="reviewAddedEnabled" defaultChecked={pref.reviewAddedEnabled} className="accent-amber-700" />
              When a review is added
            </label>
            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input type="checkbox" name="reviewUpdatedEnabled" defaultChecked={pref.reviewUpdatedEnabled} className="accent-amber-700" />
              When a review is edited
            </label>
            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input type="checkbox" name="reviewDeletedEnabled" defaultChecked={pref.reviewDeletedEnabled} className="accent-amber-700" />
              When a review is deleted
            </label>
          </fieldset>

          {session.role === "admin" && (
            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-semibold text-stone-700">Admin registration events</legend>
              <label className="flex items-center gap-2 text-sm text-stone-700">
                <input type="checkbox" name="newRegistrationEnabled" defaultChecked={pref.newRegistrationEnabled} className="accent-amber-700" />
                When a new registration is submitted
              </label>
              <label className="flex items-center gap-2 text-sm text-stone-700">
                <input type="checkbox" name="registrationApprovedEnabled" defaultChecked={pref.registrationApprovedEnabled} className="accent-amber-700" />
                When a registration is approved
              </label>
              <label className="flex items-center gap-2 text-sm text-stone-700">
                <input type="checkbox" name="registrationRejectedEnabled" defaultChecked={pref.registrationRejectedEnabled} className="accent-amber-700" />
                When a registration is rejected
              </label>
            </fieldset>
          )}

          <button
            type="submit"
            className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-800"
          >
            Save preferences
          </button>
        </form>

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
