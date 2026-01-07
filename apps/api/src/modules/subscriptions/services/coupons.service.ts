import { generateId } from "../../../lib/response";
import * as couponsRepo from "../repositories/coupons.repository";
import * as plansRepo from "../repositories/plans.repository";

export interface CreateCouponInput {
  code: string;
  name?: string;
  type: "fixed" | "percent" | "trial_extension";
  percentOff?: number;
  amountOffCents?: number;
  trialExtensionDays?: number;
  isActive?: boolean;
  startsAt?: Date;
  expiresAt?: Date;
  maxRedemptions?: number;
  firstTimeOnly?: boolean;
  planIds?: string;
}

export interface UpdateCouponInput {
  name?: string;
  percentOff?: number;
  amountOffCents?: number;
  trialExtensionDays?: number;
  isActive?: boolean;
  startsAt?: Date;
  expiresAt?: Date;
  maxRedemptions?: number;
  firstTimeOnly?: boolean;
  planIds?: string;
}

/**
 * Create a new coupon
 */
export async function createCoupon(input: CreateCouponInput) {
  const couponId = generateId("coupon");

  // Validate coupon type and required fields
  if (input.type === "percent" && !input.percentOff) {
    throw new Error("Percent coupons require percentOff value");
  }
  if (input.type === "fixed" && !input.amountOffCents) {
    throw new Error("Fixed coupons require amountOffCents value");
  }
  if (input.type === "trial_extension" && !input.trialExtensionDays) {
    throw new Error("Trial extension coupons require trialExtensionDays value");
  }

  const coupon = await couponsRepo.createCoupon({
    id: couponId,
    code: input.code.toUpperCase(),
    name: input.name,
    type: input.type,
    percentOff: input.percentOff,
    amountOffCents: input.amountOffCents,
    trialExtensionDays: input.trialExtensionDays,
    isActive: input.isActive ?? true,
    startsAt: input.startsAt,
    expiresAt: input.expiresAt,
    maxRedemptions: input.maxRedemptions,
    currentRedemptions: 0,
    firstTimeOnly: input.firstTimeOnly ?? false,
    planIds: input.planIds,
  });

  return coupon;
}

/**
 * Get coupon by ID
 */
export async function getCoupon(couponId: string) {
  const coupon = await couponsRepo.getCouponById(couponId);
  if (!coupon) {
    throw new Error("Coupon not found");
  }
  return coupon;
}

/**
 * List coupons
 */
export function listCoupons(options: couponsRepo.ListCouponsOptions = {}) {
  return couponsRepo.listCoupons(options);
}

/**
 * Update coupon
 */
export async function updateCoupon(couponId: string, input: UpdateCouponInput) {
  const existingCoupon = await couponsRepo.getCouponById(couponId);
  if (!existingCoupon) {
    throw new Error("Coupon not found");
  }

  const coupon = await couponsRepo.updateCoupon(couponId, input);
  if (!coupon) {
    throw new Error("Failed to update coupon");
  }

  return coupon;
}

/**
 * Delete coupon (soft delete by deactivating)
 */
export async function deleteCoupon(couponId: string) {
  const existingCoupon = await couponsRepo.getCouponById(couponId);
  if (!existingCoupon) {
    throw new Error("Coupon not found");
  }

  const coupon = await couponsRepo.deleteCoupon(couponId);
  if (!coupon) {
    throw new Error("Failed to delete coupon");
  }

  return {
    id: coupon.id,
    deletedAt: coupon.updatedAt,
    canRestore: true,
  };
}

/**
 * Validate coupon for a specific plan
 */
export async function validateCoupon(code: string, planId: string) {
  // Verify plan exists
  const plan = await plansRepo.getPlanById(planId);
  if (!plan) {
    return {
      valid: false,
      message: "Plan not found",
    };
  }

  const result = await couponsRepo.isValidCoupon(code, planId);

  if (!result.valid) {
    return {
      valid: false,
      message: result.reason,
    };
  }

  // Calculate discount amount
  let discountAmount = 0;
  if (result.coupon) {
    if (result.coupon.type === "percent" && result.coupon.percentOff) {
      discountAmount = Math.floor(
        (plan.priceCents * result.coupon.percentOff) / 100
      );
    } else if (result.coupon.type === "fixed" && result.coupon.amountOffCents) {
      discountAmount = Math.min(result.coupon.amountOffCents, plan.priceCents);
    }
  }

  return {
    valid: true,
    coupon: result.coupon,
    discountAmount,
    message: `Coupon is valid. ${discountAmount > 0 ? `${result.coupon?.percentOff || ""}% discount applied.` : ""}`,
  };
}
