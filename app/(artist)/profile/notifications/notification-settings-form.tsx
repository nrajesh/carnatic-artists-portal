"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";
import { StickyFormActions } from "@/components/sticky-form-actions";
import { showError, showSuccess } from "@/lib/toast";
import { updateNotificationPreferencesAction } from "./actions";

type NotificationPreferenceView = {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  webPushEnabled: boolean;
  connectionRequestsAllowed: boolean;
  connectionRequestEnabled: boolean;
  connectionApprovedEnabled: boolean;
  reviewAddedEnabled: boolean;
  reviewUpdatedEnabled: boolean;
  reviewDeletedEnabled: boolean;
  newRegistrationEnabled: boolean;
  registrationApprovedEnabled: boolean;
  registrationRejectedEnabled: boolean;
};

export function NotificationSettingsForm({
  pref,
  collabsRatingsEnabled,
  artistConnectionsEnabled,
  isAdmin,
}: {
  pref: NotificationPreferenceView;
  collabsRatingsEnabled: boolean;
  artistConnectionsEnabled: boolean;
  isAdmin: boolean;
}) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = formRef.current;
    if (!form) return;

    startTransition(async () => {
      const result = await updateNotificationPreferencesAction(new FormData(form));
      if (!result.ok) {
        showError(result.error);
        return;
      }

      showSuccess("Notification preferences saved.");
      router.refresh();
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
    >
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-semibold text-stone-700">Channels</legend>
        <label className="flex items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            name="inAppEnabled"
            defaultChecked={pref.inAppEnabled}
            className="accent-amber-700"
          />
          In-app notifications (dashboard feed)
        </label>
        <label className="flex items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            name="emailEnabled"
            defaultChecked={pref.emailEnabled}
            className="accent-amber-700"
          />
          Email notifications
        </label>
        <label className="flex items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            name="webPushEnabled"
            defaultChecked={pref.webPushEnabled}
            className="accent-amber-700"
          />
          Browser push notifications
        </label>
      </fieldset>

      {artistConnectionsEnabled ? (
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold text-stone-700">Connections</legend>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              name="connectionRequestsAllowed"
              defaultChecked={pref.connectionRequestsAllowed}
              className="accent-amber-700"
            />
            Allow new connection requests
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              name="connectionRequestEnabled"
              defaultChecked={pref.connectionRequestEnabled}
              className="accent-amber-700"
            />
            Notify me when I receive a connection request
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              name="connectionApprovedEnabled"
              defaultChecked={pref.connectionApprovedEnabled}
              className="accent-amber-700"
            />
            Notify me when someone approves my request
          </label>
        </fieldset>
      ) : null}

      {collabsRatingsEnabled ? (
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold text-stone-700">Review events</legend>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              name="reviewAddedEnabled"
              defaultChecked={pref.reviewAddedEnabled}
              className="accent-amber-700"
            />
            When a review is added
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              name="reviewUpdatedEnabled"
              defaultChecked={pref.reviewUpdatedEnabled}
              className="accent-amber-700"
            />
            When a review is edited
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              name="reviewDeletedEnabled"
              defaultChecked={pref.reviewDeletedEnabled}
              className="accent-amber-700"
            />
            When a review is deleted
          </label>
        </fieldset>
      ) : null}

      {isAdmin ? (
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold text-stone-700">
            Admin registration events
          </legend>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              name="newRegistrationEnabled"
              defaultChecked={pref.newRegistrationEnabled}
              className="accent-amber-700"
            />
            When a new registration is submitted
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              name="registrationApprovedEnabled"
              defaultChecked={pref.registrationApprovedEnabled}
              className="accent-amber-700"
            />
            When a registration is approved
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              name="registrationRejectedEnabled"
              defaultChecked={pref.registrationRejectedEnabled}
              className="accent-amber-700"
            />
            When a registration is rejected
          </label>
        </fieldset>
      ) : null}

      <StickyFormActions>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={isPending}
            className="min-h-[44px] flex-1 rounded-lg bg-amber-700 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save preferences"}
          </button>
          <Link
            href="/dashboard"
            className="flex min-h-[44px] items-center justify-center rounded-lg border border-stone-200 px-6 py-3 font-semibold text-stone-600 transition-colors hover:bg-stone-50 sm:px-8"
          >
            Cancel
          </Link>
        </div>
      </StickyFormActions>
    </form>
  );
}
