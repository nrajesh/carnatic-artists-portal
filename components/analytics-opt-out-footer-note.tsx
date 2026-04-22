"use client";

import { Suspense, useCallback, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { hasAnalyticsOptOutCookie } from "@/lib/analytics-opt-out-cookie";
import { subscribeDocumentConsentSignals } from "@/lib/analytics-consent-subscribe";
import {
  hasNavigatorAnalyticsDnt,
  hasNavigatorGlobalPrivacyControl,
} from "@/lib/analytics-privacy-signals";

/**
 * Green footer reminder when the analytics opt-out cookie is present.
 * Uses a real external-store subscription plus pathname/searchParams so we
 * re-read `document.cookie` after opt-in (same path `/privacy`, query changes).
 */
function AnalyticsOptOutFooterNoteInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const getSnapshot = useCallback(() => {
    void pathname;
    void searchParams.toString();
    return hasAnalyticsOptOutCookie();
  }, [pathname, searchParams]);

  const optedOut = useSyncExternalStore(
    subscribeDocumentConsentSignals,
    getSnapshot,
    () => false,
  );

  const browserLimitsAnalytics =
    !optedOut &&
    (hasNavigatorAnalyticsDnt() || hasNavigatorGlobalPrivacyControl());

  if (!optedOut && !browserLimitsAnalytics) return null;

  return (
    <div className="mx-auto mt-4 max-w-xl space-y-2 text-center">
      {optedOut ? (
        <p
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-medium text-green-900"
          role="status"
        >
          You have opted out of analytics and session replay for this browser on this site (opt-out
          cookie is set).
        </p>
      ) : null}
      {browserLimitsAnalytics ? (
        <p
          className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-medium text-sky-950"
          role="status"
        >
          Your browser is sending a <strong>Do Not Track</strong> and/or{" "}
          <strong>Global Privacy Control</strong> signal, so analytics and session replay stay off for
          this site even without the opt-out cookie (common in private / incognito windows).
        </p>
      ) : null}
    </div>
  );
}

export function AnalyticsOptOutFooterNote() {
  return (
    <Suspense fallback={null}>
      <AnalyticsOptOutFooterNoteInner />
    </Suspense>
  );
}
