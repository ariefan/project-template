import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { organizations, users } from "./auth";
import { reportFormatEnum, reportTemplates } from "./report-templates";
import { scheduledReports } from "./scheduled-reports";

// ============ ENUMS ============

export const reportJobTypeEnum = pgEnum("report_job_type", [
  "manual",
  "scheduled",
]);

export const reportJobStatusEnum = pgEnum("report_job_status", [
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
]);

export const deliveryStatusEnum = pgEnum("delivery_status", [
  "pending",
  "sent",
  "failed",
]);

// ============ NESTED TYPES ============

export interface ReportJobResult {
  filePath?: string;
  fileSize?: number;
  rowCount?: number;
  downloadUrl?: string;
  downloadExpiresAt?: string;
  mimeType?: string;
  deliveryStatus?: "pending" | "sent" | "failed";
  deliveryError?: string;
}

export interface ReportJobError {
  code: string;
  message: string;
  stack?: string;
  retryable: boolean;
}

// ============ REPORT JOBS TABLE ============

export const reportJobs = pgTable(
  "report_jobs",
  {
    id: text("id").primaryKey(), // format: rjob_{randomString}

    // Organization scope
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Template reference (optional - can be ad-hoc export)
    templateId: text("template_id").references(() => reportTemplates.id, {
      onDelete: "set null",
    }),

    // Schedule reference (null for manual jobs)
    scheduledReportId: text("scheduled_report_id").references(
      () => scheduledReports.id,
      { onDelete: "set null" }
    ),

    // Job metadata
    type: reportJobTypeEnum("type").notNull(),
    status: reportJobStatusEnum("status").notNull().default("pending"),
    format: reportFormatEnum("format").notNull(),

    // Progress tracking
    progress: integer("progress"), // 0-100
    totalRows: integer("total_rows"),
    processedRows: integer("processed_rows"),

    // Runtime parameters
    parameters: jsonb("parameters").$type<Record<string, unknown>>(),

    // Result (when completed)
    result: jsonb("result").$type<ReportJobResult>(),

    // Error (when failed)
    error: jsonb("error").$type<ReportJobError>(),

    // Queue metadata
    queueJobId: text("queue_job_id"), // pg-boss job ID

    // Access control
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "set null" }),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    estimatedCompletion: timestamp("estimated_completion"),
  },
  (table) => [
    index("report_jobs_organization_id_idx").on(table.organizationId),
    index("report_jobs_template_id_idx").on(table.templateId),
    index("report_jobs_scheduled_report_id_idx").on(table.scheduledReportId),
    index("report_jobs_type_idx").on(table.type),
    index("report_jobs_status_idx").on(table.status),
    index("report_jobs_format_idx").on(table.format),
    index("report_jobs_created_by_idx").on(table.createdBy),
    index("report_jobs_created_at_idx").on(table.createdAt),
  ]
);

// ============ TYPE EXPORTS ============

export type ReportJobRow = typeof reportJobs.$inferSelect;
export type NewReportJobRow = typeof reportJobs.$inferInsert;

export type ReportJobType = (typeof reportJobTypeEnum.enumValues)[number];
export type ReportJobStatus = (typeof reportJobStatusEnum.enumValues)[number];
export type DeliveryStatus = (typeof deliveryStatusEnum.enumValues)[number];
