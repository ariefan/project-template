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
import { dayOfWeekEnum, scheduleFrequencyEnum } from "./common";
import { reportTemplates } from "./report-templates";

// ============ ENUMS ============

export const deliveryMethodEnum = pgEnum("delivery_method", [
  "email",
  "download",
  "webhook",
  "storage",
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

export interface DeliveryConfig {
  email?: EmailDeliveryConfig;
  webhook?: WebhookDeliveryConfig;
  storage?: StorageDeliveryConfig;
}

// ============ SCHEDULED REPORTS TABLE ============

export const scheduledReports = pgTable(
  "scheduled_reports",
  {
    id: text("id").primaryKey(), // format: sched_{randomString}

    // Organization scope
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Template reference
    templateId: text("template_id")
      .notNull()
      .references(() => reportTemplates.id, { onDelete: "cascade" }),

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
    deliveryMethod: deliveryMethodEnum("delivery_method").notNull(),
    deliveryConfig: jsonb("delivery_config").$type<DeliveryConfig>(),

    // Runtime parameters (passed to template)
    parameters: jsonb("parameters").$type<Record<string, unknown>>(),

    // Status
    isActive: boolean("is_active").notNull().default(true),
    lastRunAt: timestamp("last_run_at"),
    nextRunAt: timestamp("next_run_at"),
    failureCount: integer("failure_count").notNull().default(0),

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
    index("scheduled_reports_organization_id_idx").on(table.organizationId),
    index("scheduled_reports_template_id_idx").on(table.templateId),
    index("scheduled_reports_frequency_idx").on(table.frequency),
    index("scheduled_reports_delivery_method_idx").on(table.deliveryMethod),
    index("scheduled_reports_is_active_idx").on(table.isActive),
    index("scheduled_reports_next_run_at_idx").on(table.nextRunAt),
    index("scheduled_reports_deleted_at_idx").on(table.deletedAt),
  ]
);

// ============ TYPE EXPORTS ============

export type ScheduledReportRow = typeof scheduledReports.$inferSelect;
export type NewScheduledReportRow = typeof scheduledReports.$inferInsert;

export type DeliveryMethod = (typeof deliveryMethodEnum.enumValues)[number];
