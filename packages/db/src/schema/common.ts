import { pgEnum } from "drizzle-orm/pg-core";

export const scheduleFrequencyEnum = pgEnum("schedule_frequency", [
  "once",
  "daily",
  "weekly",
  "monthly",
  "custom",
]);

export const dayOfWeekEnum = pgEnum("day_of_week", [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);

export const jobDeliveryMethodEnum = pgEnum("job_delivery_method", [
  "email",
  "download",
  "webhook",
  "storage",
  "none",
]);

export type ScheduleFrequency =
  (typeof scheduleFrequencyEnum.enumValues)[number];
export type DayOfWeek = (typeof dayOfWeekEnum.enumValues)[number];
export type JobDeliveryMethod =
  (typeof jobDeliveryMethodEnum.enumValues)[number];
