import { describe, expect, it } from "vitest";
import { sortAvailabilityEntriesAscending } from "../availability-calendar";

describe("sortAvailabilityEntriesAscending", () => {
  it("orders by start date then end date and keeps every row", () => {
    const ended = {
      id: "old",
      startDate: new Date("2026-03-01T00:00:00.000Z"),
      endDate: new Date("2026-03-31T00:00:00.000Z"),
    };
    const ongoing = {
      id: "mid",
      startDate: new Date("2026-04-01T00:00:00.000Z"),
      endDate: new Date("2026-06-01T00:00:00.000Z"),
    };
    const future = {
      id: "later",
      startDate: new Date("2026-05-01T00:00:00.000Z"),
      endDate: new Date("2026-05-10T00:00:00.000Z"),
    };

    const sorted = sortAvailabilityEntriesAscending([future, ended, ongoing]);
    expect(sorted.map((r) => r.id)).toEqual(["old", "mid", "later"]);
  });
});
