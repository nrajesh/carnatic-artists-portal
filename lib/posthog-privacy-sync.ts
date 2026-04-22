import { posthog } from "@/lib/analytics-client";
import { hasBrowserAnalyticsOptOut } from "@/lib/analytics-privacy-signals";

/**
 * Align PostHog capture with the browser (opt-out cookie + DNT / GPC).
 * Safe to call after `initPostHog()`; no-ops until the SDK is loaded.
 */
export function syncPosthogPrivacySignals(): void {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim()) return;
  const ph = posthog as typeof posthog & { __loaded?: boolean };
  if (!ph.__loaded) return;

  const shouldOptOut = hasBrowserAnalyticsOptOut();
  if (shouldOptOut) {
    ph.opt_out_capturing();
  } else if (typeof ph.has_opted_out_capturing === "function" && ph.has_opted_out_capturing()) {
    ph.opt_in_capturing({ captureEventName: false });
  }
}
