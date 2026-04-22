"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { initPostHog } from "@/lib/analytics-client";
import { syncPosthogPrivacySignals } from "@/lib/posthog-privacy-sync";

/**
 * Re-run privacy sync whenever the URL changes (including query-only changes such as
 * stripping `?ph_identify=1` after `PostHogIdentify`). Mount-time sync alone misses that
 * because the layout `PostHogProvider` effect runs only once per full load.
 */
export function PosthogRoutePrivacySync(): null {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    initPostHog();
    syncPosthogPrivacySignals();
  }, [pathname, searchParams]);

  return null;
}
