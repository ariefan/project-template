import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { applications } from "./applications";

// ============================================================================
// ENUMS
// ============================================================================

export const planBillingPeriodEnum = pgEnum("plan_billing_period", [
  "monthly",
  "yearly",
]);

export const planVisibilityEnum = pgEnum("plan_visibility", [
  "public", // Shown on pricing page
  "private", // Custom/enterprise plans
  "archived", // No longer offered
]);

// ============================================================================
// SUBSCRIPTION PLANS
// ============================================================================

/**
 * Plans define what's offered to customers
 * This is the "product catalog" - what customers can subscribe to
 */
export const plans = pgTable(
  "plans",
  {
    id: text("id").primaryKey(), // plan_basic_monthly, plan_pro_yearly

    // Multi-app support
    applicationId: text("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),

    // Plan details
    name: text("name").notNull(), // "Basic", "Professional", "Enterprise"
    slug: text("slug").notNull(), // "basic", "professional", "enterprise"
    description: text("description"),

    // Pricing (store in smallest currency unit - cents for USD, sen for IDR)
    priceCents: integer("price_cents").notNull(), // 0 for free plans
    currency: text("currency").notNull().default("IDR"),
    billingPeriod: planBillingPeriodEnum("billing_period").notNull(),

    // Trial configuration
    trialDays: integer("trial_days").default(0), // 0 = no trial

    // Plan features as JSON for flexibility
    features: jsonb("features").$type<{
      // Core limits
      maxUsers?: number; // -1 = unlimited
      maxLocations?: number;
      maxStorageGb?: number;

      // Feature flags
      advancedReporting?: boolean;
      apiAccess?: boolean;
      customBranding?: boolean;
      prioritySupport?: boolean;

      // Add more as needed
      [key: string]: unknown;
    }>(),

    // Metadata
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    // Display order and visibility
    sortOrder: integer("sort_order").default(0),
    visibility: planVisibilityEnum("visibility").default("public"),
    isActive: boolean("is_active").default(true),

    // Popular badge
    isPopular: boolean("is_popular").default(false),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    // Unique plan slug per app + billing period
    uniqueIndex("plans_app_slug_period_uidx").on(
      table.applicationId,
      table.slug,
      table.billingPeriod
    ),
    index("plans_application_id_idx").on(table.applicationId),
    index("plans_visibility_idx").on(table.visibility),
    index("plans_is_active_idx").on(table.isActive),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const plansRelations = relations(plans, ({ one }) => ({
  application: one(applications, {
    fields: [plans.applicationId],
    references: [applications.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type PlanRow = typeof plans.$inferSelect;
export type NewPlanRow = typeof plans.$inferInsert;
export type PlanBillingPeriod =
  (typeof planBillingPeriodEnum.enumValues)[number];
export type PlanVisibility = (typeof planVisibilityEnum.enumValues)[number];
