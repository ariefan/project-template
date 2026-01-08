/**
 * ============================================================================
 * SCHEDULE COMMON TYPES
 * ============================================================================
 *
 * Shared types used by both scheduled reports and scheduled jobs.
 * These types are generic and can be used for any scheduled operation.
 * ============================================================================
 */

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
 * Report/Job delivery method
 */
enum DeliveryMethod {
  email: "email",
  download: "download",
  webhook: "webhook",
  storage: "storage",
}

/**
 * Generic job delivery method (extends DeliveryMethod with "none" option)
 */
enum JobDeliveryMethod {
  email: "email",
  download: "download",
  webhook: "webhook",
  storage: "storage",
  none: "none",
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
  @example("Your Weekly Report - {{date}}")
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
  /** Webhook URL to POST the result */
  @example("https://api.example.com/incoming")
  url: string;

  /** Custom headers to include */
  headers?: Record<string>;

  /** Include result as attachment or inline base64 */
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
