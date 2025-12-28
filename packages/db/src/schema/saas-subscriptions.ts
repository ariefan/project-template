import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { applications } from "./applications";
import { organizations } from "./auth";
import { plans } from "./saas-plans";

// ============================================================================
// ENUMS
// ============================================================================

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trialing", // In trial period
  "active", // Active subscription
  "past_due", // Payment failed, grace period
  "canceled", // Canceled, end of period
  "paused", // Paused by customer
  "expired", // Trial or subscription ended
]);

export const couponTypeEnum = pgEnum("coupon_type", [
  "percent", // Percentage discount (e.g., 20%)
  "fixed", // Fixed amount (e.g., 50000 sen off)
  "trial_extension", // Extend trial by X days
]);

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

/**
 * Organization subscriptions - The core billing table
 * One subscription per organization per application
 */
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: text("id").primaryKey(), // sub_xxx

    // Multi-app + multi-tenant
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    applicationId: text("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),

    // Current plan
    planId: text("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "restrict" }),

    // Status
    status: subscriptionStatusEnum("status").notNull().default("trialing"),

    // Trial tracking
    trialStartsAt: timestamp("trial_starts_at"),
    trialEndsAt: timestamp("trial_ends_at"),

    // Billing period
    currentPeriodStart: timestamp("current_period_start").notNull(),
    currentPeriodEnd: timestamp("current_period_end").notNull(),

    // Applied coupon (if any)
    couponId: text("coupon_id"),
    discountPercent: integer("discount_percent"), // For percent coupons
    discountAmountCents: integer("discount_amount_cents"), // For fixed coupons

    // Cancellation
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
    canceledAt: timestamp("canceled_at"),

    // Payment gateway references (Stripe, Xendit, Midtrans, etc.)
    providerSubscriptionId: text("provider_subscription_id"),
    providerCustomerId: text("provider_customer_id"),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    // One subscription per org per app
    uniqueIndex("subscriptions_org_app_uidx").on(
      table.organizationId,
      table.applicationId
    ),
    index("subscriptions_organization_id_idx").on(table.organizationId),
    index("subscriptions_application_id_idx").on(table.applicationId),
    index("subscriptions_plan_id_idx").on(table.planId),
    index("subscriptions_status_idx").on(table.status),
    index("subscriptions_current_period_end_idx").on(table.currentPeriodEnd),
  ]
);

// ============================================================================
// COUPONS
// ============================================================================

/**
 * Discount coupons for promotional offers
 * Simple, flexible coupon system
 */
export const coupons = pgTable(
  "coupons",
  {
    id: text("id").primaryKey(), // coupon_xxx

    // Coupon code (what users enter)
    code: text("code").notNull().unique(), // "LAUNCH50", "BLACKFRIDAY"
    name: text("name"), // Internal name for reference

    // Discount type and amount
    type: couponTypeEnum("type").notNull(),
    percentOff: integer("percent_off"), // For percent type: 20 = 20% off
    amountOffCents: integer("amount_off_cents"), // For fixed type: amount in cents/sen
    trialExtensionDays: integer("trial_extension_days"), // For trial_extension type

    // Validity
    isActive: boolean("is_active").default(true),
    startsAt: timestamp("starts_at"),
    expiresAt: timestamp("expires_at"),

    // Usage limits
    maxRedemptions: integer("max_redemptions"), // null = unlimited
    currentRedemptions: integer("current_redemptions").default(0),

    // Restrictions
    firstTimeOnly: boolean("first_time_only").default(false), // Only for new customers
    planIds: text("plan_ids"), // Comma-separated plan IDs, null = all plans

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("coupons_code_uidx").on(table.code),
    index("coupons_is_active_idx").on(table.isActive),
    index("coupons_expires_at_idx").on(table.expiresAt),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  organization: one(organizations, {
    fields: [subscriptions.organizationId],
    references: [organizations.id],
  }),
  application: one(applications, {
    fields: [subscriptions.applicationId],
    references: [applications.id],
  }),
  plan: one(plans, {
    fields: [subscriptions.planId],
    references: [plans.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type SubscriptionRow = typeof subscriptions.$inferSelect;
export type NewSubscriptionRow = typeof subscriptions.$inferInsert;
export type CouponRow = typeof coupons.$inferSelect;
export type NewCouponRow = typeof coupons.$inferInsert;

export type SubscriptionStatus =
  (typeof subscriptionStatusEnum.enumValues)[number];
export type CouponType = (typeof couponTypeEnum.enumValues)[number];
