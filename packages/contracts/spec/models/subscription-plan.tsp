/**
 * ============================================================================
 * SUBSCRIPTION PLAN MODEL
 * ============================================================================
 *
 * Defines subscription pricing plans and tiers.
 * Plans define what's offered to customers - the "product catalog".
 *
 * ============================================================================
 */

import "../common/responses.tsp";

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Billing period for subscription plans
 */
enum PlanBillingPeriod {
  /** Monthly recurring billing */
  monthly: "monthly",

  /** Yearly recurring billing */
  yearly: "yearly",
}

/**
 * Plan visibility level
 */
enum PlanVisibility {
  /** Public plans shown on pricing page */
  public: "public",

  /** Private/custom plans (enterprise) */
  private: "private",

  /** Archived plans no longer offered */
  archived: "archived",
}

// ============================================================================
// NESTED MODELS
// ============================================================================

/**
 * Plan feature configuration
 */
model PlanFeatures {
  /** Maximum users allowed (-1 = unlimited) */
  maxUsers?: int32;

  /** Maximum locations allowed (-1 = unlimited) */
  maxLocations?: int32;

  /** Maximum storage in GB (-1 = unlimited) */
  maxStorageGb?: int32;

  /** Access to advanced reporting */
  advancedReporting?: boolean;

  /** API access enabled */
  apiAccess?: boolean;

  /** Custom branding enabled */
  customBranding?: boolean;

  /** Priority support */
  prioritySupport?: boolean;
}

// ============================================================================
// MAIN MODEL
// ============================================================================

/**
 * Subscription plan
 *
 * Represents a pricing tier with features and limits.
 */
model SubscriptionPlan {
  /** Unique plan identifier (format: plan_basic_monthly) */
  @example("plan_basic_monthly")
  id: string;

  /** Application this plan belongs to */
  @example("app_main")
  applicationId: string;

  /** Plan display name */
  @example("Professional")
  @minLength(1)
  @maxLength(100)
  name: string;

  /** URL-friendly slug */
  @example("professional")
  @minLength(1)
  @maxLength(50)
  slug: string;

  /** Plan description */
  @example("Perfect for growing teams")
  @maxLength(500)
  description?: string;

  /** Price in smallest currency unit (cents for USD, sen for IDR) */
  @example(100000)
  @minValue(0)
  priceCents: int32;

  /** Currency code */
  @example("IDR")
  currency: string;

  /** Billing period */
  billingPeriod: PlanBillingPeriod;

  /** Trial period in days (0 = no trial) */
  @example(14)
  @minValue(0)
  trialDays?: int32;

  /** Plan features and limits */
  features?: PlanFeatures;

  /** Additional metadata */
  metadata?: Record<unknown> | null;

  /** Sort order for display */
  @example(1)
  sortOrder?: int32;

  /** Visibility level */
  visibility: PlanVisibility;

  /** Whether plan is active */
  isActive: boolean;

  /** Whether to show "Popular" badge */
  isPopular?: boolean;

  /** When the plan was created */
  createdAt: utcDateTime;

  /** When the plan was last updated */
  updatedAt: utcDateTime;
}

// ============================================================================
// REQUEST MODELS
// ============================================================================

/**
 * Create subscription plan request
 */
model CreatePlanRequest {
  /** Application ID */
  @example("app_main")
  applicationId: string;

  /** Plan name */
  @minLength(1)
  @maxLength(100)
  name: string;

  /** Plan slug */
  @minLength(1)
  @maxLength(50)
  slug: string;

  /** Plan description */
  @maxLength(500)
  description?: string;

  /** Price in cents */
  @minValue(0)
  priceCents: int32;

  /** Currency code */
  @example("IDR")
  currency?: string;

  /** Billing period */
  billingPeriod: PlanBillingPeriod;

  /** Trial days */
  @minValue(0)
  trialDays?: int32;

  /** Features */
  features?: PlanFeatures;

  /** Metadata */
  metadata?: Record<unknown>;

  /** Sort order */
  sortOrder?: int32;

  /** Visibility */
  visibility?: PlanVisibility;

  /** Is active */
  isActive?: boolean;

  /** Is popular */
  isPopular?: boolean;
}

/**
 * Update subscription plan request
 */
model UpdatePlanRequest {
  /** Plan name */
  @minLength(1)
  @maxLength(100)
  name?: string;

  /** Plan slug */
  @minLength(1)
  @maxLength(50)
  slug?: string;

  /** Plan description */
  @maxLength(500)
  description?: string;

  /** Price in cents */
  @minValue(0)
  priceCents?: int32;

  /** Currency code */
  currency?: string;

  /** Billing period */
  billingPeriod?: PlanBillingPeriod;

  /** Trial days */
  @minValue(0)
  trialDays?: int32;

  /** Features */
  features?: PlanFeatures;

  /** Metadata */
  metadata?: Record<unknown>;

  /** Sort order */
  sortOrder?: int32;

  /** Visibility */
  visibility?: PlanVisibility;

  /** Is active */
  isActive?: boolean;

  /** Is popular */
  isPopular?: boolean;
}

// ============================================================================
// RESPONSE MODELS
// ============================================================================

/**
 * Subscription plan response
 */
model PlanResponse {
  data: SubscriptionPlan;
  meta: ResponseMeta;
}

/**
 * Subscription plan list response
 */
model PlanListResponse {
  data: SubscriptionPlan[];
  pagination: Pagination;
  meta: ResponseMeta;
}
