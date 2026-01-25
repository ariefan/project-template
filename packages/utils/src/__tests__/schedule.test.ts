import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import { calculateNextRunAt } from "../schedule";

describe("calculateNextRunAt", () => {
  const baseDate = new Date("2024-01-25T10:00:00Z"); // Thursday

  it("should calculate daily schedules correctly", () => {
    const input = {
      frequency: "daily" as const,
      hour: 11,
      minute: 0,
      timezone: "UTC",
    };
    const next = calculateNextRunAt(input, baseDate);
    expect(next?.toISOString()).toBe("2024-01-25T11:00:00.000Z");

    const inputPast = {
      frequency: "daily" as const,
      hour: 9,
      minute: 0,
      timezone: "UTC",
    };
    const nextDay = calculateNextRunAt(inputPast, baseDate);
    expect(nextDay?.toISOString()).toBe("2024-01-26T09:00:00.000Z");
  });

  it("should handle weekly schedules", () => {
    const input = {
      frequency: "weekly" as const,
      dayOfWeek: "friday",
      hour: 9,
      minute: 0,
      timezone: "UTC",
    };
    const next = calculateNextRunAt(input, baseDate);
    expect(next?.toISOString()).toBe("2024-01-26T09:00:00.000Z"); // Next day is Friday
  });

  it("should handle monthly schedules with clamping (Feb 29/31st case)", () => {
    const febBase = new Date("2024-02-15T10:00:00Z"); // Leap year
    const input = {
      frequency: "monthly" as const,
      dayOfMonth: 31,
      hour: 9,
      minute: 0,
      timezone: "UTC",
    };

    const next = calculateNextRunAt(input, febBase);
    // 2024 is a leap year, so it should clamp to Feb 29
    expect(next?.toISOString()).toBe("2024-02-29T09:00:00.000Z");

    const janBase = new Date("2024-01-31T10:00:00Z");
    const nextFromJan = calculateNextRunAt(input, janBase);
    // Jan 31 already passed 9am, next month is Feb, should be Feb 29
    expect(nextFromJan?.toISOString()).toBe("2024-02-29T09:00:00.000Z");
  });

  it("should handle DST transitions (Spring Forward)", () => {
    // NYC Spring forward: 2024-03-10T02:00:00 -> 03:00:00
    // A daily job at 2:30 AM will "miss" its slot on March 10.
    const input = {
      frequency: "daily" as const,
      hour: 2,
      minute: 30,
      timezone: "America/New_York",
    };

    // From March 9 @ 9:00 AM ET (14:00Z)
    const next = calculateNextRunAt(input, new Date("2024-03-09T14:00:00Z"));

    // Luxon will shift 2:30 AM on March 10 to 3:30 AM because 2:30 doesn't exist.
    expect(next).toBeDefined();
    const dt = DateTime.fromJSDate(next as Date).setZone("America/New_York");
    expect(dt.day).toBe(10);
    expect(dt.hour).toBe(3);
    expect(dt.minute).toBe(30);
  });

  it("should respect start date in the future", () => {
    const futureDate = new Date("2024-02-01T12:00:00Z");
    const input = {
      frequency: "daily" as const,
      startDate: futureDate,
      hour: 9,
      minute: 0,
    };
    const next = calculateNextRunAt(input, baseDate);
    expect(next?.toISOString()).toBe(futureDate.toISOString());
  });
});
