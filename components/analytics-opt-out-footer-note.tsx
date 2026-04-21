"use client";

import { Suspense, useCallback, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { hasAnalyticsOptOutCookie } from "@/lib/analytics-opt-out-cookie";
import { subscribeDocumentConsentSignals } from "@/lib/analytics-consent-subscribe";

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

  if (!optedOut) return null;

  return (
    <p
      className="mx-auto mt-4 max-w-xl rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-center text-sm font-medium text-green-900"
      role="status"
    >
      You have opted out of analytics and session replay for this browser on this site.
    </p>
  );
}

export function AnalyticsOptOutFooterNote() {
  return (
    <Suspense fallback={null}>
      <AnalyticsOptOutFooterNoteInner />
    </Suspense>
  );
}
