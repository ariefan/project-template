/**
 * ============================================================================
 * PAYMENT EVENT MODEL
 * ============================================================================
 *
 * Tracks payment webhook events from payment providers (Xendit, Stripe, etc.)
 * Used for audit trail and debugging payment issues.
 *
 * ============================================================================
 */

import "../common/responses.tsp";

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Webhook event types from payment providers
 */
enum WebhookEventType {
  /** Payment succeeded */
  payment_success: "payment.success",

  /** Payment failed */
  payment_failed: "payment.failed",

  /** Subscription created */
  subscription_created: "subscription.created",

  /** Subscription updated */
  subscription_updated: "subscription.updated",

  /** Subscription canceled */
  subscription_canceled: "subscription.canceled",

  /** Invoice created */
  invoice_created: "invoice.created",

  /** Invoice paid */
  invoice_paid: "invoice.paid",

  /** Cycle succeeded (recurring payment) */
  cycle_succeeded: "recurring.cycle.succeeded",

  /** Cycle failed (recurring payment) */
  cycle_failed: "recurring.cycle.failed",

  /** Cycle retrying (recurring payment) */
  cycle_retrying: "recurring.cycle.retrying",
}

/**
 * Payment event status
 */
enum PaymentEventStatus {
  /** Payment succeeded */
  succeeded: "succeeded",

  /** Payment pending */
  pending: "pending",

  /** Payment failed */
  failed: "failed",

  /** Payment processing */
  processing: "processing",
}

// ============================================================================
// MAIN MODEL
// ============================================================================

/**
 * Payment webhook event
 *
 * Records webhook events from payment providers for audit and debugging.
 */
model PaymentEvent {
  /** Unique event identifier (format: evt_abc123) */
  @example("evt_abc123")
  id: string;

  /** Subscription ID */
  @example("sub_xyz789")
  subscriptionId: string;

  /** Provider event ID (for idempotency) */
  @example("xendit_evt_123")
  providerEventId?: string;

  /** Payment provider */
  @example("xendit")
  provider: string;

  /** Event type */
  eventType: WebhookEventType;

  /** Amount in cents */
  @example(100000)
  amount?: int32;

  /** Currency code */
  @example("IDR")
  currency?: string;

  /** Event status */
  status: PaymentEventStatus;

  /** Provider cycle ID (for recurring payments) */
  @example("cycle_123")
  providerCycleId?: string;

  /** Provider invoice ID */
  @example("invoice_123")
  providerInvoiceId?: string;

  /** Raw webhook payload (for debugging) */
  rawPayload?: Record<unknown>;

  /** Error code (if failed) */
  @example("INSUFFICIENT_FUNDS")
  errorCode?: string;

  /** Error message (if failed) */
  @example("Insufficient funds in account")
  errorMessage?: string;

  /** When the event was processed */
  processedAt?: utcDateTime;

  /** When the event was received */
  createdAt: utcDateTime;
}

// ============================================================================
// RESPONSE MODELS
// ============================================================================

/**
 * Payment event response
 */
model PaymentEventResponse {
  data: PaymentEvent;
  meta: ResponseMeta;
}

/**
 * Payment event list response
 */
model PaymentEventListResponse {
  data: PaymentEvent[];
  pagination: Pagination;
  meta: ResponseMeta;
}

/**
 * Webhook received acknowledgment
 */
model WebhookAcknowledgment {
  /** Whether webhook was received */
  received: boolean;

  /** Event ID (if processed) */
  eventId?: string;

  /** Processing note */
  note?: string;
}
