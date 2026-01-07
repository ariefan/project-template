/**
 * ============================================================================
 * COUPON MODEL
 * ============================================================================
 *
 * Discount coupons for promotional offers.
 * Supports percentage discounts, fixed amounts, and trial extensions.
 *
 * ============================================================================
 */

import "../common/responses.tsp";

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Coupon discount type
 */
enum CouponType {
  /** Percentage discount (e.g., 20% off) */
  percent: "percent",

  /** Fixed amount discount (e.g., $50 off) */
  fixed: "fixed",

  /** Extend trial period by X days */
  trial_extension: "trial_extension",
}

// ============================================================================
// MAIN MODEL
// ============================================================================

/**
 * Discount coupon
 *
 * Represents a promotional discount code.
 */
model Coupon {
  /** Unique coupon identifier (format: coupon_abc123) */
  @example("coupon_launch50")
  id: string;

  /** Coupon code that users enter */
  @example("LAUNCH50")
  @minLength(1)
  @maxLength(50)
  code: string;

  /** Internal name for reference */
  @example("Launch Promotion 50% Off")
  @maxLength(200)
  name?: string;

  /** Discount type */
  type: CouponType;

  /** Percentage off (for percent type, 1-100) */
  @example(20)
  @minValue(1)
  @maxValue(100)
  percentOff?: int32;

  /** Amount off in cents (for fixed type) */
  @example(50000)
  @minValue(1)
  amountOffCents?: int32;

  /** Trial extension in days (for trial_extension type) */
  @example(7)
  @minValue(1)
  trialExtensionDays?: int32;

  /** Whether coupon is active */
  isActive: boolean;

  /** When coupon becomes valid */
  startsAt?: utcDateTime;

  /** When coupon expires */
  expiresAt?: utcDateTime;

  /** Maximum number of redemptions (null = unlimited) */
  @example(100)
  @minValue(1)
  maxRedemptions?: int32;

  /** Current redemption count */
  @example(5)
  @minValue(0)
  currentRedemptions: int32;

  /** Only valid for first-time customers */
  firstTimeOnly: boolean;

  /** Comma-separated plan IDs (null = all plans) */
  @example("plan_basic_monthly,plan_pro_monthly")
  planIds?: string;

  /** When the coupon was created */
  createdAt: utcDateTime;

  /** When the coupon was last updated */
  updatedAt: utcDateTime;
}

// ============================================================================
// REQUEST MODELS
// ============================================================================

/**
 * Create coupon request
 */
model CreateCouponRequest {
  /** Coupon code (uppercase recommended) */
  @minLength(1)
  @maxLength(50)
  code: string;

  /** Internal name */
  @maxLength(200)
  name?: string;

  /** Discount type */
  type: CouponType;

  /** Percentage off (required if type=percent) */
  @minValue(1)
  @maxValue(100)
  percentOff?: int32;

  /** Amount off in cents (required if type=fixed) */
  @minValue(1)
  amountOffCents?: int32;

  /** Trial extension days (required if type=trial_extension) */
  @minValue(1)
  trialExtensionDays?: int32;

  /** Is active */
  isActive?: boolean;

  /** Validity start */
  startsAt?: utcDateTime;

  /** Validity end */
  expiresAt?: utcDateTime;

  /** Max redemptions */
  @minValue(1)
  maxRedemptions?: int32;

  /** First-time only */
  firstTimeOnly?: boolean;

  /** Plan IDs (comma-separated) */
  planIds?: string;
}

/**
 * Update coupon request
 */
model UpdateCouponRequest {
  /** Internal name */
  @maxLength(200)
  name?: string;

  /** Percentage off */
  @minValue(1)
  @maxValue(100)
  percentOff?: int32;

  /** Amount off in cents */
  @minValue(1)
  amountOffCents?: int32;

  /** Trial extension days */
  @minValue(1)
  trialExtensionDays?: int32;

  /** Is active */
  isActive?: boolean;

  /** Validity start */
  startsAt?: utcDateTime;

  /** Validity end */
  expiresAt?: utcDateTime;

  /** Max redemptions */
  @minValue(1)
  maxRedemptions?: int32;

  /** First-time only */
  firstTimeOnly?: boolean;

  /** Plan IDs (comma-separated) */
  planIds?: string;
}

/**
 * Validate coupon request
 */
model ValidateCouponRequest {
  /** Coupon code to validate */
  @minLength(1)
  @maxLength(50)
  code: string;

  /** Plan ID to apply coupon to */
  @example("plan_basic_monthly")
  planId: string;
}

// ============================================================================
// RESPONSE MODELS
// ============================================================================

/**
 * Coupon response
 */
model CouponResponse {
  data: Coupon;
  meta: ResponseMeta;
}

/**
 * Coupon list response
 */
model CouponListResponse {
  data: Coupon[];
  pagination: Pagination;
  meta: ResponseMeta;
}

/**
 * Coupon validation response
 */
model ValidateCouponResponse {
  /** Whether the coupon is valid */
  valid: boolean;

  /** Coupon details (if valid) */
  coupon?: Coupon;

  /** Calculated discount amount in cents (if applicable) */
  @example(10000)
  discountAmount?: int32;

  /** Validation message */
  @example("Coupon is valid. 20% discount applied.")
  message?: string;
}
