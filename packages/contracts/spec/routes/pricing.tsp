/**
 * ============================================================================
 * PRICING ROUTES - Public Pricing Information
 * ============================================================================
 *
 * Public endpoints for viewing available subscription plans.
 * No authentication required.
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
 * Public Pricing API
 *
 * View available subscription plans (public pricing page).
 */
@route("/v1/pricing")
@tag("Subscriptions")
interface PublicPricing {
  /**
   * List public plans
   *
   * Returns all public, active subscription plans.
   * Used for the public pricing page.
   */
  @route("/plans")
  @get
  @summary("List public subscription plans")
  listPublicPlans(
    /** Filter by application ID */
    @query applicationId?: string,

    /** Filter by billing period */
    @query billingPeriod?: PlanBillingPeriod,

    /** Include popular badge */
    @query includePopular?: boolean = true
  ): PlanListResponse | ErrorResponse;
}
