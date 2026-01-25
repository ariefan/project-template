import cronParser from "cron-parser";
import { DateTime, type WeekdayNumbers } from "luxon";

export type ScheduleFrequency =
  | "once"
  | "daily"
  | "weekly"
  | "monthly"
  | "custom";

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface ScheduleCalculationInput {
  frequency: ScheduleFrequency;
  hour?: number | null;
  minute?: number | null;
  dayOfWeek?: DayOfWeek | string | null;
  dayOfMonth?: number | null;
  cronExpression?: string | null;
  startDate?: Date | string | null;
  timezone?: string | null;
}

/**
 * Calculate the next run time for a schedule
 */
export function calculateNextRunAt(
  input: ScheduleCalculationInput,
  fromDate: Date = new Date()
): Date | null {
  const {
    frequency,
    hour = 0,
    minute = 0,
    dayOfWeek,
    dayOfMonth,
    cronExpression,
    startDate,
    timezone = "UTC",
  } = input;

  const tz = timezone || "UTC";
  const now = DateTime.fromJSDate(fromDate).setZone(tz);

  // If startDate is in the future and we haven't reached it,
  // the first run should be the startDate
  if (startDate) {
    const start = DateTime.fromJSDate(new Date(startDate)).setZone(tz);
    if (start > now) {
      return start.toJSDate();
    }
  }

  const h = hour ?? 0;
  const m = minute ?? 0;

  switch (frequency) {
    case "once": {
      return startDate ? new Date(startDate) : null;
    }
    case "daily": {
      return calculateDaily(now, h, m).toJSDate();
    }
    case "weekly": {
      return calculateWeekly(now, h, m, dayOfWeek).toJSDate();
    }
    case "monthly": {
      return calculateMonthly(now, h, m, dayOfMonth).toJSDate();
    }
    case "custom": {
      return calculateCustom(fromDate, cronExpression, tz);
    }
    default:
      return null;
  }
}

function calculateDaily(now: DateTime, h: number, m: number): DateTime {
  let next = now.set({ hour: h, minute: m, second: 0, millisecond: 0 });
  if (next <= now) {
    next = next.plus({ days: 1 });
  }
  return next;
}

function calculateWeekly(
  now: DateTime,
  h: number,
  m: number,
  dayOfWeek?: DayOfWeek | string | null
): DateTime {
  const dayMap: Record<string, number> = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 7,
  };

  const targetWeekday = dayOfWeek
    ? (dayMap[dayOfWeek.toLowerCase()] ?? now.weekday)
    : now.weekday;

  let next = now.set({
    weekday: targetWeekday as WeekdayNumbers,
    hour: h,
    minute: m,
    second: 0,
    millisecond: 0,
  });

  // If the target day/time is in the past, move to next week
  if (next <= now) {
    next = next.plus({ weeks: 1 });
  }

  return next;
}

function calculateMonthly(
  now: DateTime,
  h: number,
  m: number,
  dayOfMonth?: number | null
): DateTime {
  const requestedDay = dayOfMonth ?? 1;

  // We want to run on the 'requestedDay'. If that day doesn't exist in the current month,
  // luxon's .set behavior usually handles this, but we want to ensure it's clamped
  // correctly to the last day of the month.

  const getClampedDate = (dt: DateTime, day: number) => {
    // If the requested day is larger than the days in month, clamp it
    const clampedDay = Math.min(day, dt.daysInMonth ?? 31);
    return dt.set({
      day: clampedDay,
      hour: h,
      minute: m,
      second: 0,
      millisecond: 0,
    });
  };

  let next = getClampedDate(now, requestedDay);

  if (next <= now) {
    // Move to next month and clamp again
    next = getClampedDate(now.plus({ months: 1 }), requestedDay);
  }

  return next;
}

function calculateCustom(
  fromDate: Date,
  cronExpression?: string | null,
  timezone?: string | null
): Date | null {
  if (!cronExpression) {
    return null;
  }
  try {
    // biome-ignore lint/suspicious/noExplicitAny: cron-parser types can be tricky
    const interval = (cronParser as any).parseExpression(cronExpression, {
      currentDate: fromDate,
      tz: timezone || "UTC",
    });
    return interval.next().toDate();
  } catch (e) {
    console.error("Failed to parse cron expression:", cronExpression, e);
    return null;
  }
}
