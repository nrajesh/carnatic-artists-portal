/**
 * First-party analytics opt-out cookies (non-HttpOnly) for UI + PostHogProvider.
 * `ph_opt_out` is legacy - prefer `adp_analytics_opt_out` to avoid clashing with PostHog's `ph_*` namespace.
 */
export const ADP_ANALYTICS_OPT_OUT_COOKIE = "adp_analytics_opt_out";
export const LEGACY_ANALYTICS_OPT_OUT_COOKIE = "ph_opt_out";

type CookieGetter = { get(name: string): { value: string } | undefined };

export function hasAnalyticsOptOutCookieFromStore(store: CookieGetter): boolean {
  return (
    store.get(ADP_ANALYTICS_OPT_OUT_COOKIE)?.value === "1" ||
    store.get(LEGACY_ANALYTICS_OPT_OUT_COOKIE)?.value === "1"
  );
}
