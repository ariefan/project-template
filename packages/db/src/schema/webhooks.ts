import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// ============ ENUMS ============

/**
 * Webhook delivery status
 * - pending: Delivery created, waiting to be sent
 * - delivered: Successfully delivered (2xx response)
 * - failed: Delivery attempt failed, may retry
 * - exhausted: All retry attempts exhausted
 */
export const webhookDeliveryStatusEnum = pgEnum("webhook_delivery_status", [
  "pending",
  "delivered",
  "failed",
  "exhausted",
]);

// ============ WEBHOOKS TABLE ============

/**
 * Webhooks configuration table
 *
 * Stores webhook endpoint configurations for organizations.
 * Each webhook subscribes to specific event types and receives
 * HTTP POST notifications when those events occur.
 */
export const webhooks = pgTable(
  "webhooks",
  {
    id: text("id").primaryKey(), // format: whk_{randomString}
    orgId: text("org_id").notNull(), // Multi-tenancy

    // Configuration
    name: text("name").notNull(),
    url: text("url").notNull(), // HTTPS endpoint
    secret: text("secret").notNull(), // HMAC signing key (whsec_xxx)
    events: text("events").array().notNull(), // Subscribed event types

    // Status
    isActive: boolean("is_active").notNull().default(true),
    description: text("description"),

    // Audit
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("webhooks_org_id_idx").on(table.orgId),
    index("webhooks_is_active_idx").on(table.isActive),
  ]
);

// ============ WEBHOOK DELIVERIES TABLE ============

/**
 * Webhook deliveries table
 *
 * Tracks individual delivery attempts for each webhook event.
 * Supports retry with exponential backoff per API Guide:
 * 1min, 5min, 30min, 2hr, 6hr, 24hr
 */
export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: text("id").primaryKey(), // format: whd_{randomString}
    webhookId: text("webhook_id")
      .notNull()
      .references(() => webhooks.id, { onDelete: "cascade" }),

    // Event info
    eventId: text("event_id").notNull(), // format: wh_evt_{randomString}
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull().$type<Record<string, unknown>>(),

    // Delivery status
    status: webhookDeliveryStatusEnum("status").notNull().default("pending"),
    statusCode: integer("status_code"), // HTTP response code
    responseBody: text("response_body"), // Truncated to 1KB

    // Retry tracking (API Guide: 7 attempts total)
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(7),
    nextRetryAt: timestamp("next_retry_at"),

    // Timing
    deliveredAt: timestamp("delivered_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("webhook_deliveries_webhook_id_idx").on(table.webhookId),
    index("webhook_deliveries_status_idx").on(table.status),
    index("webhook_deliveries_event_type_idx").on(table.eventType),
    index("webhook_deliveries_created_at_idx").on(table.createdAt),
    index("webhook_deliveries_next_retry_at_idx").on(table.nextRetryAt),
  ]
);

// ============ TYPE EXPORTS ============

export type WebhookRow = typeof webhooks.$inferSelect;
export type NewWebhookRow = typeof webhooks.$inferInsert;
export type WebhookDeliveryRow = typeof webhookDeliveries.$inferSelect;
export type NewWebhookDeliveryRow = typeof webhookDeliveries.$inferInsert;
export type WebhookDeliveryStatus =
  (typeof webhookDeliveryStatusEnum.enumValues)[number];
