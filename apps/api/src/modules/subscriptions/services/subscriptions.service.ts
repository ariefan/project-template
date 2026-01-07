import type { CouponRow } from "@workspace/db/schema";
import { addDays } from "date-fns";
import { generateId } from "../../../lib/response";
import { provider } from "../providers/factory";
import * as couponsRepo from "../repositories/coupons.repository";
import * as plansRepo from "../repositories/plans.repository";
import * as subscriptionsRepo from "../repositories/subscriptions.repository";
import * as pricingService from "./pricing.service";

export interface CreateSubscriptionInput {
  organizationId: string;
  applicationId: string;
  planId: string;
  couponCode?: string;
  customerEmail: string;
  customerName?: string;
}

export interface UpdateSubscriptionInput {
  planId?: string;
  cancelAtPeriodEnd?: boolean;
}

/**
 * Get current subscription for an organization and app
 */
export async function getCurrentSubscription(orgId: string, appId: string) {
  const subscription = await subscriptionsRepo.getCurrentSubscriptionWithPlan(
    orgId,
    appId
  );

  if (!subscription) {
    return null;
  }

  return subscription;
}

/**
 * Process coupon validation and extract discount information
 */
async function processCoupon(couponCode: string, planId: string) {
  const validation = await couponsRepo.isValidCoupon(couponCode, planId);
  if (!validation.valid) {
    throw new Error(validation.reason || "Invalid coupon");
  }

  const coupon = validation.coupon;
  if (!coupon) {
    return {
      coupon: null,
      discountPercent: undefined,
      discountAmountCents: undefined,
    };
  }

  let discountPercent: number | undefined;
  let discountAmountCents: number | undefined;

  if (coupon.type === "percent") {
    discountPercent = coupon.percentOff ?? undefined;
  } else if (coupon.type === "fixed") {
    discountAmountCents = coupon.amountOffCents ?? undefined;
  }

  return { coupon, discountPercent, discountAmountCents };
}

/**
 * Calculate subscription trial and billing periods
 */
function calculateSubscriptionPeriods(plan: {
  trialDays: number | null;
  billingPeriod: string;
}): {
  trialStartsAt: Date | undefined;
  trialEndsAt: Date | undefined;
  status: "active" | "trialing";
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
} {
  const now = new Date();
  let trialStartsAt: Date | undefined;
  let trialEndsAt: Date | undefined;
  let status: "active" | "trialing" = "active";

  if (plan.trialDays && plan.trialDays > 0) {
    trialStartsAt = now;
    trialEndsAt = addDays(now, plan.trialDays);
    status = "trialing";
  }

  const currentPeriodStart = now;
  const currentPeriodEnd = pricingService.calculatePeriodEnd(
    now,
    plan.billingPeriod,
    trialEndsAt
  );

  return {
    trialStartsAt,
    trialEndsAt,
    status,
    currentPeriodStart,
    currentPeriodEnd,
  };
}

/**
 * Create a new subscription with Payment integration
 */
export async function createSubscription(input: CreateSubscriptionInput) {
  const subscriptionId = generateId("sub");

  // Get plan details
  const plan = await plansRepo.getPlanById(input.planId);
  if (!plan) {
    throw new Error("Plan not found");
  }

  // Check if org already has a subscription for this app
  const existing = await subscriptionsRepo.getCurrentSubscription(
    input.organizationId,
    input.applicationId
  );
  if (existing) {
    throw new Error(
      "Organization already has a subscription for this application"
    );
  }

  // Process coupon if provided
  let coupon: CouponRow | null = null;
  let discountPercent: number | undefined;
  let discountAmountCents: number | undefined;

  if (input.couponCode) {
    const couponResult = await processCoupon(input.couponCode, input.planId);
    coupon = couponResult.coupon;
    discountPercent = couponResult.discountPercent;
    discountAmountCents = couponResult.discountAmountCents;
  }

  // Calculate trial and billing periods
  const periods = calculateSubscriptionPeriods(plan);

  // Create subscription in database
  const subscription = await subscriptionsRepo.createSubscription({
    id: subscriptionId,
    organizationId: input.organizationId,
    applicationId: input.applicationId,
    planId: input.planId,
    status: periods.status,
    trialStartsAt: periods.trialStartsAt,
    trialEndsAt: periods.trialEndsAt,
    currentPeriodStart: periods.currentPeriodStart,
    currentPeriodEnd: periods.currentPeriodEnd,
    couponId: coupon?.id,
    discountPercent,
    discountAmountCents,
    cancelAtPeriodEnd: false,
  });

  // Increment coupon redemption if used
  if (coupon) {
    await couponsRepo.incrementCouponRedemptions(coupon.id);
  }

  // Create Provider customer and recurring payment if configured
  if (provider.isAvailable()) {
    try {
      // Create or get Provider customer
      const customer = await provider.getOrCreateCustomer({
        referenceId: input.organizationId,
        email: input.customerEmail,
        name: input.customerName,
      });

      // Calculate final amount after discount
      const finalAmount = pricingService.calculateFinalPrice(
        plan.priceCents,
        discountPercent,
        discountAmountCents
      );

      // Create recurring payment plan
      const recurringPlan = await provider.createSubscription({
        referenceId: subscriptionId,
        customerId: customer.id,
        currency: plan.currency,
        amount: finalAmount,
        interval: plan.billingPeriod as "monthly" | "yearly",
        planId: plan.id,
        planName: plan.name,
        metadata: {
          subscriptionId,
          organizationId: input.organizationId,
          applicationId: input.applicationId,
          planId: plan.id,
        },
      });

      // Update subscription with provider details
      await subscriptionsRepo.updateSubscription(subscriptionId, {
        providerSubscriptionId: recurringPlan.id,
        providerCustomerId: customer.id,
      });

      console.log(
        `Created ${provider.name} recurring plan ${recurringPlan.id} for subscription ${subscriptionId}`
      );
    } catch (error) {
      console.error(`Failed to create ${provider.name} payment plan:`, error);
      // Don't fail the subscription creation, but log the error
      // The subscription can still be used, but payment collection will need manual setup
    }
  }

  return subscription;
}

/**
 * Handle Provider plan change
 */
async function handleProviderPlanChange(
  subscriptionId: string,
  subscription: {
    providerSubscriptionId: string | null;
    providerCustomerId: string | null;
    organizationId: string;
    applicationId: string;
    discountPercent: number | null;
    discountAmountCents: number | null;
  },
  newPlan: {
    id: string;
    name: string;
    priceCents: number;
    currency: string;
    billingPeriod: string;
  }
) {
  if (!subscription.providerSubscriptionId) {
    return;
  }

  // Stop current plan
  await provider.stopSubscription(subscription.providerSubscriptionId);

  // Calculate final amount for new plan (with existing discount if any)
  const finalAmount = pricingService.calculateFinalPrice(
    newPlan.priceCents,
    subscription.discountPercent ?? undefined,
    subscription.discountAmountCents ?? undefined
  );

  // Create new recurring payment plan
  const recurringPlan = await provider.createSubscription({
    referenceId: subscriptionId,
    customerId: subscription.providerCustomerId ?? "",
    currency: newPlan.currency,
    amount: finalAmount,
    interval: newPlan.billingPeriod as "monthly" | "yearly",
    planId: newPlan.id,
    planName: newPlan.name,
    metadata: {
      subscriptionId,
      organizationId: subscription.organizationId,
      applicationId: subscription.applicationId,
      planId: newPlan.id,
    },
  });

  return recurringPlan.id;
}

/**
 * Update subscription (change plan)
 */
export async function updateSubscription(
  subscriptionId: string,
  input: UpdateSubscriptionInput
) {
  const subscription =
    await subscriptionsRepo.getSubscriptionById(subscriptionId);
  if (!subscription) {
    throw new Error("Subscription not found");
  }

  // If changing plan
  if (input.planId && input.planId !== subscription.planId) {
    const newPlan = await plansRepo.getPlanById(input.planId);
    if (!newPlan) {
      throw new Error("Plan not found");
    }

    // Handle Provider plan change
    if (provider.isAvailable() && subscription.providerSubscriptionId) {
      try {
        const newProviderSubscriptionId = await handleProviderPlanChange(
          subscriptionId,
          subscription,
          newPlan
        );

        // Update subscription with new plan and new provider recurring plan ID
        const updated = await subscriptionsRepo.updateSubscription(
          subscriptionId,
          {
            planId: input.planId,
            providerSubscriptionId: newProviderSubscriptionId,
          }
        );

        console.log(
          `Updated subscription ${subscriptionId} to plan ${input.planId}`
        );
        return updated;
      } catch (error) {
        console.error(`Failed to update ${provider.name} plan:`, error);
        throw new Error("Failed to update payment plan");
      }
    }

    // No provider integration, just update the plan
    const updated = await subscriptionsRepo.updateSubscription(subscriptionId, {
      planId: input.planId,
    });

    return updated;
  }

  // If updating cancelAtPeriodEnd
  if (input.cancelAtPeriodEnd !== undefined) {
    const updated = await subscriptionsRepo.updateSubscription(subscriptionId, {
      cancelAtPeriodEnd: input.cancelAtPeriodEnd,
      canceledAt: input.cancelAtPeriodEnd ? new Date() : null,
    });

    return updated;
  }

  return subscription;
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  immediate = false
) {
  const subscription =
    await subscriptionsRepo.getSubscriptionById(subscriptionId);
  if (!subscription) {
    throw new Error("Subscription not found");
  }

  if (immediate) {
    // Cancel immediately in provider
    if (provider.isAvailable() && subscription.providerSubscriptionId) {
      try {
        await provider.stopSubscription(subscription.providerSubscriptionId);
        console.log(
          `Stopped ${provider.name} plan ${subscription.providerSubscriptionId}`
        );
      } catch (error) {
        console.error(`Failed to stop ${provider.name} plan:`, error);
        // Continue with local cancellation even if provider fails
      }
    }

    const updated = await subscriptionsRepo.updateSubscription(subscriptionId, {
      status: "canceled",
      canceledAt: new Date(),
      cancelAtPeriodEnd: false,
    });

    return updated;
  }

  // Cancel at period end
  const updated = await subscriptionsRepo.updateSubscription(subscriptionId, {
    cancelAtPeriodEnd: true,
    canceledAt: new Date(),
  });

  return updated;
}

/**
 * Resume canceled subscription
 */
export async function resumeSubscription(subscriptionId: string) {
  const subscription =
    await subscriptionsRepo.getSubscriptionById(subscriptionId);
  if (!subscription) {
    throw new Error("Subscription not found");
  }

  if (!subscription.cancelAtPeriodEnd) {
    throw new Error("Subscription is not canceled");
  }

  // Resume in provider if available
  if (provider.isAvailable() && subscription.providerSubscriptionId) {
    try {
      await provider.resumeSubscription(subscription.providerSubscriptionId);
      console.log(
        `Resumed ${provider.name} plan ${subscription.providerSubscriptionId}`
      );
    } catch (error) {
      console.error(`Failed to resume ${provider.name} plan:`, error);
      throw new Error("Failed to resume payment plan");
    }
  }

  const updated = await subscriptionsRepo.updateSubscription(subscriptionId, {
    cancelAtPeriodEnd: false,
    canceledAt: null,
  });

  return updated;
}

/**
 * Apply coupon to subscription
 */
export async function applyCoupon(subscriptionId: string, couponCode: string) {
  const subscription =
    await subscriptionsRepo.getSubscriptionById(subscriptionId);
  if (!subscription) {
    throw new Error("Subscription not found");
  }

  // Validate coupon
  const validation = await couponsRepo.isValidCoupon(
    couponCode,
    subscription.planId
  );
  if (!validation.valid) {
    throw new Error(validation.reason || "Invalid coupon");
  }

  const coupon = validation.coupon;
  if (!coupon) {
    throw new Error("Coupon not found");
  }

  // Apply coupon
  let discountPercent: number | undefined;
  let discountAmountCents: number | undefined;

  if (coupon.type === "percent") {
    discountPercent = coupon.percentOff ?? undefined;
  } else if (coupon.type === "fixed") {
    discountAmountCents = coupon.amountOffCents ?? undefined;
  }

  const updated = await subscriptionsRepo.updateSubscription(subscriptionId, {
    couponId: coupon.id,
    discountPercent,
    discountAmountCents,
  });

  // Increment redemption count
  await couponsRepo.incrementCouponRedemptions(coupon.id);

  return updated;
}

/**
 * Check if an organization has access to a specific feature
 */
export async function checkFeatureAccess(
  orgId: string,
  appId: string,
  featureKey: string
): Promise<boolean> {
  const subscription = await getCurrentSubscription(orgId, appId);

  if (!subscription) {
    return false;
  }

  // Check if subscription is in a valid state
  const validStatuses = ["active", "trialing"];
  if (!validStatuses.includes(subscription.status)) {
    return false;
  }

  const plan = subscription.plan;
  if (!plan?.features) {
    return false;
  }

  const features = plan.features as Record<
    string,
    boolean | number | string | null | undefined
  >;
  const value = features[featureKey];

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0; // If limit is 0, no access
  }

  return false;
}

/**
 * Get all features and limits for an organization's current plan
 */
export async function getPlanFeatures(orgId: string, appId: string) {
  const subscription = await getCurrentSubscription(orgId, appId);

  if (!(subscription && ["active", "trialing"].includes(subscription.status))) {
    return {};
  }

  return (
    (subscription.plan?.features as Record<
      string,
      boolean | number | string | null | undefined
    >) || {}
  );
}
