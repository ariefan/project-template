import "@typespec/http";
import "../common/responses.tsp";

using TypeSpec.Http;

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Schedule frequency
 */
enum ScheduleFrequency {
  once: "once",
  daily: "daily",
  weekly: "weekly",
  monthly: "monthly",
  custom: "custom",
}

/**
 * Day of week for weekly schedules
 */
enum DayOfWeek {
  monday: "monday",
  tuesday: "tuesday",
  wednesday: "wednesday",
  thursday: "thursday",
  friday: "friday",
  saturday: "saturday",
  sunday: "sunday",
}

/**
 * Report delivery method
 */
enum DeliveryMethod {
  email: "email",
  download: "download",
  webhook: "webhook",
  storage: "storage",
}

// ============================================================================
// NESTED MODELS
// ============================================================================

/**
 * Email delivery configuration
 */
model EmailDeliveryConfig {
  /** Email recipients */
  recipients: string[];

  /** Email subject (supports template variables) */
  @example("Your Weekly Sales Report - {{date}}")
  subject?: string;

  /** Email body text (supports template variables) */
  body?: string;

  /** CC recipients */
  cc?: string[];

  /** BCC recipients */
  bcc?: string[];
}

/**
 * Webhook delivery configuration
 */
model WebhookDeliveryConfig {
  /** Webhook URL to POST the report */
  @example("https://api.example.com/reports/incoming")
  url: string;

  /** Custom headers to include */
  headers?: Record<string>;

  /** Include report as attachment or inline base64 */
  attachmentMode?: "attachment" | "base64";
}

/**
 * Storage delivery configuration
 */
model StorageDeliveryConfig {
  /** Storage path template (supports variables like {{date}}, {{name}}) */
  @example("/reports/{{year}}/{{month}}/{{name}}-{{date}}.csv")
  pathTemplate: string;

  /** Storage provider (local, s3, etc.) */
  provider?: string;

  /** Storage bucket (for cloud providers) */
  bucket?: string;
}

/**
 * Combined delivery configuration
 */
model DeliveryConfig {
  /** Email delivery settings (when deliveryMethod is email) */
  email?: EmailDeliveryConfig;

  /** Webhook delivery settings (when deliveryMethod is webhook) */
  webhook?: WebhookDeliveryConfig;

  /** Storage delivery settings (when deliveryMethod is storage) */
  storage?: StorageDeliveryConfig;
}

// ============================================================================
// MAIN MODEL
// ============================================================================

/**
 * Scheduled Report resource model
 *
 * Defines automated report generation with:
 * - Flexible scheduling (daily, weekly, monthly, custom cron)
 * - Multiple delivery methods (email, webhook, storage)
 * - Template-based generation
 * - Multi-tenant scoping
 */
model ScheduledReport {
  /** Unique schedule identifier (format: sched_{randomString}) */
  @example("sched_abc123xyz")
  id: string;

  /** Organization ID (tenant scope) */
  @example("org_xyz789")
  orgId: string;

  /** Associated report template ID */
  @example("tpl_template123")
  templateId: string;

  /** Schedule name */
  @example("Weekly Sales Summary")
  name: string;

  /** Schedule description */
  @example("Sends sales summary every Monday morning")
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

  /** Delivery method */
  deliveryMethod: DeliveryMethod;

  /** Delivery configuration */
  deliveryConfig?: DeliveryConfig;

  /** Runtime parameters passed to template */
  parameters?: Record<unknown>;

  /** Whether the schedule is active */
  isActive: boolean;

  /** Timestamp of last successful run */
  lastRunAt?: utcDateTime;

  /** Timestamp of next scheduled run */
  nextRunAt?: utcDateTime;

  /** Number of consecutive failures */
  failureCount: int32;

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
 * Request body for creating a scheduled report
 */
model CreateScheduledReportRequest {
  /** Associated report template ID */
  @example("tpl_template123")
  templateId: string;

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

  /** Delivery method */
  deliveryMethod: DeliveryMethod;

  /** Delivery configuration */
  deliveryConfig?: DeliveryConfig;

  /** Runtime parameters passed to template */
  parameters?: Record<unknown>;

  /** Whether the schedule is active (default: true) */
  isActive?: boolean;
}

/**
 * Request body for updating a scheduled report
 */
model UpdateScheduledReportRequest {
  /** Associated report template ID */
  templateId?: string;

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
  deliveryMethod?: DeliveryMethod;

  /** Delivery configuration */
  deliveryConfig?: DeliveryConfig;

  /** Runtime parameters */
  parameters?: Record<unknown>;

  /** Whether the schedule is active */
  isActive?: boolean;
}

// ============================================================================
// RESPONSE MODELS
// ============================================================================

/**
 * Single scheduled report response
 */
model ScheduledReportResponse {
  data: ScheduledReport;
  meta: ResponseMeta;
}

/**
 * Scheduled report collection response (page-based)
 */
model ScheduledReportListResponse {
  data: ScheduledReport[];
  pagination: Pagination;
  meta: ResponseMeta;
}
