/**
 * Scheduler types for pg-boss integration
 */

export interface SchedulerConfig {
  /** PostgreSQL connection string */
  connectionString: string;
  /** Number of concurrent workers */
  concurrency?: number;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Job retention period in days */
  retentionDays?: number;
}

export interface ScheduleJobData {
  /** Scheduled report ID */
  scheduledReportId: string;
  /** Organization ID */
  organizationId: string;
  /** Template ID */
  templateId: string;
  /** Runtime parameters */
  parameters: Record<string, unknown>;
  /** Delivery configuration */
  delivery: {
    method: "email" | "download" | "webhook" | "storage";
    config: Record<string, unknown>;
  };
}

export interface JobProgress {
  /** Job ID */
  jobId: string;
  /** Progress percentage (0-100) */
  progress: number;
  /** Total rows to process */
  totalRows?: number;
  /** Rows processed so far */
  processedRows: number;
  /** Current status message */
  message?: string;
}
