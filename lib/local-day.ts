import { getDeploymentTimezone } from "../deployment.config";

/**
 * Format `instant` as YYYY-MM-DD in the given IANA timezone (e.g. Europe/Amsterdam).
 */
export function formatDateInTimezone(instant: Date, timeZone: string): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(instant);
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}

/** Today's calendar date string (YYYY-MM-DD) in the deployment timezone. */
export function getLocalCalendarDateString(now: Date = new Date()): string {
  return formatDateInTimezone(now, getDeploymentTimezone());
}

/**
 * `Date` at UTC noon for the given calendar day - stable for Prisma `@db.Date` / Postgres `date`.
 */
export function calendarDateStringToDbDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map((x) => parseInt(x, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    throw new Error(`Invalid calendar date string: ${dateStr}`);
  }
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
}

/** Same as {@link getLocalCalendarDateString} then {@link calendarDateStringToDbDate}. */
export function getLocalCalendarDateForDb(now: Date = new Date()): Date {
  return calendarDateStringToDbDate(getLocalCalendarDateString(now));
}

/**
 * Ordinal day index for deterministic daily rotation (same calendar day in deployment TZ → same index).
 */
export function getLocalDayOrdinalForRotation(now: Date = new Date()): number {
  const s = getLocalCalendarDateString(now);
  const [y, m, d] = s.split("-").map((x) => parseInt(x, 10));
  return Math.floor(Date.UTC(y, m - 1, d, 0, 0, 0, 0) / 86400000);
}
