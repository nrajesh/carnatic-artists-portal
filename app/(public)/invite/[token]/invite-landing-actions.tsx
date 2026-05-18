"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { usePostHog } from "posthog-js/react";
import { requestConnectionAction } from "@/app/(artist)/connections/actions";

type InviteLandingActionsProps = {
  registerHref: string;
  profileHref: string;
  featuredLinkUrl: string;
  inviterName: string;
  inviterSlug: string;
  selectedLinkLabel: string;
  selectedLinkType: string;
  isLoggedIn?: boolean;
  isOwnProfile?: boolean;
  artistConnectionsEnabled?: boolean;
  targetAcceptsRequests?: boolean;
  connectionStatus?: "NONE" | "PENDING_OUTGOING" | "PENDING_INCOMING" | "APPROVED" | "REJECTED";
  inviterArtistId?: string;
};

export function InviteLandingActions({
  registerHref,
  profileHref,
  featuredLinkUrl,
  inviterName,
  inviterSlug,
  selectedLinkLabel,
  selectedLinkType,
  isLoggedIn = false,
  isOwnProfile = false,
  artistConnectionsEnabled = false,
  targetAcceptsRequests = true,
  connectionStatus = "NONE",
  inviterArtistId,
}: InviteLandingActionsProps) {
  const posthog = usePostHog();
  const eventProps = useMemo(
    () =>
      ({
        inviter_slug: inviterSlug,
        featured_link_type: selectedLinkType,
        featured_link_label: selectedLinkLabel,
      }) as const,
    [inviterSlug, selectedLinkLabel, selectedLinkType],
  );

  useEffect(() => {
    posthog.capture("invite_landing_viewed", eventProps);
  }, [eventProps, posthog]);

  return (
    <div className="space-y-3">
      {isLoggedIn ? (
        <div className="w-full">
          {isOwnProfile && (
            <button
              type="button"
              disabled
              aria-disabled="true"
              title="You cannot connect with yourself."
              className="inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl border border-stone-200 bg-stone-100 px-5 py-3 text-sm font-semibold text-stone-400 shadow-sm opacity-90 cursor-not-allowed"
            >
              Connect
            </button>
          )}
          {artistConnectionsEnabled &&
            !isOwnProfile &&
            !targetAcceptsRequests &&
            (connectionStatus === "NONE" || connectionStatus === "REJECTED") && (
              <button
                type="button"
                disabled
                className="inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl border border-stone-200 bg-stone-100 px-5 py-3 text-sm font-semibold text-stone-500 opacity-80 cursor-not-allowed"
                title="This artist is not accepting connection requests right now."
              >
                Connect
              </button>
            )}
          {artistConnectionsEnabled &&
            !isOwnProfile &&
            targetAcceptsRequests &&
            (connectionStatus === "NONE" || connectionStatus === "REJECTED") && (
              <form action={requestConnectionAction} className="w-full">
                <input type="hidden" name="recipientId" value={inviterArtistId} />
                <button
                  type="submit"
                  onClick={() => posthog.capture("invite_connect_clicked", eventProps)}
                  className="inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl border border-emerald-500 bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-950/15 transition-colors hover:border-emerald-600 hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                >
                  Connect
                </button>
              </form>
            )}
          {artistConnectionsEnabled &&
            !isOwnProfile &&
            connectionStatus === "PENDING_OUTGOING" && (
              <span className="inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl border border-stone-200 bg-stone-100 px-5 py-3 text-sm font-semibold text-stone-400 shadow-sm opacity-90 cursor-not-allowed">
                Pending
              </span>
            )}
          {artistConnectionsEnabled &&
            !isOwnProfile &&
            connectionStatus === "PENDING_INCOMING" && (
              <span className="inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl border border-stone-200 bg-stone-100 px-5 py-3 text-sm font-semibold text-stone-400 shadow-sm opacity-90 cursor-not-allowed">
                Pending
              </span>
            )}
          {artistConnectionsEnabled && !isOwnProfile && connectionStatus === "APPROVED" && (
            <span className="inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl border border-green-200 bg-green-50 px-5 py-3 text-sm font-semibold text-green-700 shadow-sm">
              Connected
            </span>
          )}
        </div>
      ) : (
        <Link
          href={registerHref}
          onClick={() => posthog.capture("invite_register_cta_clicked", eventProps)}
          className="inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-amber-800 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-950/15 transition-colors hover:bg-amber-900"
        >
          Start your registration
        </Link>
      )}

      <a
        href={featuredLinkUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => posthog.capture("invite_featured_link_clicked", eventProps)}
        className="inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl border border-amber-300 bg-white px-5 py-3 text-sm font-semibold text-amber-900 transition-colors hover:border-amber-400 hover:bg-amber-50"
      >
        Open {inviterName}&rsquo;s featured {selectedLinkLabel}
      </a>

      <Link
        href={profileHref}
        onClick={() => posthog.capture("invite_profile_view_clicked", eventProps)}
        className="inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl border border-stone-200 bg-white/80 px-5 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-white"
      >
        View {inviterName}&rsquo;s profile
      </Link>
    </div>
  );
}
