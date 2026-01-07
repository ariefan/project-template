import crypto from "node:crypto";
import { env } from "../../../env";

// NOTE: This is a simplified Xendit service implementation.
// The actual Xendit SDK integration will be completed during testing phase.
// For now, we provide the interface and basic signature verification.

export interface CreateCustomerInput {
  referenceId: string; // organizationId
  email: string;
  givenNames?: string;
  surname?: string;
  mobile?: string;
}

export interface CreateRecurringPlanInput {
  referenceId: string; // subscriptionId
  customerId: string;
  currency: string;
  amount: number;
  interval: "DAY" | "WEEK" | "MONTH" | "YEAR";
  intervalCount: number;
  totalRecurrence?: number;
  description?: string;
  successReturnUrl?: string;
  failureReturnUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface RecurringPlanResponse {
  id: string;
  referenceId: string;
  customerId: string;
  recurringAction: string;
  currency: string;
  amount: number;
  status: string;
  created: string;
  updated: string;
  actions?: Array<{
    action: string;
    urlType: string;
    url: string;
  }>;
}

/**
 * Get or create a Xendit customer
 * TODO: Implement actual Xendit SDK integration
 */
export function getOrCreateCustomer(
  input: CreateCustomerInput
): Promise<{ id: string; referenceId: string }> {
  // Placeholder implementation
  // In production, this would call the Xendit API
  console.log("Creating Xendit customer (placeholder):", input.referenceId);

  return Promise.resolve({
    id: `xendit_customer_${input.referenceId}`,
    referenceId: input.referenceId,
  });
}

/**
 * Create a recurring payment plan
 * TODO: Implement actual Xendit SDK integration
 */
export function createRecurringPlan(
  input: CreateRecurringPlanInput
): Promise<RecurringPlanResponse> {
  // Placeholder implementation
  // In production, this would call the Xendit API
  console.log(
    "Creating Xendit recurring plan (placeholder):",
    input.referenceId
  );

  return Promise.resolve({
    id: `xendit_plan_${input.referenceId}`,
    referenceId: input.referenceId,
    customerId: input.customerId,
    recurringAction: "PAYMENT",
    currency: input.currency,
    amount: input.amount,
    status: "ACTIVE",
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  });
}

/**
 * Stop a recurring payment plan
 * TODO: Implement actual Xendit SDK integration
 */
export function stopRecurringPlan(planId: string): Promise<void> {
  console.log("Stopping Xendit recurring plan (placeholder):", planId);
  // In production, this would call the Xendit API
  return Promise.resolve();
}

/**
 * Pause a recurring payment plan
 * TODO: Implement actual Xendit SDK integration
 */
export function pauseRecurringPlan(planId: string): Promise<void> {
  console.log("Pausing Xendit recurring plan (placeholder):", planId);
  // In production, this would call the Xendit API
  return Promise.resolve();
}

/**
 * Resume a recurring payment plan
 * TODO: Implement actual Xendit SDK integration
 */
export function resumeRecurringPlan(planId: string): Promise<void> {
  console.log("Resuming Xendit recurring plan (placeholder):", planId);
  // In production, this would call the Xendit API
  return Promise.resolve();
}

/**
 * Get recurring payment plan details
 * TODO: Implement actual Xendit SDK integration
 */
export function getRecurringPlan(
  planId: string
): Promise<RecurringPlanResponse> {
  console.log("Getting Xendit recurring plan (placeholder):", planId);

  return Promise.resolve({
    id: planId,
    referenceId: "",
    customerId: "",
    recurringAction: "PAYMENT",
    currency: "IDR",
    amount: 0,
    status: "ACTIVE",
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  });
}

/**
 * Verify Xendit webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  receivedSignature: string
): boolean {
  if (!env.XENDIT_WEBHOOK_SECRET) {
    console.warn(
      "XENDIT_WEBHOOK_SECRET is not configured, skipping verification"
    );
    return true; // In development, allow without verification
  }

  try {
    const expectedSignature = crypto
      .createHmac("sha256", env.XENDIT_WEBHOOK_SECRET)
      .update(payload)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(receivedSignature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error("Failed to verify webhook signature:", error);
    return false;
  }
}

/**
 * Map billing period to Xendit interval
 */
export function mapBillingPeriodToXendit(billingPeriod: string): {
  interval: "DAY" | "WEEK" | "MONTH" | "YEAR";
  intervalCount: number;
} {
  switch (billingPeriod) {
    case "monthly":
      return { interval: "MONTH", intervalCount: 1 };
    case "yearly":
      return { interval: "YEAR", intervalCount: 1 };
    default:
      return { interval: "MONTH", intervalCount: 1 };
  }
}

/**
 * Map Xendit status to our subscription status
 */
export function mapXenditStatusToLocal(xenditStatus: string): string {
  switch (xenditStatus.toUpperCase()) {
    case "ACTIVE":
      return "active";
    case "PAUSED":
      return "paused";
    case "STOPPED":
    case "COMPLETED":
      return "canceled";
    case "PENDING":
      return "trialing";
    default:
      return "active";
  }
}

/**
 * Check if Xendit is configured and available
 */
export function isXenditAvailable(): boolean {
  return Boolean(env.XENDIT_SECRET_KEY);
}
