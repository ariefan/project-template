import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { organizations, users } from "./auth";

// ============ ENUMS ============

export const scheduleFrequencyEnum = pgEnum("schedule_frequency_v2", [
  "once",
  "daily",
  "weekly",
  "monthly",
  "custom",
]);

export const dayOfWeekEnum = pgEnum("day_of_week_v2", [
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

// ============ NESTED TYPES ============

export interface EmailDeliveryConfig {
  recipients: string[];
  subject?: string;
  body?: string;
  cc?: string[];
  bcc?: string[];
}

export interface WebhookDeliveryConfig {
  url: string;
  headers?: Record<string, string>;
  attachmentMode?: "attachment" | "base64";
}

export interface StorageDeliveryConfig {
  pathTemplate: string;
  provider?: string;
  bucket?: string;
}

export interface JobDeliveryConfig {
  email?: EmailDeliveryConfig;
  webhook?: WebhookDeliveryConfig;
  storage?: StorageDeliveryConfig;
}

// ============ SCHEDULED JOBS TABLE ============

export const scheduledJobs = pgTable(
  "scheduled_jobs",
  {
    id: text("id").primaryKey(), // format: sched_{randomString}

    // Organization scope
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Job configuration
    jobType: text("job_type").notNull(), // e.g., "report", "export", "import", "custom"
    jobConfig: jsonb("job_config").$type<Record<string, unknown>>(),

    // Metadata
    name: text("name").notNull(),
    description: text("description"),

    // Schedule configuration
    frequency: scheduleFrequencyEnum("frequency").notNull(),
    cronExpression: text("cron_expression"), // For custom frequency
    dayOfWeek: dayOfWeekEnum("day_of_week"), // For weekly frequency
    dayOfMonth: integer("day_of_month"), // For monthly frequency (1-28)
    hour: integer("hour"), // Hour to run (0-23)
    minute: integer("minute"), // Minute to run (0-59)
    timezone: text("timezone").notNull().default("UTC"),

    // Execution window
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date"), // NULL = runs indefinitely

    // Delivery configuration
    deliveryMethod: jobDeliveryMethodEnum("delivery_method")
      .notNull()
      .default("none"),
    deliveryConfig: jsonb("delivery_config").$type<JobDeliveryConfig>(),

    // Status
    isActive: boolean("is_active").notNull().default(true),
    lastRunAt: timestamp("last_run_at"),
    nextRunAt: timestamp("next_run_at"),
    failureCount: integer("failure_count").notNull().default(0),
    lastJobId: text("last_job_id"), // Reference to the last job created

    // Access control
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "set null" }),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("scheduled_jobs_organization_id_idx").on(table.organizationId),
    index("scheduled_jobs_job_type_idx").on(table.jobType),
    index("scheduled_jobs_frequency_idx").on(table.frequency),
    index("scheduled_jobs_delivery_method_idx").on(table.deliveryMethod),
    index("scheduled_jobs_is_active_idx").on(table.isActive),
    index("scheduled_jobs_next_run_at_idx").on(table.nextRunAt),
    index("scheduled_jobs_deleted_at_idx").on(table.deletedAt),
  ]
);

// ============ TYPE EXPORTS ============

export type ScheduledJobRow = typeof scheduledJobs.$inferSelect;
export type NewScheduledJobRow = typeof scheduledJobs.$inferInsert;

export type ScheduleFrequencyV2 =
  (typeof scheduleFrequencyEnum.enumValues)[number];
export type DayOfWeekV2 = (typeof dayOfWeekEnum.enumValues)[number];
export type JobDeliveryMethod =
  (typeof jobDeliveryMethodEnum.enumValues)[number];
