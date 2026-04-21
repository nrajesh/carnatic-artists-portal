"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState, useSyncExternalStore } from "react";
import { hasAnalyticsOptOutCookie } from "@/lib/analytics-opt-out-cookie";
import { subscribeDocumentConsentSignals } from "@/lib/analytics-consent-subscribe";

const STORAGE_KEY = "privacy_notice_banner_v1_ack";

function shouldShowPrivacyBanner(): boolean {
  try {
    if (typeof window === "undefined") return false;
    if (window.localStorage.getItem(STORAGE_KEY) === "1") return false;
    if (hasAnalyticsOptOutCookie()) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * First-visit privacy notice with one-click analytics opt-out (via /privacy/opt-out).
 */
function PrivacyNoticeBannerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const getSnapshot = useCallback(() => {
    void pathname;
    void searchParams.toString();
    return shouldShowPrivacyBanner();
  }, [pathname, searchParams]);

  const allowShow = useSyncExternalStore(
    subscribeDocumentConsentSignals,
    getSnapshot,
    () => false,
  );
  const [dismissed, setDismissed] = useState(false);

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }, []);

  if (dismissed || !allowShow) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-amber-300/90 bg-amber-50/95 px-4 py-3 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] backdrop-blur-sm supports-[padding:max(0px)]:pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      role="region"
      aria-label="Privacy and analytics notice"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <p className="text-sm leading-relaxed text-stone-800">
          We use privacy-conscious analytics (PostHog) to improve this site. You can turn off tracking anytime; see our{" "}
          <Link href="/privacy" className="font-medium text-amber-900 underline-offset-2 hover:underline">
            Privacy
          </Link>{" "}
          page for details.
        </p>
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          <Link
            href="/privacy/opt-out"
            className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-amber-900 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-950"
          >
            Turn off analytics
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

export function PrivacyNoticeBanner() {
  return (
    <Suspense fallback={null}>
      <PrivacyNoticeBannerInner />
    </Suspense>
  );
}
