/**
 * ============================================================================
 * JOBS ROUTES - Async Operation Status
 * ============================================================================
 *
 * Track status of long-running async operations.
 *
 * @see docs/api-guide/05-advanced-operations/
 * ============================================================================
 */

import "@typespec/http";
import "../common/responses.tsp";
import "../common/errors.tsp";
import "../models/job.tsp";

using TypeSpec.Http;

namespace ProjectAPI;

/**
 * Jobs API
 *
 * Query status of async operations.
 */
@route("/v1/orgs/{orgId}/jobs")
@tag("Jobs")
interface Jobs {
  /**
   * List async jobs
   *
   * Returns jobs for the current tenant.
   */
  @get
  @summary("List jobs")
  list(
    /** Organization ID */
    @path orgId: string,

    /** Page number (1-indexed) */
    @query page?: int32 = 1,

    /** Number of items per page */
    @query pageSize?: int32 = 50,

    /** Filter by job status */
    @query status?: JobStatus,

    /** Filter by job type */
    @query type?: string,

    /** Filter jobs created after this timestamp */
    @query createdAfter?: utcDateTime
  ): JobListResponse | ErrorResponse;

  /**
   * Get job status
   *
   * Poll this endpoint to check progress of async operations.
   */
  @route("/{jobId}")
  @get
  @summary("Get job status")
  get(
    /** Organization ID */
    @path orgId: string,

    /** Job ID */
    @path jobId: string
  ): JobResponse | ErrorResponse;

  /**
   * Cancel a job
   *
   * Only pending or processing jobs can be cancelled.
   */
  @route("/{jobId}/cancel")
  @post
  @summary("Cancel job")
  cancel(
    /** Organization ID */
    @path orgId: string,

    /** Job ID */
    @path jobId: string
  ): JobResponse | ErrorResponse;
}
