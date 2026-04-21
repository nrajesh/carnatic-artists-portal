import {
  deploymentCalendarDateToday,
  formatDateAsDeploymentCalendarDay,
} from "@/lib/availability-calendar";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type WindowInput = {
  startDate: string;
  endDate: string;
};

type WindowRange = {
  startDate: Date;
  endDate: Date;
};

export function parseAvailabilityWindowDates(
  input: WindowInput,
): { ok: true; startDate: Date; endDate: Date } | { ok: false; error: string } {
  const start = input.startDate.trim();
  const end = input.endDate.trim();

  if (!DATE_RE.test(start) || !DATE_RE.test(end)) {
    return { ok: false, error: "Please provide a valid date in YYYY-MM-DD format." };
  }

  const startDate = new Date(`${start}T00:00:00.000Z`);
  const endDate = new Date(`${end}T00:00:00.000Z`);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return { ok: false, error: "Please provide a valid date in YYYY-MM-DD format." };
  }

  if (endDate.getTime() < startDate.getTime()) {
    return { ok: false, error: "End date must be the same as or later than start date." };
  }

  const todayKey = deploymentCalendarDateToday();
  const endKey = formatDateAsDeploymentCalendarDay(endDate);
  if (endKey < todayKey) {
    return {
      ok: false,
      error:
        "End date cannot be in the past. Ongoing availability is ok (start may be earlier), but the window must still end today or later.",
    };
  }

  return { ok: true, startDate, endDate };
}

export function windowsOverlap(a: WindowRange, b: WindowRange): boolean {
  return a.startDate.getTime() <= b.endDate.getTime() && b.startDate.getTime() <= a.endDate.getTime();
}

export function windowOverlapsExisting(
  candidate: WindowRange,
  existing: Array<WindowRange & { id: string }>,
  ignoreId?: string,
): boolean {
  return existing.some((window) => {
    if (ignoreId && window.id === ignoreId) return false;
    return windowsOverlap(candidate, window);
  });
}
