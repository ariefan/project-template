/**
 * ============================================================================
 * SUBSCRIPTIONS ROUTES - User Subscription Management
 * ============================================================================
 *
 * Manage organization subscriptions.
 * Users can view, create, update, and cancel their subscriptions.
 *
 * ============================================================================
 */

import "@typespec/http";
import "../common/responses.tsp";
import "../common/errors.tsp";
import "../models/subscription.tsp";
import "../models/coupon.tsp";

using TypeSpec.Http;

namespace ProjectAPI;

/**
 * Subscriptions API
 *
 * Manage subscriptions for organizations.
 */
@route("/v1/orgs/{orgId}/subscriptions")
@tag("Subscriptions")
interface Subscriptions {
  /**
   * Get current subscription
   *
   * Returns the active subscription for the organization and application.
   */
  @route("/current")
  @get
  @summary("Get current subscription")
  getCurrent(
    /** Organization ID */
    @path orgId: string,

    /** Application ID */
    @query applicationId: string
  ): SubscriptionResponse | ErrorResponse;

  /**
   * Create subscription
   *
   * Creates a new subscription for the organization.
   * Starts trial if configured, otherwise requires payment.
   */
  @post
  @summary("Create subscription")
  create(
    /** Organization ID */
    @path orgId: string,

    /** Subscription details */
    @body request: CreateSubscriptionRequest
  ): {
    /** HTTP 201 Created */
    @statusCode statusCode: 201;

    /** Created subscription with payment link */
    @body body: CreateSubscriptionResponse;
  } | ErrorResponse;

  /**
   * Update subscription
   *
   * Update subscription (change plan, update settings).
   * Plan changes may be immediate or scheduled for period end.
   */
  @route("/{subscriptionId}")
  @patch(#{implicitOptionality: true})
  @summary("Update subscription")
  update(
    /** Organization ID */
    @path orgId: string,

    /** Subscription ID */
    @path subscriptionId: string,

    /** Update details */
    @body request: UpdateSubscriptionRequest
  ): SubscriptionResponse | ErrorResponse;

  /**
   * Cancel subscription
   *
   * Cancel the subscription.
   * By default, access continues until period end.
   */
  @route("/{subscriptionId}/cancel")
  @post
  @summary("Cancel subscription")
  cancel(
    /** Organization ID */
    @path orgId: string,

    /** Subscription ID */
    @path subscriptionId: string,

    /** Cancellation options */
    @body request?: CancelSubscriptionRequest
  ): SubscriptionResponse | ErrorResponse;

  /**
   * Resume subscription
   *
   * Reactivate a canceled subscription before it expires.
   */
  @route("/{subscriptionId}/resume")
  @post
  @summary("Resume subscription")
  resume(
    /** Organization ID */
    @path orgId: string,

    /** Subscription ID */
    @path subscriptionId: string
  ): SubscriptionResponse | ErrorResponse;

  /**
   * Apply coupon
   *
   * Apply a discount coupon to the subscription.
   */
  @route("/{subscriptionId}/coupon")
  @post
  @summary("Apply coupon")
  applyCoupon(
    /** Organization ID */
    @path orgId: string,

    /** Subscription ID */
    @path subscriptionId: string,

    /** Coupon details */
    @body request: ApplyCouponRequest
  ): SubscriptionResponse | ErrorResponse;

  /**
   * Validate coupon
   *
   * Check if a coupon code is valid for a plan.
   * Does not apply the coupon.
   */
  @route("/validate-coupon")
  @post
  @summary("Validate coupon")
  validateCoupon(
    /** Organization ID */
    @path orgId: string,

    /** Coupon validation details */
    @body request: ValidateCouponRequest
  ): ValidateCouponResponse | ErrorResponse;
}
