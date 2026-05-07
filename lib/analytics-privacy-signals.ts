import { hasAnalyticsOptOutCookie } from "@/lib/analytics-opt-out-cookie";

function ignoreBrowserPrivacySignalsInDev(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_POSTHOG_IGNORE_BROWSER_PRIVACY_SIGNALS_IN_DEV === "true"
  );
}

/**
 * Mirrors PostHog's DNT handling (see `posthog-js` ConsentManager._getDnt / isYesLike):
 * browsers may report "1", "yes", or legacy variants.
 */
function isDntYesLike(value: string | null | undefined): boolean {
  if (value == null || value === "") return false;
  const s = String(value).trim().toLowerCase();
  return s === "1" || s === "yes" || s === "true";
}

/** Client-only: true when the browser's DNT signal should disable analytics. */
export function hasNavigatorAnalyticsDnt(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { msDoNotTrack?: string };
  const w = typeof window !== "undefined" ? (window as unknown as { doNotTrack?: string }) : undefined;
  return [nav.doNotTrack, nav.msDoNotTrack, w?.doNotTrack].some(isDntYesLike);
}

/** Global Privacy Control (often paired with DNT-style behaviour). */
export function hasNavigatorGlobalPrivacyControl(): boolean {
  if (typeof navigator === "undefined") return false;
  return (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
}

/** Client-only navigator signals that disable analytics even without an opt-out cookie. */
export function hasNavigatorPrivacySignalOptOut(): boolean {
  if (ignoreBrowserPrivacySignalsInDev()) return false;
  return hasNavigatorAnalyticsDnt() || hasNavigatorGlobalPrivacyControl();
}

/** True when capture should be off (cookie OR browser privacy signals). Used by `PostHogProvider` only. */
export function hasBrowserAnalyticsOptOut(): boolean {
  return hasAnalyticsOptOutCookie() || hasNavigatorPrivacySignalOptOut();
}
