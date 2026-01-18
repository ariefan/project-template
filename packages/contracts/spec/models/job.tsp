/**
 * ============================================================================
 * JOB MODEL - Async Operation Tracking
 * ============================================================================
 *
 * Track status of long-running async operations.
 *
 * When an endpoint returns 202 Accepted, it includes a job ID
 * that can be used to poll for status.
 *
 * @see docs/api-guide/05-advanced-operations/
 * ============================================================================
 */

import "../common/responses.tsp";

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Job status
 */
enum JobStatus {
  /** Job is queued but not started */
  pending: "pending",

  /** Job is currently being processed */
  processing: "processing",

  /** Job completed successfully */
  completed: "completed",

  /** Job failed */
  failed: "failed",

  /** Job was cancelled */
  cancelled: "cancelled",
}

// ============================================================================
// MAIN MODEL
// ============================================================================

/**
 * Job metadata for type-specific references
 */
model JobMetadata {
  /** Template ID (for report jobs) */
  templateId?: string;

  /** Scheduled report ID (for scheduled report jobs) */
  scheduledReportId?: string;

  /** Format (for report jobs) */
  format?: string;

  /** Parent job ID (for retried jobs) */
  parentJobId?: string;

  /** Retry count */
  retryCount?: int32;
}

/**
 * Job error details
 */
model JobError {
  /** Error code */
  @example("GENERATION_FAILED")
  code: string;

  /** Error message */
  @example("Failed to connect to data source")
  message: string;

  /** Whether the error is retryable */
  retryable?: boolean;
}

/**
 * Request to create a new job
 */
model CreateJobRequest {
  /** Job type (e.g., "report", "import", "export", "my-custom-job") */
  type: string;

  /** Job input parameters (job-specific) */
  input?: Record<unknown>;

  /** Job metadata (references, format, etc.) */
  metadata?: JobMetadata;
}

/**
 * Async job resource
 *
 * Represents a long-running operation that can be polled for status.
 * Unified job system with pg-boss queue integration.
 */
model Job {
  /** Unique job identifier (format: job_abc123) */
  @example("job_abc123")
  jobId: string;

  /** Tenant this job belongs to */
  @example("org_xyz789")
  tenantId: string;

  /** Type of operation (e.g., "report", "import", "export") */
  @example("report")
  type: string;

  /** Current job status */
  status: JobStatus;

  /** Progress percentage (0-100, if available) */
  @minValue(0)
  @maxValue(100)
  progress?: int32;

  /** Human-readable status message */
  @example("Processing 150 of 500 records...")
  message?: string;

  /** Total items to process */
  totalItems?: int32;

  /** Items processed so far */
  processedItems?: int32;

  /** Job input parameters */
  input?: Record<unknown>;

  /** Job output/result data (when completed) */
  output?: Record<unknown>;

  /** Job metadata (references, format, etc.) */
  metadata?: JobMetadata;

  /** Error details (when failed) */
  error?: JobError;

  /** Who initiated the job */
  @example("usr_123")
  createdBy: string;

  /** When the job was created */
  createdAt: utcDateTime;

  /** When the job started processing */
  startedAt?: utcDateTime;

  /** When the job completed (success or failure) */
  completedAt?: utcDateTime;

  /** Estimated completion time (if available) */
  estimatedCompletion?: utcDateTime;
}

// ============================================================================
// RESPONSE MODELS
// ============================================================================

/**
 * Job status response
 */
model JobResponse {
  data: Job;
  meta: ResponseMeta;
}

/**
 * Job list response
 */
model JobListResponse {
  data: Job[];
  pagination: Pagination;
  meta: ResponseMeta;
}

// ============================================================================
// JOB TYPES (for schedule form)
// ============================================================================

/**
 * Job type information for UI
 *
 * Describes a registered job handler's metadata for building
 * schedule configuration forms.
 */
model JobTypeInfo {
  /** Job type identifier */
  @example("report")
  type: string;

  /** Human-readable label */
  @example("Report Generation")
  label: string;

  /** Description of what the job does */
  @example("Generate reports from templates")
  description: string;

  /** JSON schema description for configuration */
  @example("{ templateId: string, format?: 'xlsx'|'csv'|'pdf' }")
  configSchema?: string;

  /** Example configuration */
  exampleConfig?: Record<unknown>;
}

/**
 * Job types list response
 */
model JobTypesListResponse {
  data: JobTypeInfo[];
  meta: ResponseMeta;
}
