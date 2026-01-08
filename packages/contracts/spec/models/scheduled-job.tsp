import "@typespec/http";
import "../common/responses.tsp";
import "./schedule-common.tsp";

using TypeSpec.Http;

// ============================================================================
// MAIN MODEL
// ============================================================================

/**
 * Scheduled Job resource model
 *
 * Defines automated job execution with:
 * - Flexible scheduling (daily, weekly, monthly, custom cron)
 * - Multiple delivery methods (email, webhook, storage)
 * - Generic job type support (report, export, import, custom)
 * - Multi-tenant scoping
 */
model ScheduledJob {
  /** Unique schedule identifier (format: sched_{randomString}) */
  @example("sched_abc123xyz")
  id: string;

  /** Organization ID (tenant scope) */
  @example("org_xyz789")
  orgId: string;

  /** Job type to run (e.g., "report", "export", "import", "custom-job") */
  @example("report")
  jobType: string;

  /** Job configuration passed to the job handler (e.g., templateId, parameters) */
  jobConfig?: Record<unknown>;

  /** Schedule name */
  @example("Weekly Sales Summary")
  name: string;

  /** Schedule description */
  @example("Runs weekly sales report every Monday morning")
  description?: string;

  /** Schedule frequency */
  frequency: ScheduleFrequency;

  /** Cron expression (required when frequency is custom) */
  @example("0 9 * * MON")
  cronExpression?: string;

  /** Day of week (for weekly frequency) */
  dayOfWeek?: DayOfWeek;

  /** Day of month (for monthly frequency, 1-28) */
  dayOfMonth?: int32;

  /** Hour to run (0-23) */
  @example(9)
  hour?: int32;

  /** Minute to run (0-59) */
  @example(0)
  minute?: int32;

  /** Timezone for scheduling */
  @example("America/New_York")
  timezone: string;

  /** Start date for the schedule */
  startDate: utcDateTime;

  /** End date for the schedule (null = runs indefinitely) */
  endDate?: utcDateTime;

  /** Delivery method for job results */
  deliveryMethod: JobDeliveryMethod;

  /** Delivery configuration */
  deliveryConfig?: DeliveryConfig;

  /** Whether the schedule is active */
  isActive: boolean;

  /** Timestamp of last successful run */
  lastRunAt?: utcDateTime;

  /** Timestamp of next scheduled run */
  nextRunAt?: utcDateTime;

  /** Number of consecutive failures */
  failureCount: int32;

  /** Last job ID created by this schedule */
  lastJobId?: string;

  /** User ID who created the schedule */
  @example("usr_creator123")
  createdBy: string;

  /** Timestamp when the schedule was created */
  createdAt: utcDateTime;

  /** Timestamp when the schedule was last updated */
  updatedAt: utcDateTime;

  /** Timestamp when the schedule was soft deleted */
  deletedAt?: utcDateTime;
}

// ============================================================================
// REQUEST MODELS
// ============================================================================

/**
 * Request body for creating a scheduled job
 */
model CreateScheduledJobRequest {
  /** Job type to run */
  @example("report")
  jobType: string;

  /** Job configuration passed to the job handler */
  jobConfig?: Record<unknown>;

  /** Schedule name */
  @example("Weekly Sales Summary")
  name: string;

  /** Schedule description */
  description?: string;

  /** Schedule frequency */
  frequency: ScheduleFrequency;

  /** Cron expression (required when frequency is custom) */
  cronExpression?: string;

  /** Day of week (for weekly frequency) */
  dayOfWeek?: DayOfWeek;

  /** Day of month (for monthly frequency) */
  dayOfMonth?: int32;

  /** Hour to run (0-23) */
  hour?: int32;

  /** Minute to run (0-59) */
  minute?: int32;

  /** Timezone for scheduling */
  @example("America/New_York")
  timezone?: string;

  /** Start date for the schedule */
  startDate?: utcDateTime;

  /** End date for the schedule */
  endDate?: utcDateTime;

  /** Delivery method for job results */
  deliveryMethod?: JobDeliveryMethod;

  /** Delivery configuration */
  deliveryConfig?: DeliveryConfig;

  /** Whether the schedule is active (default: true) */
  isActive?: boolean;
}

/**
 * Request body for updating a scheduled job
 */
model UpdateScheduledJobRequest {
  /** Job type to run */
  jobType?: string;

  /** Job configuration passed to the job handler */
  jobConfig?: Record<unknown>;

  /** Schedule name */
  name?: string;

  /** Schedule description */
  description?: string;

  /** Schedule frequency */
  frequency?: ScheduleFrequency;

  /** Cron expression */
  cronExpression?: string;

  /** Day of week */
  dayOfWeek?: DayOfWeek;

  /** Day of month */
  dayOfMonth?: int32;

  /** Hour to run */
  hour?: int32;

  /** Minute to run */
  minute?: int32;

  /** Timezone */
  timezone?: string;

  /** Start date */
  startDate?: utcDateTime;

  /** End date */
  endDate?: utcDateTime;

  /** Delivery method */
  deliveryMethod?: JobDeliveryMethod;

  /** Delivery configuration */
  deliveryConfig?: DeliveryConfig;

  /** Whether the schedule is active */
  isActive?: boolean;
}

// ============================================================================
// RESPONSE MODELS
// ============================================================================

/**
 * Single scheduled job response
 */
model ScheduledJobResponse {
  data: ScheduledJob;
  meta: ResponseMeta;
}

/**
 * Scheduled job collection response (page-based)
 */
model ScheduledJobListResponse {
  data: ScheduledJob[];
  pagination: Pagination;
  meta: ResponseMeta;
}

/**
 * Scheduled job run history response
 */
model ScheduledJobHistoryResponse {
  data: {
    /** Schedule ID */
    scheduleId: string;

    /** Jobs created by this schedule */
    jobs: {
      /** Job ID */
      jobId: string;

      /** Job status */
      status: string;

      /** When the job was created */
      createdAt: string;

      /** When the job completed */
      completedAt?: string;

      /** Whether the job succeeded */
      success: boolean;

      /** Error message if failed */
      error?: string;
    }[];
  };
  meta: ResponseMeta;
}
