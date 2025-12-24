import {
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

/**
 * Jobs table for async operations
 * Stores job metadata and status for polling
 */
export const jobs = pgTable("jobs", {
  id: text("id").primaryKey(), // job_abc123
  orgId: text("org_id").notNull(), // Multi-tenancy

  // Job type and status
  type: text("type").notNull(), // e.g., "bulkImport", "reportGeneration"
  status: jobStatusEnum("status").notNull().default("pending"),

  // Progress tracking
  progress: integer("progress"), // 0-100
  message: text("message"), // Human-readable status message

  // Result or error
  result: jsonb("result"), // Completion result data
  errorCode: text("error_code"),
  errorMessage: text("error_message"),

  // Audit
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  estimatedCompletion: timestamp("estimated_completion"),
});

// Type inference
export type JobRow = typeof jobs.$inferSelect;
export type NewJobRow = typeof jobs.$inferInsert;
export type JobStatus = (typeof jobStatusEnum.enumValues)[number];
