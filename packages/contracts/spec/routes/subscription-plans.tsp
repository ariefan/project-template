/**
 * ============================================================================
 * SUBSCRIPTION PLANS ROUTES - Admin Plan Management
 * ============================================================================
 *
 * Admin endpoints for managing subscription plans.
 * Requires admin permissions.
 *
 * ============================================================================
 */

import "@typespec/http";
import "../common/responses.tsp";
import "../common/errors.tsp";
import "../models/subscription-plan.tsp";

using TypeSpec.Http;

namespace ProjectAPI;

/**
 * Subscription Plans Admin API
 *
 * Manage subscription plans and pricing tiers.
 */
@route("/v1/admin/plans")
@tag("Subscriptions")
interface SubscriptionPlansAdmin {
  /**
   * List subscription plans
   *
   * Returns all plans with optional filtering.
   * Admin endpoint - returns all plans including archived.
   */
  @get
  @summary("List subscription plans")
  list(
    /** Page number (1-indexed) */
    @query page?: int32 = 1,

    /** Number of items per page */
    @query pageSize?: int32 = 50,

    /** Filter by application ID */
    @query applicationId?: string,

    /** Filter by visibility */
    @query visibility?: PlanVisibility,

    /** Filter by active status */
    @query isActive?: boolean,

    /** Filter by billing period */
    @query billingPeriod?: PlanBillingPeriod,

    /** Sort by field */
    @query sortBy?: string = "sortOrder",

    /** Sort order */
    @query sortOrder?: string = "asc"
  ): PlanListResponse | ErrorResponse;

  /**
   * Get subscription plan
   *
   * Returns a single plan by ID.
   */
  @route("/{planId}")
  @get
  @summary("Get subscription plan")
  get(
    /** Plan ID */
    @path planId: string
  ): PlanResponse | ErrorResponse;

  /**
   * Create subscription plan
   *
   * Creates a new subscription plan.
   */
  @post
  @summary("Create subscription plan")
  create(
    /** Plan details */
    @body request: CreatePlanRequest
  ): {
    /** HTTP 201 Created */
    @statusCode statusCode: 201;

    /** Created plan */
    @body body: PlanResponse;
  } | ErrorResponse;

  /**
   * Update subscription plan
   *
   * Updates an existing subscription plan.
   * Warning: Changing pricing affects future billing only.
   */
  @route("/{planId}")
  @patch(#{implicitOptionality: true})
  @summary("Update subscription plan")
  update(
    /** Plan ID */
    @path planId: string,

    /** Updated plan details */
    @body request: UpdatePlanRequest
  ): PlanResponse | ErrorResponse;

  /**
   * Delete subscription plan
   *
   * Soft deletes a plan (sets visibility to archived).
   * Plans with active subscriptions cannot be hard deleted.
   */
  @route("/{planId}")
  @delete
  @summary("Delete subscription plan")
  delete(
    /** Plan ID */
    @path planId: string
  ): SoftDeleteResponse | ErrorResponse;
}
