import { env } from "../../../env";
import type { PaymentProvider } from "./types";
import { XenditProvider } from "./xendit.provider";

let instance: PaymentProvider | null = null;

function getProvider(): PaymentProvider {
  if (instance) {
    return instance;
  }

  const providerType = env.SUBSCRIPTION_PAYMENT_PROVIDER;

  if (providerType === "xendit") {
    instance = new XenditProvider();
  } else if (providerType === "stripe") {
    // For now, Stripe would throw or we can provide a placeholder
    // For this demo, we'll just keep it prepared for a StripeProvider
    throw new Error("Stripe provider not yet implemented");
  } else {
    instance = new XenditProvider();
  }

  return instance;
}

export { getProvider as paymentProviderFactory };

export const provider = getProvider();
