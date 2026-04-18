import { getDeploymentTimezone } from "../deployment.config";
import { calendarDateStringToDbDate } from "./local-day";

function tz(): string {
  return getDeploymentTimezone();
}

/** Display a stored calendar day (YYYY-MM-DD) in the deployment timezone. */
export function formatDeploymentCalendarDate(isoYyyyMmDd: string): string {
  const instant = calendarDateStringToDbDate(isoYyyyMmDd);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: tz(),
  }).format(instant);
}

export function formatDeploymentDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz(),
  }).format(date);
}

export function formatDeploymentDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: tz(),
  }).format(date);
}

/** Review / profile-style dates with a non-zero-padded day (matches prior UI). */
export function formatDeploymentDateNumericDay(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: tz(),
  }).format(date);
}

export function formatDeploymentMonthYear(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: tz(),
  }).format(date);
}

export function formatDeploymentRegistrationDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: tz(),
  }).format(date);
}

/** Collab message rows: day, month, time (same layout as before, fixed timezone). */
export function formatDeploymentCollabMessageTime(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz(),
  }).format(date);
}
