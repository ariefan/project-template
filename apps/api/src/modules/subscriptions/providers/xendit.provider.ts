import crypto from "node:crypto";
import { env } from "../../../env";
import type {
  CustomerParams,
  PaymentProvider,
  ProviderSubscription,
  SubscriptionParams,
} from "./types";

export class XenditProvider implements PaymentProvider {
  readonly name = "xendit";

  getOrCreateCustomer(params: CustomerParams): Promise<{ id: string }> {
    // Placeholder implementation (based on original xendit.service.ts)
    console.log(
      "XenditProvider: Creating customer (placeholder):",
      params.referenceId
    );
    return Promise.resolve({
      id: `xendit_customer_${params.referenceId}`,
    });
  }

  createSubscription(
    params: SubscriptionParams
  ): Promise<ProviderSubscription> {
    console.log(
      "XenditProvider: Creating recurring plan (placeholder):",
      params.referenceId
    );

    // Logic from mapBillingPeriodToXendit
    const _interval = params.interval === "yearly" ? "YEAR" : "MONTH";

    return Promise.resolve({
      id: `xendit_plan_${params.referenceId}`,
      status: "ACTIVE",
    });
  }

  stopSubscription(id: string): Promise<void> {
    console.log("XenditProvider: Stopping plan (placeholder):", id);
    return Promise.resolve();
  }

  pauseSubscription(id: string): Promise<void> {
    console.log("XenditProvider: Pausing plan (placeholder):", id);
    return Promise.resolve();
  }

  resumeSubscription(id: string): Promise<void> {
    console.log("XenditProvider: Resuming plan (placeholder):", id);
    return Promise.resolve();
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!env.XENDIT_WEBHOOK_SECRET) {
      console.warn(
        "XENDIT_WEBHOOK_SECRET not configured, skipping verification"
      );
      return true;
    }

    try {
      const expectedSignature = crypto
        .createHmac("sha256", env.XENDIT_WEBHOOK_SECRET)
        .update(payload)
        .digest("hex");

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error(
        "XenditProvider: Failed to verify webhook signature:",
        error
      );
      return false;
    }
  }

  mapStatus(providerStatus: string): string {
    switch (providerStatus.toUpperCase()) {
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

  isAvailable(): boolean {
    return Boolean(env.XENDIT_SECRET_KEY);
  }
}
