/**
 * Calendar semantics for availability windows match deployment timezone
 * (see deployment.config - DEPLOYMENT_TIMEZONE / DEPLOYMENT_REGION).
 */

import { getDeploymentTimezone } from "@/deployment.config";

/** YYYY-MM-DD for `d` interpreted in the deployment IANA timezone. */
export function formatDateAsDeploymentCalendarDay(d: Date): string {
  const tz = getDeploymentTimezone();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${day}`;
}

/** Today's calendar date (YYYY-MM-DD) in the deployment timezone. */
export function deploymentCalendarDateToday(): string {
  return formatDateAsDeploymentCalendarDay(new Date());
}

/** Order by start date ascending, then end date. All stored windows are shown on profile/dashboard. */
export function sortAvailabilityEntriesAscending<T extends { startDate: Date; endDate: Date }>(
  entries: T[],
): T[] {
  return [...entries].sort((a, b) => {
    const byStart = a.startDate.getTime() - b.startDate.getTime();
    return byStart !== 0 ? byStart : a.endDate.getTime() - b.endDate.getTime();
  });
}
