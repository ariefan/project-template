/**
 * ============================================================================
 * WEBHOOK MODEL
 * ============================================================================
 *
 * Webhook configuration and delivery tracking for event notifications.
 *
 * Features:
 * - Subscribe to specific event types
 * - HMAC-SHA256 signature verification
 * - Automatic retries with exponential backoff
 * - Delivery logs for debugging
 *
 * @see docs/api-guide/07-integrations/01-webhooks.md
 * ============================================================================
 */

import "../common/responses.tsp";

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Webhook delivery status
 */
enum WebhookDeliveryStatus {
  /** Delivery pending (not yet attempted) */
  pending: "pending",

  /** Successfully delivered (2xx response) */
  delivered: "delivered",

  /** Delivery failed, will retry */
  failed: "failed",

  /** All retries exhausted */
  exhausted: "exhausted",
}

// ============================================================================
// MAIN MODELS
// ============================================================================

/**
 * Webhook configuration
 *
 * Defines an endpoint to receive event notifications.
 */
model Webhook {
  /** Unique webhook identifier (format: wh_abc123) */
  @example("wh_abc123")
  id: string;

  /** Tenant this webhook belongs to */
  @example("org_xyz789")
  tenantId: string;

  /** URL to receive webhook payloads */
  @example("https://customer.com/webhooks/handler")
  url: string;

  /** Human-readable name for this webhook */
  @example("Production Webhook")
  name?: string;

  /** Description of what this webhook is used for */
  description?: string;

  /** Event types to subscribe to (e.g., "user.created", "invoice.paid") */
  @example(#["user.created", "user.updated", "invoice.paid"])
  events: string[];

  /** Secret for HMAC-SHA256 signature verification (masked after creation) */
  @example("whsec_...xyz")
  secret: string;

  /** Whether the webhook is currently active */
  isActive: boolean;

  /** Number of consecutive failures (resets on success) */
  consecutiveFailures: int32;

  /** When the webhook was last triggered */
  lastTriggeredAt?: utcDateTime;

  /** When the webhook last succeeded */
  lastSuccessAt?: utcDateTime;

  /** When the webhook last failed */
  lastFailureAt?: utcDateTime;

  /** User who created this webhook */
  @example("usr_admin123")
  createdBy: string;

  /** When the webhook was created */
  createdAt: utcDateTime;

  /** When the webhook was last updated */
  updatedAt: utcDateTime;
}

/**
 * Webhook with unmasked secret (only returned on creation)
 */
model WebhookWithSecret {
  /** Unique webhook identifier */
  @example("wh_abc123")
  id: string;

  /** Tenant this webhook belongs to */
  tenantId: string;

  /** URL to receive webhook payloads */
  url: string;

  /** Webhook name */
  name?: string;

  /** Event types subscribed to */
  events: string[];

  /**
   * The webhook secret - ONLY RETURNED ONCE
   * Use this for signature verification
   */
  @example("whsec_abc123xyz789_secret")
  secret: string;

  /** Whether the webhook is active */
  isActive: boolean;

  /** When the webhook was created */
  createdAt: utcDateTime;
}

/**
 * Webhook delivery attempt record
 *
 * Tracks each attempt to deliver a webhook payload.
 */
model WebhookDelivery {
  /** Unique delivery identifier (format: whd_abc123) */
  @example("whd_abc123")
  id: string;

  /** Webhook ID this delivery belongs to */
  @example("wh_abc123")
  webhookId: string;

  /** Event ID that triggered this delivery */
  @example("wh_evt_xyz789")
  eventId: string;

  /** Event type */
  @example("user.created")
  eventType: string;

  /** Delivery status */
  status: WebhookDeliveryStatus;

  /** Number of delivery attempts made */
  attemptCount: int32;

  /** HTTP status code from last attempt (null if not yet attempted) */
  httpStatus?: int32;

  /** Response body from last attempt (truncated) */
  responseBody?: string;

  /** Error message if failed */
  errorMessage?: string;

  /** Duration of last request in milliseconds */
  durationMs?: int32;

  /** When the next retry will be attempted */
  nextRetryAt?: utcDateTime;

  /** When this delivery was created */
  createdAt: utcDateTime;

  /** When the delivery was last attempted */
  lastAttemptAt?: utcDateTime;

  /** When the delivery completed (success or exhausted) */
  completedAt?: utcDateTime;
}

/**
 * Webhook event payload structure
 *
 * This is what gets sent to the customer's webhook URL.
 */
model WebhookEvent {
  /** Unique event identifier */
  @example("wh_evt_abc123")
  id: string;

  /** Event type */
  @example("user.created")
  type: string;

  /** When the event occurred */
  createdAt: utcDateTime;

  /** Event payload data (resource-specific) */
  data: Record<unknown>;

  /** Event metadata */
  metadata: {
    /** Tenant ID */
    tenantId: string;

    /** API version */
    apiVersion: string;
  };
}

// ============================================================================
// REQUEST MODELS
// ============================================================================

/**
 * Request to create a webhook
 */
model CreateWebhookRequest {
  /** URL to receive webhook payloads (must be HTTPS) */
  @format("uri")
  url: string;

  /** Human-readable name */
  @maxLength(100)
  name?: string;

  /** Description */
  @maxLength(500)
  description?: string;

  /** Event types to subscribe to */
  @minItems(1)
  events: string[];

  /** Whether the webhook is active (default: true) */
  isActive?: boolean;
}

/**
 * Request to update a webhook
 */
model UpdateWebhookRequest {
  /** URL to receive webhook payloads */
  @format("uri")
  url?: string;

  /** Human-readable name */
  @maxLength(100)
  name?: string;

  /** Description */
  @maxLength(500)
  description?: string;

  /** Event types to subscribe to */
  events?: string[];

  /** Whether the webhook is active */
  isActive?: boolean;
}

// ============================================================================
// RESPONSE MODELS
// ============================================================================

/**
 * Webhook response (secret masked)
 */
model WebhookResponse {
  data: Webhook;
  meta: ResponseMeta;
}

/**
 * Webhook creation response (includes secret once)
 */
model WebhookCreatedResponse {
  data: WebhookWithSecret;
  meta: ResponseMeta;
}

/**
 * Webhook list response
 */
model WebhookListResponse {
  data: Webhook[];
  pagination: Pagination;
  meta: ResponseMeta;
}

/**
 * Webhook delivery response
 */
model WebhookDeliveryResponse {
  data: WebhookDelivery;
  meta: ResponseMeta;
}

/**
 * Webhook delivery list response
 */
model WebhookDeliveryListResponse {
  data: WebhookDelivery[];
  pagination: Pagination;
  meta: ResponseMeta;
}

/**
 * Available webhook event types
 */
model WebhookEventTypesResponse {
  data: {
    /** Available event types grouped by resource */
    eventTypes: Record<string[]>;
  };

  meta: ResponseMeta;
}
