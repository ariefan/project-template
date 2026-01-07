export interface CustomerParams {
  referenceId: string;
  email: string;
  name?: string;
}

export interface SubscriptionParams {
  referenceId: string;
  customerId: string;
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  interval: "monthly" | "yearly";
  metadata?: Record<string, unknown>;
}

export interface ProviderSubscription {
  id: string;
  status: string;
}

export interface PaymentProvider {
  /**
   * Identifies the provider (e.g., 'xendit', 'stripe')
   */
  readonly name: string;

  /**
   * Get or create a customer in the provider's system
   */
  getOrCreateCustomer(params: CustomerParams): Promise<{ id: string }>;

  /**
   * Create a recurring subscription/plan
   */
  createSubscription(params: SubscriptionParams): Promise<ProviderSubscription>;

  /**
   * Stop/Cancel a subscription
   */
  stopSubscription(id: string): Promise<void>;

  /**
   * Pause a subscription
   */
  pauseSubscription(id: string): Promise<void>;

  /**
   * Resume a subscription
   */
  resumeSubscription(id: string): Promise<void>;

  /**
   * Verify the provider's webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean;

  /**
   * Map provider-specific status to internal status
   */
  mapStatus(providerStatus: string): string;

  /**
   * Check if the provider is correctly configured
   */
  isAvailable(): boolean;
}
