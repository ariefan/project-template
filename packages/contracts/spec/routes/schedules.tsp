/**
 * ============================================================================
 * SCHEDULED JOBS ROUTES - Generic Job Scheduling
 * ============================================================================
 *
 * Generic scheduling system for any job type.
 * Supports: reports, exports, imports, and custom job types.
 *
 * @see docs/api-guide/05-advanced-operations/
 * ============================================================================
 */

import "@typespec/http";
import "../common/responses.tsp";
import "../common/errors.tsp";
import "../models/job.tsp";
import "../models/scheduled-job.tsp";

using TypeSpec.Http;

namespace ProjectAPI;

/**
 * Scheduled Jobs API
 *
 * Generic job scheduling system.
 * Replace the old "Scheduled Reports" with this more flexible system.
 */
@route("/v1/orgs/{orgId}/schedules")
@tag("Scheduled Jobs")
interface ScheduledJobs {
  /**
   * List scheduled jobs
   *
   * Returns scheduled jobs for the current tenant with optional filtering.
   */
  @get
  @summary("List scheduled jobs")
  list(
    /** Organization ID */
    @path orgId: string,

    /** Page number (1-indexed) */
    @query page?: int32 = 1,

    /** Number of items per page */
    @query pageSize?: int32 = 50,

    /** Sort order */
    @query orderBy?: string,

    /** Filter by job type */
    @query jobType?: string,

    /** Filter by frequency */
    @query frequency?: ScheduleFrequency,

    /** Filter by delivery method */
    @query deliveryMethod?: JobDeliveryMethod,

    /** Filter by active status */
    @query isActive?: boolean,

    /** Full-text search */
    @query search?: string
  ): ScheduledJobListResponse | ErrorResponse;

  /**
   * Create a new scheduled job
   */
  @post
  @summary("Create scheduled job")
  create(
    /** Organization ID */
    @path orgId: string,

    /** Schedule data */
    @body body: CreateScheduledJobRequest
  ):
    | {
        @statusCode statusCode: 201;
        @header location: string;
        @body body: ScheduledJobResponse;
      }
    | ErrorResponse;

  /**
   * Get a scheduled job by ID
   */
  @route("/{scheduleId}")
  @get
  @summary("Get scheduled job")
  get(
    /** Organization ID */
    @path orgId: string,

    /** Schedule ID */
    @path scheduleId: string
  ): ScheduledJobResponse | ErrorResponse;

  /**
   * Update a scheduled job
   */
  @route("/{scheduleId}")
  @patch(#{ implicitOptionality: true })
  @summary("Update scheduled job")
  update(
    /** Organization ID */
    @path orgId: string,

    /** Schedule ID */
    @path scheduleId: string,

    /** Schedule update data */
    @body body: UpdateScheduledJobRequest
  ): ScheduledJobResponse | ErrorResponse;

  /**
   * Delete a scheduled job
   */
  @route("/{scheduleId}")
  @delete
  @summary("Delete scheduled job")
  delete(
    /** Organization ID */
    @path orgId: string,

    /** Schedule ID */
    @path scheduleId: string
  ): SoftDeleteResponse | ErrorResponse;

  /**
   * Trigger a scheduled job to run immediately
   */
  @route("/{scheduleId}/run")
  @post
  @summary("Run scheduled job now")
  runNow(
    /** Organization ID */
    @path orgId: string,

    /** Schedule ID */
    @path scheduleId: string
  ): JobResponse | ErrorResponse;

  /**
   * Pause a scheduled job
   */
  @route("/{scheduleId}/pause")
  @post
  @summary("Pause scheduled job")
  pause(
    /** Organization ID */
    @path orgId: string,

    /** Schedule ID */
    @path scheduleId: string
  ): ScheduledJobResponse | ErrorResponse;

  /**
   * Resume a paused scheduled job
   */
  @route("/{scheduleId}/resume")
  @post
  @summary("Resume scheduled job")
  resume(
    /** Organization ID */
    @path orgId: string,

    /** Schedule ID */
    @path scheduleId: string
  ): ScheduledJobResponse | ErrorResponse;

  /**
   * Get run history for a scheduled job
   */
  @route("/{scheduleId}/history")
  @get
  @summary("Get scheduled job history")
  getHistory(
    /** Organization ID */
    @path orgId: string,

    /** Schedule ID */
    @path scheduleId: string,

    /** Number of history items to return */
    @query limit?: int32 = 10
  ): ScheduledJobHistoryResponse | ErrorResponse;
}
