/**
 * Client-only: detect PostHog opt-out cookie set by `/privacy/opt-out` and read by `PostHogProvider`.
 */
export function hasAnalyticsOptOutCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((c) => c.trim().startsWith("ph_opt_out=1"));
}
