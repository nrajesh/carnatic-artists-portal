"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePostHog } from "posthog-js/react";
import { SiteBrandMark } from "@/components/site-brand-mark";
import { showError, showSuccess } from "@/lib/toast";
import type { InviteShareOption } from "@/lib/artist-invites";

type InviteCardConfig = {
  artistName: string;
  portalName: string;
  options: InviteShareOption[];
  nudgeHref: string;
};

type ArtistProfileShareButtonProps = {
  /** Fully qualified profile URL when possible; otherwise path starting with / */
  profileUrl: string;
  shareTitle: string;
  shareText: string;
  className?: string;
  inviteCardConfig?: InviteCardConfig;
  variant?: "hero" | "solid" | "outline";
};

type ShareResult = "cancelled" | "native" | "copied" | "manual";
type SharePayload = {
  title: string;
  text: string;
  url: string;
  bodyOverride?: string;
};

function resolveUrlForShare(profileUrl: string): string {
  if (profileUrl.startsWith("http://") || profileUrl.startsWith("https://")) {
    return profileUrl;
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}${profileUrl.startsWith("/") ? profileUrl : `/${profileUrl}`}`;
  }
  return profileUrl;
}

async function shareUrlWithFallback({
  title,
  text,
  url,
  bodyOverride,
}: SharePayload): Promise<ShareResult> {
  const shareBody = bodyOverride ?? text;

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({
        title,
        text: shareBody,
        ...(bodyOverride ? {} : { url }),
      });
      return "native";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "cancelled";
      }
    }
  }

  try {
    await navigator.clipboard.writeText(bodyOverride ?? url);
    return "copied";
  } catch {
    window.prompt(bodyOverride ? "Copy this invite:" : "Copy this link:", bodyOverride ?? url);
    return "manual";
  }
}

export function ArtistProfileShareButton({
  profileUrl,
  shareTitle,
  shareText,
  className = "",
  inviteCardConfig,
  variant = "hero",
}: ArtistProfileShareButtonProps) {
  const posthog = usePostHog();
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [selectedLinkUrl, setSelectedLinkUrl] = useState<string | null>(
    inviteCardConfig?.options[0]?.url ?? null,
  );

  const selectedLink = useMemo(
    () => inviteCardConfig?.options.find((option) => option.url === selectedLinkUrl) ?? null,
    [inviteCardConfig?.options, selectedLinkUrl],
  );

  useEffect(() => {
    if (!dialogOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDialogOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dialogOpen]);

  const resolvedSelectedLink = useMemo(
    () => selectedLink ?? inviteCardConfig?.options[0] ?? null,
    [inviteCardConfig?.options, selectedLink],
  );

  const setFeedbackStatus = useCallback((next: "copied" | "error") => {
    setStatus(next);
    window.setTimeout(() => setStatus("idle"), next === "copied" ? 2500 : 3000);
  }, []);

  const shareProfileOnly = useCallback(async () => {
    const url = resolveUrlForShare(profileUrl);
    const outcome = await shareUrlWithFallback({
      url,
      title: shareTitle,
      text: shareText,
    });
    if (outcome === "cancelled") return;

    if (outcome === "native") {
      return;
    }

    setFeedbackStatus(outcome === "copied" ? "copied" : "error");
    if (outcome === "copied") {
      showSuccess("Profile link copied.");
    } else {
      showSuccess("Profile link ready to copy.");
    }
  }, [profileUrl, setFeedbackStatus, shareText, shareTitle]);

  const openInviteFlow = useCallback(() => {
    setDialogOpen(true);
    if (!inviteCardConfig) return;
    const eventProps = {
      saved_link_count: inviteCardConfig.options.length,
      has_saved_links: inviteCardConfig.options.length > 0,
    };
    posthog.capture("invite_share_workflow_opened", eventProps);
    if (inviteCardConfig.options.length === 0) {
      posthog.capture("invite_share_nudge_shown", eventProps);
    }
  }, [inviteCardConfig, posthog]);

  const onPrimaryButtonClick = useCallback(async () => {
    if (!inviteCardConfig) {
      await shareProfileOnly();
      return;
    }

    openInviteFlow();
  }, [inviteCardConfig, openInviteFlow, shareProfileOnly]);

  const createAndShareInvite = useCallback(async () => {
    if (!inviteCardConfig || !resolvedSelectedLink) {
      showError("Choose one of your saved profile links first.");
      return;
    }

    setIsCreatingInvite(true);
    try {
      const response = await fetch("/api/invites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selectedLinkType: resolvedSelectedLink.type,
          selectedLinkUrl: resolvedSelectedLink.url,
        }),
      });
      const body = (await response.json()) as
        | {
            success: true;
            inviteUrl: string;
            invite: { token: string };
          }
        | {
            success?: false;
            message?: string;
          };

      if (!response.ok || !body || body.success !== true) {
        throw new Error(
          "message" in (body ?? {}) && typeof body.message === "string"
            ? body.message
            : "Could not create invite link.",
        );
      }

      const inviteShareTitle = `${inviteCardConfig.artistName} invited you to ${inviteCardConfig.portalName}`;
      const inviteShareText =
        "Join me on Find Artists - a professional network for all artists";
      const outcome = await shareUrlWithFallback({
        url: body.inviteUrl,
        title: inviteShareTitle,
        text: inviteShareText,
        bodyOverride: `${body.inviteUrl}\n\n${inviteShareText}`,
      });
      if (outcome === "cancelled") return;

      const eventProps = {
        featured_link_type: resolvedSelectedLink.type,
        featured_link_label: resolvedSelectedLink.label,
        share_method: outcome,
      };

      posthog.capture("invite_shared", eventProps);
      setDialogOpen(false);

      if (outcome === "native") return;

      setFeedbackStatus(outcome === "copied" ? "copied" : "error");
      if (outcome === "copied") {
        showSuccess("Invite link copied.");
      } else {
        showSuccess("Invite link ready to copy.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create invite link.";
      posthog.capture("invite_share_failed", {
        featured_link_type: resolvedSelectedLink.type,
        featured_link_label: resolvedSelectedLink.label,
        reason: message,
      });
      showError(message);
    } finally {
      setIsCreatingInvite(false);
    }
  }, [inviteCardConfig, posthog, resolvedSelectedLink, setFeedbackStatus]);

  const label =
    status === "copied" ? "Link copied" : status === "error" ? "Copy manually" : "Share";

  const buttonStyle =
    variant === "solid"
      ? "border-amber-700 bg-amber-700 hover:bg-amber-800 text-white font-semibold active:scale-[0.98]"
      : variant === "outline"
        ? "border-stone-300 bg-white hover:bg-stone-50 text-stone-700 font-semibold active:scale-[0.98]"
        : "border-white/40 bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm font-semibold active:scale-[0.98]";

  return (
    <>
      <button
        type="button"
        onClick={onPrimaryButtonClick}
        className={[
          "inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
          variant === "hero" ? "focus-visible:outline-white" : "focus-visible:outline-amber-700",
          "min-h-[44px] min-w-[44px] touch-manipulation overflow-visible shadow-sm",
          buttonStyle,
          className,
        ].join(" ")}
        aria-label={`Share ${shareTitle}`}
      >
        <svg
          className="h-5 w-5 shrink-0 opacity-95"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="10.49" x2="15.41" y2="6.51" />
          <line x1="8.59" y1="13.51" x2="15.41" y2="17.49" />
        </svg>
        <span>{label}</span>
      </button>

      {dialogOpen && inviteCardConfig ? (
        <div className="fixed inset-0 z-[210] flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label="Close share dialog"
            onClick={() => !isCreatingInvite && setDialogOpen(false)}
          />
          <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-[2rem] border border-stone-200 bg-[#fff7e8] shadow-2xl shadow-black/20 max-h-[90vh] sm:max-h-[85vh] flex flex-col">
            <div className="border-b border-amber-200 bg-white/85 px-5 py-4 sm:px-6 shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-700">
                    Invite share
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-stone-900">
                    Share a cleaner invite card
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  disabled={isCreatingInvite}
                  className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-50"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {inviteCardConfig.options.length === 0 ? (
                <div className="grid gap-5 px-5 py-6 sm:px-6 sm:py-7">
                  <div className="rounded-[1.75rem] border border-amber-200 bg-white p-5 shadow-sm">
                    <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-900">
                      <SiteBrandMark className="h-4 w-4" />
                      Add one link first
                    </div>
                    <p className="mt-4 text-base font-semibold text-stone-900">
                      Invite cards work best when they feature one of your socials or websites.
                    </p>
                    <p className="mt-2 text-sm leading-6 text-stone-600">
                      Add an Instagram, YouTube, website, or other profile link and we&rsquo;ll use
                      it to turn this share into a branded intro for new artists.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Link
                      href={inviteCardConfig.nudgeHref}
                      onClick={() => {
                        posthog.capture("invite_share_add_link_clicked");
                        setDialogOpen(false);
                      }}
                      className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-2xl bg-amber-800 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-900"
                    >
                      Add a link
                    </Link>
                    <button
                      type="button"
                      onClick={async () => {
                        posthog.capture("invite_share_profile_only_clicked");
                        setDialogOpen(false);
                        await shareProfileOnly();
                      }}
                      className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-2xl border border-stone-200 bg-white px-5 py-3 text-sm font-medium text-stone-700 hover:bg-stone-50"
                    >
                      Share profile only
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-6 px-5 py-6 sm:px-6 sm:py-7 lg:grid-cols-[1.08fr_0.92fr]">
                  <div className="rounded-[1.75rem] border border-amber-200 bg-white p-5 shadow-sm">
                    <div className="inline-flex items-center gap-2 rounded-full bg-stone-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-stone-100">
                      <SiteBrandMark className="h-4 w-4" />
                      Invite card preview
                    </div>
                    <div className="mt-5 rounded-[1.75rem] bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.22),_transparent_46%),linear-gradient(160deg,_#fff6dd,_#ffffff)] p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-700">
                        Shared by {inviteCardConfig.artistName}
                      </p>
                      <h3 className="mt-2 font-display text-3xl font-bold tracking-tight text-stone-900">
                        Join {inviteCardConfig.portalName}
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-stone-600">
                        Lead with one of your real links so the share feels like an artist intro, not
                        just a raw profile URL.
                      </p>
                      {resolvedSelectedLink ? (
                        <div className="mt-5 rounded-2xl border border-amber-200 bg-white/90 px-4 py-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-700">
                            Featured link
                          </p>
                          <p className="mt-2 text-xl font-semibold tracking-tight text-stone-900">
                            {resolvedSelectedLink.label}
                          </p>
                          <p className="mt-1 text-sm text-stone-500">
                            {resolvedSelectedLink.host ?? resolvedSelectedLink.url}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-stone-900">
                      Choose one saved profile link to feature
                    </p>
                    <p className="mt-2 text-sm leading-6 text-stone-600">
                      We&rsquo;ll create a shareable invite page that carries your link, your profile
                      context, and the portal branding through to sign-up.
                    </p>

                    <div className="mt-4 space-y-3">
                      {inviteCardConfig.options.map((option) => {
                        const checked = option.url === resolvedSelectedLink?.url;
                        return (
                          <label
                            key={`${option.type}-${option.url}`}
                            className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition-colors ${
                              checked
                                ? "border-amber-400 bg-amber-50 shadow-sm"
                                : "border-stone-200 bg-white hover:border-stone-300"
                            }`}
                          >
                            <input
                              type="radio"
                              name="invite-featured-link"
                              checked={checked}
                              onChange={() => {
                                setSelectedLinkUrl(option.url);
                                posthog.capture("invite_share_link_selected", {
                                  featured_link_type: option.type,
                                  featured_link_label: option.label,
                                });
                              }}
                              className="mt-1 h-4 w-4 accent-amber-700"
                            />
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold text-stone-900">
                                {option.label}
                              </span>
                              <span className="mt-1 block truncate text-sm text-stone-500">
                                {option.host ?? option.url}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>

                    <div className="mt-5 rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
                      Invitees will see a note that they can choose whether to auto-connect with you
                      after approval or decide later.
                    </div>

                    <button
                      type="button"
                      onClick={createAndShareInvite}
                      disabled={!resolvedSelectedLink || isCreatingInvite}
                      className="mt-5 inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-amber-800 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-950/15 transition-colors hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isCreatingInvite ? "Creating invite…" : "Create invite and share"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
