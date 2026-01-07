import { relations } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { subscriptions } from "./saas-subscriptions";

// ============================================================================
// ENUMS
// ============================================================================

export const paymentEventTypeEnum = pgEnum("payment_event_type", [
  "payment.success",
  "payment.failed",
  "subscription.created",
  "subscription.updated",
  "subscription.canceled",
  "invoice.created",
  "invoice.paid",
  "recurring.cycle.succeeded",
  "recurring.cycle.failed",
  "recurring.cycle.retrying",
]);

export const paymentEventStatusEnum = pgEnum("payment_event_status", [
  "succeeded",
  "pending",
  "failed",
  "processing",
]);

// ============================================================================
// PAYMENT EVENTS
// ============================================================================

/**
 * Payment webhook events from payment providers (Xendit, Stripe, etc.)
 * Used for audit trail and debugging payment issues
 */
export const paymentEvents = pgTable(
  "payment_events",
  {
    id: text("id").primaryKey(), // evt_xxx

    // Subscription reference
    subscriptionId: text("subscription_id")
      .notNull()
      .references(() => subscriptions.id, { onDelete: "cascade" }),

    // Provider details
    provider: text("provider").notNull(), // "xendit", "stripe", "midtrans"
    providerEventId: text("provider_event_id"), // For idempotency checking

    // Event details
    eventType: paymentEventTypeEnum("event_type").notNull(),
    status: paymentEventStatusEnum("status").notNull(),

    // Payment details
    amount: integer("amount"), // In cents/sen
    currency: text("currency").default("IDR"),

    // Provider references
    providerCycleId: text("provider_cycle_id"),
    providerInvoiceId: text("provider_invoice_id"),

    // Raw webhook payload for debugging
    rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>(),

    // Error tracking
    errorCode: text("error_code"),
    errorMessage: text("error_message"),

    // Processing timestamp
    processedAt: timestamp("processed_at"),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("payment_events_provider_event_id_uidx").on(
      table.providerEventId
    ),
    index("payment_events_subscription_id_idx").on(table.subscriptionId),
    index("payment_events_event_type_idx").on(table.eventType),
    index("payment_events_created_at_idx").on(table.createdAt),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const paymentEventsRelations = relations(paymentEvents, ({ one }) => ({
  subscription: one(subscriptions, {
    fields: [paymentEvents.subscriptionId],
    references: [subscriptions.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type PaymentEventRow = typeof paymentEvents.$inferSelect;
export type NewPaymentEventRow = typeof paymentEvents.$inferInsert;
export type PaymentEventType = (typeof paymentEventTypeEnum.enumValues)[number];
export type PaymentEventStatus =
  (typeof paymentEventStatusEnum.enumValues)[number];
