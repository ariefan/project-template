/**
 * ============================================================================
 * SUBSCRIPTION MODEL
 * ============================================================================
 *
 * Organization subscriptions - the core billing entity.
 * Tracks subscription status, billing periods, and payment provider references.
 *
 * One subscription per organization per application.
 *
 * ============================================================================
 */

import "../common/responses.tsp";
import "./subscription-plan.tsp";

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Subscription status
 */
enum SubscriptionStatus {
  /** In trial period */
  trialing: "trialing",

  /** Active paid subscription */
  active: "active",

  /** Payment failed, in grace period */
  past_due: "past_due",

  /** Canceled, access until period end */
  canceled: "canceled",

  /** Paused by customer */
  paused: "paused",

  /** Trial or subscription ended */
  expired: "expired",
}

// ============================================================================
// MAIN MODEL
// ============================================================================

/**
 * Organization subscription
 *
 * Represents an active subscription for an organization.
 */
model Subscription {
  /** Unique subscription identifier (format: sub_abc123) */
  @example("sub_abc123")
  id: string;

  /** Organization ID */
  @example("org_xyz789")
  organizationId: string;

  /** Application ID */
  @example("app_main")
  applicationId: string;

  /** Current plan ID */
  @example("plan_basic_monthly")
  planId: string;

  /** Subscription status */
  status: SubscriptionStatus;

  /** Trial start date */
  trialStartsAt?: utcDateTime;

  /** Trial end date */
  trialEndsAt?: utcDateTime;

  /** Current billing period start */
  currentPeriodStart: utcDateTime;

  /** Current billing period end */
  currentPeriodEnd: utcDateTime;

  /** Applied coupon ID */
  @example("coupon_launch50")
  couponId?: string;

  /** Discount percentage (for percent coupons) */
  @example(20)
  @minValue(0)
  @maxValue(100)
  discountPercent?: int32;

  /** Discount amount in cents (for fixed coupons) */
  @example(50000)
  @minValue(0)
  discountAmountCents?: int32;

  /** Cancel at end of current period */
  cancelAtPeriodEnd: boolean;

  /** When subscription was canceled */
  canceledAt?: utcDateTime;

  /** Payment provider subscription ID (Xendit, Stripe, etc.) */
  providerSubscriptionId?: string;

  /** Payment provider customer ID */
  providerCustomerId?: string;

  /** When the subscription was created */
  createdAt: utcDateTime;

  /** When the subscription was last updated */
  updatedAt: utcDateTime;

  /** Nested plan details (populated when requested) */
  plan?: SubscriptionPlan;
}

// ============================================================================
// REQUEST MODELS
// ============================================================================

/**
 * Create subscription request
 */
model CreateSubscriptionRequest {
  /** Plan ID to subscribe to */
  @example("plan_basic_monthly")
  planId: string;

  /** Optional coupon code to apply */
  @example("LAUNCH50")
  @maxLength(50)
  couponCode?: string;

  /** Payment method ID (if already exists) */
  paymentMethodId?: string;

  /** Return URL after payment setup */
  returnUrl?: string;
}

/**
 * Update subscription request
 */
model UpdateSubscriptionRequest {
  /** New plan ID (for upgrade/downgrade) */
  @example("plan_pro_monthly")
  planId?: string;

  /** Cancel at end of period */
  cancelAtPeriodEnd?: boolean;
}

/**
 * Apply coupon request
 */
model ApplyCouponRequest {
  /** Coupon code to apply */
  @example("LAUNCH50")
  @minLength(1)
  @maxLength(50)
  couponCode: string;
}

/**
 * Cancel subscription request
 */
model CancelSubscriptionRequest {
  /** Cancel immediately (vs. at period end) */
  immediate?: boolean;

  /** Optional cancellation reason */
  @maxLength(500)
  reason?: string;
}

// ============================================================================
// RESPONSE MODELS
// ============================================================================

/**
 * Subscription response
 */
model SubscriptionResponse {
  data: Subscription;
  meta: ResponseMeta;
}

/**
 * Subscription list response
 */
model SubscriptionListResponse {
  data: Subscription[];
  pagination: Pagination;
  meta: ResponseMeta;
}

/**
 * Subscription creation response (with payment link)
 */
model CreateSubscriptionResponse {
  data: Subscription;

  /** Payment method linking URL (if payment setup required) */
  linkingUrl?: string;

  meta: ResponseMeta;
}
