/**
 * Cron Expression Parser
 *
 * Parses cron expressions and calculates next run times
 */

// Top-level regex for performance
const WHITESPACE_PATTERN = /\s+/;

export interface CronFields {
  minute: number[];
  hour: number[];
  dayOfMonth: number[];
  month: number[];
  dayOfWeek: number[];
}

/**
 * Parse a cron expression into its fields
 */
export function parseCron(expression: string): CronFields {
  const parts = expression.trim().split(WHITESPACE_PATTERN);

  if (parts.length !== 5) {
    throw new CronParseError(
      `Invalid cron expression: expected 5 fields, got ${parts.length}`
    );
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts as [
    string,
    string,
    string,
    string,
    string,
  ];

  return {
    minute: parseField(minute, 0, 59),
    hour: parseField(hour, 0, 23),
    dayOfMonth: parseField(dayOfMonth, 1, 31),
    month: parseField(month, 1, 12),
    dayOfWeek: parseField(dayOfWeek, 0, 6),
  };
}

/**
 * Parse a single cron field
 */
function parseField(field: string, min: number, max: number): number[] {
  const values = new Set<number>();

  for (const part of field.split(",")) {
    parseFieldPart(part, min, max, values);
  }

  return Array.from(values).sort((a, b) => a - b);
}

/**
 * Parse a single part of a cron field (handles *, ranges, steps, single values)
 */
function parseFieldPart(
  part: string,
  min: number,
  max: number,
  values: Set<number>
): void {
  if (part === "*") {
    addRange(min, max, 1, values);
    return;
  }

  if (part.includes("/")) {
    parseStepValue(part, min, max, values);
    return;
  }

  if (part.includes("-")) {
    const [start, end] = parseRange(part, min, max);
    addRange(start, end, 1, values);
    return;
  }

  parseSingleValue(part, min, max, values);
}

/**
 * Parse step values like star-slash-5 or 0-30/5
 */
function parseStepValue(
  part: string,
  min: number,
  max: number,
  values: Set<number>
): void {
  const splitParts = part.split("/");
  const range = splitParts[0] ?? "";
  const stepStr = splitParts[1] ?? "";
  const step = Number.parseInt(stepStr, 10);

  if (Number.isNaN(step) || step <= 0) {
    throw new CronParseError(`Invalid step value: ${stepStr}`);
  }

  const [start, end] = range === "*" ? [min, max] : parseRange(range, min, max);
  addRange(start, end, step, values);
}

/**
 * Parse a single numeric value
 */
function parseSingleValue(
  part: string,
  min: number,
  max: number,
  values: Set<number>
): void {
  const value = Number.parseInt(part, 10);
  if (Number.isNaN(value) || value < min || value > max) {
    throw new CronParseError(`Invalid value: ${part} (expected ${min}-${max})`);
  }
  values.add(value);
}

/**
 * Add a range of values to the set
 */
function addRange(
  start: number,
  end: number,
  step: number,
  values: Set<number>
): void {
  for (let i = start; i <= end; i += step) {
    values.add(i);
  }
}

/**
 * Parse a range expression
 */
function parseRange(range: string, min: number, max: number): [number, number] {
  const parts = range.split("-");
  const startStr = parts[0] ?? "";
  const endStr = parts[1] ?? "";
  const start = Number.parseInt(startStr, 10);
  const end = Number.parseInt(endStr, 10);

  if (Number.isNaN(start) || Number.isNaN(end)) {
    throw new CronParseError(`Invalid range: ${range}`);
  }

  if (start < min || end > max || start > end) {
    throw new CronParseError(
      `Range out of bounds: ${range} (expected ${min}-${max})`
    );
  }

  return [start, end];
}

/**
 * Check if a value matches a field
 */
function matches(field: number[], value: number): boolean {
  return field.includes(value);
}

/**
 * Calculate the next run time after a given date
 */
export function getNextCronRun(
  expression: string,
  after: Date = new Date()
): Date {
  const fields = parseCron(expression);
  const next = new Date(after.getTime());

  // Start from the next minute
  next.setSeconds(0, 0);
  next.setMinutes(next.getMinutes() + 1);

  // Maximum iterations to prevent infinite loop
  const maxIterations = 366 * 24 * 60; // One year of minutes

  for (let i = 0; i < maxIterations; i++) {
    if (matchesCronFields(fields, next)) {
      return next;
    }
    next.setMinutes(next.getMinutes() + 1);
  }

  throw new CronParseError("Could not find next run time within a year");
}

/**
 * Check if a date matches cron fields
 */
function matchesCronFields(fields: CronFields, date: Date): boolean {
  return (
    matches(fields.month, date.getMonth() + 1) &&
    (matches(fields.dayOfMonth, date.getDate()) ||
      matches(fields.dayOfWeek, date.getDay())) &&
    matches(fields.hour, date.getHours()) &&
    matches(fields.minute, date.getMinutes())
  );
}

/**
 * Get multiple future run times
 */
export function getNextCronRuns(
  expression: string,
  count: number,
  after: Date = new Date()
): Date[] {
  const runs: Date[] = [];
  let current = after;

  for (let i = 0; i < count; i++) {
    current = getNextCronRun(expression, current);
    runs.push(current);
  }

  return runs;
}

/**
 * Validate a cron expression
 */
export function validateCron(expression: string): {
  valid: boolean;
  error?: string;
} {
  try {
    parseCron(expression);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get a human-readable description of a cron expression
 */
export function describeCron(expression: string): string {
  const fields = parseCron(expression);
  const parts: string[] = [];

  describeMinutes(fields.minute, parts);
  describeHours(fields.hour, parts);
  describeDayOfMonth(fields.dayOfMonth, parts);
  describeMonths(fields.month, parts);
  describeDayOfWeek(fields.dayOfWeek, parts);

  return parts.join(" ");
}

function describeMinutes(minutes: number[], parts: string[]): void {
  if (minutes.length === 60) {
    parts.push("every minute");
  } else if (minutes.length === 1) {
    parts.push(`at minute ${minutes[0]}`);
  } else {
    parts.push(`at minutes ${minutes.join(", ")}`);
  }
}

function describeHours(hours: number[], parts: string[]): void {
  if (hours.length < 24) {
    if (hours.length === 1) {
      parts.push(`hour ${hours[0]}`);
    } else {
      parts.push(`hours ${hours.join(", ")}`);
    }
  }
}

function describeDayOfMonth(days: number[], parts: string[]): void {
  if (days.length < 31) {
    parts.push(`on day ${days.join(", ")} of the month`);
  }
}

function describeMonths(months: number[], parts: string[]): void {
  if (months.length < 12) {
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const names = months.map((m) => monthNames[m - 1]);
    parts.push(`in ${names.join(", ")}`);
  }
}

function describeDayOfWeek(days: number[], parts: string[]): void {
  if (days.length < 7) {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const names = days.map((d) => dayNames[d]);
    parts.push(`on ${names.join(", ")}`);
  }
}

/**
 * Wrapper class for backward compatibility
 */
export const CronParser = {
  parse: parseCron,
  getNextRun: getNextCronRun,
  getNextRuns: getNextCronRuns,
  validate: validateCron,
  describe: describeCron,
};

export class CronParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CronParseError";
  }
}

/**
 * Common cron expressions
 */
export const CRON_PRESETS = {
  /** Every minute */
  EVERY_MINUTE: "* * * * *",
  /** Every 5 minutes */
  EVERY_5_MINUTES: "*/5 * * * *",
  /** Every 15 minutes */
  EVERY_15_MINUTES: "*/15 * * * *",
  /** Every 30 minutes */
  EVERY_30_MINUTES: "*/30 * * * *",
  /** Every hour */
  EVERY_HOUR: "0 * * * *",
  /** Every day at midnight */
  DAILY_MIDNIGHT: "0 0 * * *",
  /** Every day at 6am */
  DAILY_6AM: "0 6 * * *",
  /** Every Monday at midnight */
  WEEKLY_MONDAY: "0 0 * * 1",
  /** First day of month at midnight */
  MONTHLY_FIRST: "0 0 1 * *",
  /** Every weekday at 9am */
  WEEKDAYS_9AM: "0 9 * * 1-5",
} as const;
