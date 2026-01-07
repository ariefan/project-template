import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Job status enum
 * - pending: Queued, not started
 * - processing: Currently running
 * - completed: Finished successfully
 * - failed: Failed with errors
 * - cancelled: Cancelled by user
 */
export const jobStatusEnum = pgEnum("job_status", [
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
]);

// ============ TYPE DEFINITIONS ============

/**
 * Job metadata for type-specific references
 */
export interface JobMetadata {
  // Report-specific
  templateId?: string;
  scheduledReportId?: string;
  format?: "csv" | "excel" | "pdf" | "thermal" | "dotmatrix";

  // Import-specific (future)
  fileId?: string;
  sourceType?: string;

  // Generic
  retryCount?: number;
  parentJobId?: string;
}

/**
 * Job error structure
 */
export interface JobError {
  code: string;
  message: string;
  retryable?: boolean;
  stack?: string;
}

/**
 * Report job output structure
 */
export interface ReportJobOutput {
  filePath?: string;
  fileSize?: number;
  rowCount?: number;
  mimeType?: string;
  downloadUrl?: string;
  downloadExpiresAt?: string;
}

// ============ TABLE DEFINITION ============

/**
 * Jobs table for async operations
 * Unified job system with pg-boss queue integration
 */
export const jobs = pgTable(
  "jobs",
  {
    id: text("id").primaryKey(), // job_abc123
    orgId: text("org_id").notNull(), // Multi-tenancy

    // Job type and status
    type: text("type").notNull(), // "report", "import", "export", etc.
    status: jobStatusEnum("status").notNull().default("pending"),

    // Progress tracking
    progress: integer("progress"), // 0-100
    message: text("message"), // Human-readable status message
    totalItems: integer("total_items"), // Total items to process
    processedItems: integer("processed_items").default(0), // Items processed

    // Job data (flexible per job type)
    input: jsonb("input").$type<Record<string, unknown>>(), // Job input parameters
    output: jsonb("output").$type<Record<string, unknown>>(), // Job result/output
    metadata: jsonb("metadata").$type<JobMetadata>(), // References and extra info

    // Error handling
    error: jsonb("error").$type<JobError>(), // Structured error

    // Queue integration
    queueJobId: text("queue_job_id"), // pg-boss job ID

    // Audit
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    estimatedCompletion: timestamp("estimated_completion"),
  },
  (table) => [
    index("jobs_org_id_idx").on(table.orgId),
    index("jobs_type_idx").on(table.type),
    index("jobs_status_idx").on(table.status),
    index("jobs_created_by_idx").on(table.createdBy),
    index("jobs_created_at_idx").on(table.createdAt),
  ]
);

// ============ TYPE EXPORTS ============

export type JobRow = typeof jobs.$inferSelect;
export type NewJobRow = typeof jobs.$inferInsert;
export type JobStatus = (typeof jobStatusEnum.enumValues)[number];
