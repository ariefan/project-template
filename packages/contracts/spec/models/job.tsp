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
 * Async job resource
 *
 * Represents a long-running operation that can be polled for status.
 */
model Job {
  /** Unique job identifier (format: job_abc123) */
  @example("job_abc123")
  jobId: string;

  /** Tenant this job belongs to */
  @example("org_xyz789")
  tenantId: string;

  /** Type of operation (e.g., "bulkImport", "reportGeneration") */
  @example("bulkImport")
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

  /** Result data (when completed) */
  result?: Record<unknown>;

  /** Error details (when failed) */
  error?: {
    /** Error code */
    code: string;

    /** Error message */
    message: string;

    /** Additional error details */
    details?: Record<unknown>;
  };

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
