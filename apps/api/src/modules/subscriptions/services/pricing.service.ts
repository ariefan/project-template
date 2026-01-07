import * as couponsRepo from "../repositories/coupons.repository";
import * as plansRepo from "../repositories/plans.repository";

/**
 * Calculate final price after discount
 */
export function calculateFinalPrice(
  priceCents: number,
  discountPercent?: number,
  discountAmountCents?: number
): number {
  let finalPrice = priceCents;

  if (discountPercent) {
    finalPrice = Math.floor(priceCents * (1 - discountPercent / 100));
  }

  if (discountAmountCents) {
    finalPrice = Math.max(0, finalPrice - discountAmountCents);
  }

  return finalPrice;
}

/**
 * Calculate proration amount for plan changes
 */
export function calculateProration(
  currentPriceCents: number,
  newPriceCents: number,
  daysRemaining: number,
  totalDays: number
): number {
  // Calculate unused amount from current plan
  const unusedAmount = Math.floor(
    (currentPriceCents / totalDays) * daysRemaining
  );

  // Calculate prorated amount for new plan
  const proratedAmount = Math.floor(
    (newPriceCents / totalDays) * daysRemaining
  );

  // Return the difference (positive = customer pays more, negative = credit)
  return proratedAmount - unusedAmount;
}

/**
 * Get pricing details for a plan with optional coupon
 */
export async function getPlanPricing(planId: string, couponCode?: string) {
  const plan = await plansRepo.getPlanById(planId);
  if (!plan) {
    throw new Error("Plan not found");
  }

  let discountPercent: number | undefined;
  let discountAmountCents: number | undefined;
  let couponInfo:
    | Awaited<ReturnType<typeof couponsRepo.isValidCoupon>>["coupon"]
    | undefined;

  if (couponCode) {
    const result = await couponsRepo.isValidCoupon(couponCode, planId);
    if (result.valid && result.coupon) {
      couponInfo = result.coupon;
      if (result.coupon.type === "percent") {
        discountPercent = result.coupon.percentOff ?? undefined;
      } else if (result.coupon.type === "fixed") {
        discountAmountCents = result.coupon.amountOffCents ?? undefined;
      }
    }
  }

  const finalPrice = calculateFinalPrice(
    plan.priceCents,
    discountPercent,
    discountAmountCents
  );

  return {
    plan,
    pricing: {
      subtotal: plan.priceCents,
      discountPercent,
      discountAmountCents,
      total: finalPrice,
      currency: plan.currency,
    },
    coupon: couponInfo,
  };
}

/**
 * Calculate period end date
 */
export function calculatePeriodEnd(
  startDate: Date,
  billingPeriod: string,
  trialEndsAt?: Date | null
): Date {
  const effectiveStart =
    trialEndsAt && trialEndsAt > startDate ? trialEndsAt : startDate;
  const periodEnd = new Date(effectiveStart);

  if (billingPeriod === "monthly") {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  } else if (billingPeriod === "yearly") {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  }

  return periodEnd;
}
