import {
  ADP_ANALYTICS_OPT_OUT_COOKIE,
  LEGACY_ANALYTICS_OPT_OUT_COOKIE,
} from "@/lib/analytics-opt-out-cookies";

/**
 * Client-only: detect opt-out cookie(s) set by `/privacy/opt-out` (read by provider + privacy UI).
 */
export function hasAnalyticsOptOutCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((part) => {
    const t = part.trim();
    const eq = t.indexOf("=");
    if (eq < 0) return false;
    const name = t.slice(0, eq).trim();
    const value = t.slice(eq + 1).trim();
    if (value !== "1") return false;
    return name === ADP_ANALYTICS_OPT_OUT_COOKIE || name === LEGACY_ANALYTICS_OPT_OUT_COOKIE;
  });
}
