import "@typespec/http";
import "../common/responses.tsp";
import "./report-template.tsp";

using TypeSpec.Http;

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Report job type
 */
enum ReportJobType {
  manual: "manual",
  scheduled: "scheduled",
}

/**
 * Report job status
 */
enum ReportJobStatus {
  pending: "pending",
  processing: "processing",
  completed: "completed",
  failed: "failed",
  cancelled: "cancelled",
}

// ============================================================================
// NESTED MODELS
// ============================================================================

/**
 * Job result data (when completed successfully)
 */
model ReportJobResult {
  /** Path to generated file (server-side) */
  filePath?: string;

  /** Generated file size in bytes */
  @example(102400)
  fileSize?: int64;

  /** Number of rows in the report */
  @example(1500)
  rowCount?: int32;

  /** Temporary download URL (expires) */
  @example("https://storage.example.com/reports/abc123.csv?token=xyz")
  downloadUrl?: string;

  /** Download URL expiration time */
  downloadExpiresAt?: utcDateTime;

  /** MIME type of the generated file */
  @example("text/csv")
  mimeType?: string;

  /** Delivery status (for scheduled reports) */
  deliveryStatus?: "pending" | "sent" | "failed";

  /** Delivery error message (if failed) */
  deliveryError?: string;
}

/**
 * Job error data (when failed)
 */
model ReportJobError {
  /** Error code */
  @example("exportFailed")
  code: string;

  /** Error message */
  @example("Failed to connect to data source")
  message: string;

  /** Stack trace (only in development) */
  stack?: string;

  /** Whether the error is retryable */
  retryable: boolean;
}

// ============================================================================
// MAIN MODEL
// ============================================================================

/**
 * Report Job resource model
 *
 * Tracks individual report generation jobs with:
 * - Progress tracking
 * - Result/error information
 * - Queue integration (pg-boss)
 * - Both manual and scheduled jobs
 */
model ReportJob {
  /** Unique job identifier (format: rjob_{randomString}) */
  @example("rjob_abc123xyz")
  id: string;

  /** Organization ID (tenant scope) */
  @example("org_xyz789")
  orgId: string;

  /** Associated report template ID */
  @example("tpl_template123")
  templateId?: string;

  /** Associated scheduled report ID (null for manual jobs) */
  @example("sched_schedule123")
  scheduledReportId?: string;

  /** Job type */
  type: ReportJobType;

  /** Current job status */
  status: ReportJobStatus;

  /** Output format */
  format: ReportFormat;

  /** Progress percentage (0-100) */
  @example(75)
  progress?: int32;

  /** Total rows to process */
  @example(10000)
  totalRows?: int32;

  /** Rows processed so far */
  @example(7500)
  processedRows?: int32;

  /** Runtime parameters used for this job */
  parameters?: Record<unknown>;

  /** Job result (when completed) */
  result?: ReportJobResult;

  /** Error information (when failed) */
  error?: ReportJobError;

  /** pg-boss queue job ID */
  queueJobId?: string;

  /** User ID who created/triggered the job */
  @example("usr_creator123")
  createdBy: string;

  /** Timestamp when the job was created */
  createdAt: utcDateTime;

  /** Timestamp when the job started processing */
  startedAt?: utcDateTime;

  /** Timestamp when the job completed (success or failure) */
  completedAt?: utcDateTime;

  /** Estimated completion time */
  estimatedCompletion?: utcDateTime;
}

// ============================================================================
// REQUEST MODELS
// ============================================================================

/**
 * Request body for triggering an export
 */
model ExportRequest {
  /** Report template ID (optional, for template-based exports) */
  templateId?: string;

  /** Output format (required if no templateId) */
  format?: ReportFormat;

  /** Data to export (for client-side data) */
  data?: unknown[];

  /** Column definitions (required if no templateId) */
  columns?: ReportColumnConfig[];

  /** Format-specific options */
  options?: ReportOptions;

  /** Filters to apply to data source */
  filters?: Record<unknown>;

  /** Sort configuration */
  sort?: {
    field: string;
    direction: "asc" | "desc";
  }[];

  /** Additional parameters for template */
  parameters?: Record<unknown>;

  /** Export only selected rows (by ID) */
  selectedIds?: string[];

  /** Use async processing (returns job ID) */
  async?: boolean;
}

/**
 * Request body for streaming export
 */
model StreamExportRequest {
  /** Report template ID */
  templateId?: string;

  /** Output format (only csv and excel supported) */
  format: "csv" | "excel";

  /** Filters to apply */
  filters?: Record<unknown>;

  /** Sort configuration */
  sort?: {
    field: string;
    direction: "asc" | "desc";
  }[];

  /** Batch size for streaming */
  batchSize?: int32;
}

// ============================================================================
// RESPONSE MODELS
// ============================================================================

/**
 * Single report job response
 */
model ReportJobResponse {
  data: ReportJob;
  meta: ResponseMeta;
}

/**
 * Report job collection response (page-based)
 */
model ReportJobListResponse {
  data: ReportJob[];
  pagination: Pagination;
  meta: ResponseMeta;
}

/**
 * Export response (synchronous)
 *
 * Returns the file directly with appropriate headers
 */
model ExportFileResponse {
  /** Binary file content */
  @body body: bytes;

  /** Content type header */
  @header contentType: string;

  /** Content disposition header */
  @header contentDisposition: string;
}

/**
 * Async export response (returns job info)
 */
model AsyncExportResponse {
  /** Job ID for tracking */
  @example("rjob_abc123xyz")
  jobId: string;

  /** Current status */
  status: ReportJobStatus;

  /** URL to check job status */
  @example("/v1/orgs/org_xyz/reports/jobs/rjob_abc123xyz")
  statusUrl: string;

  /** Estimated completion time */
  estimatedCompletion?: utcDateTime;

  /** Response metadata */
  meta: ResponseMeta;
}
