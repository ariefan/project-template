/**
 * ============================================================================
 * COUPONS ROUTES - Admin Coupon Management
 * ============================================================================
 *
 * Admin endpoints for managing discount coupons.
 * Requires admin permissions.
 *
 * ============================================================================
 */

import "@typespec/http";
import "../common/responses.tsp";
import "../common/errors.tsp";
import "../models/coupon.tsp";

using TypeSpec.Http;

namespace ProjectAPI;

/**
 * Coupons Admin API
 *
 * Manage discount coupons and promotional offers.
 */
@route("/v1/admin/coupons")
@tag("Subscriptions")
interface CouponsAdmin {
  /**
   * List coupons
   *
   * Returns all coupons with optional filtering.
   */
  @get
  @summary("List coupons")
  list(
    /** Page number (1-indexed) */
    @query page?: int32 = 1,

    /** Number of items per page */
    @query pageSize?: int32 = 50,

    /** Filter by coupon type */
    @query type?: CouponType,

    /** Filter by active status */
    @query isActive?: boolean,

    /** Search by code */
    @query code?: string,

    /** Sort by field */
    @query sortBy?: string = "createdAt",

    /** Sort order */
    @query sortOrder?: string = "desc"
  ): CouponListResponse | ErrorResponse;

  /**
   * Get coupon
   *
   * Returns a single coupon by ID.
   */
  @route("/{couponId}")
  @get
  @summary("Get coupon")
  get(
    /** Coupon ID */
    @path couponId: string
  ): CouponResponse | ErrorResponse;

  /**
   * Create coupon
   *
   * Creates a new discount coupon.
   */
  @post
  @summary("Create coupon")
  create(
    /** Coupon details */
    @body request: CreateCouponRequest
  ): {
    /** HTTP 201 Created */
    @statusCode statusCode: 201;

    /** Created coupon */
    @body body: CouponResponse;
  } | ErrorResponse;

  /**
   * Update coupon
   *
   * Updates an existing coupon.
   */
  @route("/{couponId}")
  @patch(#{implicitOptionality: true})
  @summary("Update coupon")
  update(
    /** Coupon ID */
    @path couponId: string,

    /** Updated coupon details */
    @body request: UpdateCouponRequest
  ): CouponResponse | ErrorResponse;

  /**
   * Delete coupon
   *
   * Soft deletes a coupon (sets isActive to false).
   */
  @route("/{couponId}")
  @delete
  @summary("Delete coupon")
  delete(
    /** Coupon ID */
    @path couponId: string
  ): SoftDeleteResponse | ErrorResponse;
}
