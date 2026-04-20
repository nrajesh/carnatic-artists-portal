import {
  ADP_ANALYTICS_OPT_OUT_COOKIE,
  LEGACY_ANALYTICS_OPT_OUT_COOKIE,
} from "@/lib/analytics-opt-out-cookies";

/**
 * Client-only: detect opt-out cookie(s) set by `/privacy/opt-out` (read by provider + privacy UI).
 */
export function hasAnalyticsOptOutCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((c) => {
    const t = c.trim();
    return (
      t.startsWith(`${ADP_ANALYTICS_OPT_OUT_COOKIE}=1`) ||
      t.startsWith(`${LEGACY_ANALYTICS_OPT_OUT_COOKIE}=1`)
    );
  });
}
