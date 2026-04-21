import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  parseAvailabilityWindowDates,
  windowOverlapsExisting,
  windowsOverlap,
} from "../availability";

describe("availability helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("parses valid date strings into UTC date boundaries", () => {
    const parsed = parseAvailabilityWindowDates({
      startDate: "2026-04-20",
      endDate: "2026-04-22",
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.startDate.toISOString()).toBe("2026-04-20T00:00:00.000Z");
    expect(parsed.endDate.toISOString()).toBe("2026-04-22T00:00:00.000Z");
  });

  it("rejects malformed dates", () => {
    const parsed = parseAvailabilityWindowDates({
      startDate: "20-04-2026",
      endDate: "2026-04-22",
    });

    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error).toContain("valid date");
  });

  it("rejects end date before start date", () => {
    const parsed = parseAvailabilityWindowDates({
      startDate: "2026-04-23",
      endDate: "2026-04-22",
    });

    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error).toContain("same as or later");
  });

  it("rejects ended windows (no longer ongoing)", () => {
    vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));
    const parsed = parseAvailabilityWindowDates({
      startDate: "2026-05-20",
      endDate: "2026-06-05",
    });

    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error.toLowerCase()).toMatch(/past|today|later/);
  });

  it("allows ongoing ranges whose start date is already in the past", () => {
    vi.setSystemTime(new Date("2026-04-21T12:00:00.000Z"));
    const parsed = parseAvailabilityWindowDates({
      startDate: "2026-04-01",
      endDate: "2026-04-30",
    });

    expect(parsed.ok).toBe(true);
  });

  it("detects overlap when ranges intersect", () => {
    const overlap = windowsOverlap(
      { startDate: new Date("2026-04-20T00:00:00.000Z"), endDate: new Date("2026-04-22T00:00:00.000Z") },
      { startDate: new Date("2026-04-22T00:00:00.000Z"), endDate: new Date("2026-04-25T00:00:00.000Z") },
    );

    expect(overlap).toBe(true);
  });

  it("detects no overlap when ranges are disjoint", () => {
    const overlap = windowsOverlap(
      { startDate: new Date("2026-04-20T00:00:00.000Z"), endDate: new Date("2026-04-22T00:00:00.000Z") },
      { startDate: new Date("2026-04-23T00:00:00.000Z"), endDate: new Date("2026-04-25T00:00:00.000Z") },
    );

    expect(overlap).toBe(false);
  });

  it("checks overlap against existing entries excluding current id", () => {
    const overlaps = windowOverlapsExisting(
      {
        startDate: new Date("2026-04-22T00:00:00.000Z"),
        endDate: new Date("2026-04-24T00:00:00.000Z"),
      },
      [
        {
          id: "entry-a",
          startDate: new Date("2026-04-20T00:00:00.000Z"),
          endDate: new Date("2026-04-22T00:00:00.000Z"),
        },
        {
          id: "entry-b",
          startDate: new Date("2026-05-01T00:00:00.000Z"),
          endDate: new Date("2026-05-03T00:00:00.000Z"),
        },
      ],
      "entry-a",
    );

    expect(overlaps).toBe(false);
  });
});
