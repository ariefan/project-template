import { addMonths } from "date-fns";
import { generateId } from "../../../lib/response";
import * as paymentEventsRepo from "../repositories/payment-events.repository";
import * as subscriptionsRepo from "../repositories/subscriptions.repository";

export interface XenditWebhookEvent {
  id: string;
  event: string;
  data: {
    id: string;
    referenceId?: string;
    status?: string;
    amount?: number;
    currency?: string;
    customerId?: string;
    failureCode?: string;
    failureMessage?: string;
    recurringPaymentId?: string;
    cycleNumber?: number;
    [key: string]: unknown;
  };
  created: string;
  apiVersion?: string;
}

/**
 * Process Xendit webhook event
 */
export async function processWebhookEvent(event: XenditWebhookEvent) {
  // Check for duplicate event (idempotency)
  const existing = await paymentEventsRepo.getPaymentEventByProviderEventId(
    event.id
  );
  if (existing) {
    console.log(`Event ${event.id} already processed, skipping`);
    return { success: true, message: "Event already processed" };
  }

  // Route to appropriate handler based on event type
  switch (event.event) {
    case "recurring_payment.cycle.succeeded":
      return handleCycleSucceeded(event);
    case "recurring_payment.cycle.failed":
      return handleCycleFailed(event);
    case "recurring_payment.cycle.retrying":
      return handleCycleRetrying(event);
    case "recurring_payment.activated":
      return handlePlanActivated(event);
    case "recurring_payment.paused":
      return handlePlanPaused(event);
    case "recurring_payment.stopped":
      return handlePlanStopped(event);
    case "recurring_payment.completed":
      return handlePlanCompleted(event);
    default:
      console.log(`Unhandled event type: ${event.event}`);
      return { success: true, message: "Event type not handled" };
  }
}

/**
 * Handle successful payment cycle
 */
async function handleCycleSucceeded(event: XenditWebhookEvent) {
  const referenceId = event.data.referenceId;
  if (!referenceId) {
    console.error("No referenceId in cycle succeeded event");
    return { success: false, message: "Missing referenceId" };
  }

  // Get subscription
  const subscription = await subscriptionsRepo.getSubscriptionById(referenceId);
  if (!subscription) {
    console.error(`Subscription not found: ${referenceId}`);
    return { success: false, message: "Subscription not found" };
  }

  // Calculate next billing period - default to monthly
  // Xendit manages the actual billing cycle, we just extend the period here
  const now = new Date();
  const nextPeriodEnd = addMonths(now, 1);

  // Update subscription to active and extend period
  await subscriptionsRepo.updateSubscription(referenceId, {
    status: "active",
    currentPeriodStart: now,
    currentPeriodEnd: nextPeriodEnd,
    trialStartsAt: null,
    trialEndsAt: null,
  });

  // Create payment event record
  await paymentEventsRepo.createPaymentEvent({
    id: generateId("payment_event"),
    subscriptionId: referenceId,
    provider: "xendit",
    providerEventId: event.id,
    eventType: "payment.success",
    status: "succeeded",
    amount: event.data.amount,
    currency: event.data.currency,
    providerCycleId: event.data.cycleNumber?.toString(),
    rawPayload: event as unknown as Record<string, unknown>,
    processedAt: new Date(),
  });

  console.log(`Payment succeeded for subscription ${referenceId}`);
  return { success: true, message: "Payment processed successfully" };
}

/**
 * Handle failed payment cycle
 */
async function handleCycleFailed(event: XenditWebhookEvent) {
  const referenceId = event.data.referenceId;
  if (!referenceId) {
    console.error("No referenceId in cycle failed event");
    return { success: false, message: "Missing referenceId" };
  }

  // Get subscription
  const subscription = await subscriptionsRepo.getSubscriptionById(referenceId);
  if (!subscription) {
    console.error(`Subscription not found: ${referenceId}`);
    return { success: false, message: "Subscription not found" };
  }

  // Update subscription to past_due
  await subscriptionsRepo.updateSubscription(referenceId, {
    status: "past_due",
  });

  // Create payment event record
  await paymentEventsRepo.createPaymentEvent({
    id: generateId("payment_event"),
    subscriptionId: referenceId,
    provider: "xendit",
    providerEventId: event.id,
    eventType: "payment.failed",
    status: "failed",
    amount: event.data.amount,
    currency: event.data.currency,
    providerCycleId: event.data.cycleNumber?.toString(),
    errorCode: event.data.failureCode,
    errorMessage: event.data.failureMessage,
    rawPayload: event as unknown as Record<string, unknown>,
    processedAt: new Date(),
  });

  console.log(
    `Payment failed for subscription ${referenceId}: ${event.data.failureMessage}`
  );

  // TODO: Send notification to organization about failed payment
  // await notificationsService.sendPaymentFailedNotification(subscription.organizationId);

  return { success: true, message: "Payment failure processed" };
}

/**
 * Handle payment retry
 */
async function handleCycleRetrying(event: XenditWebhookEvent) {
  const referenceId = event.data.referenceId;
  if (!referenceId) {
    console.error("No referenceId in cycle retrying event");
    return { success: false, message: "Missing referenceId" };
  }

  // Create payment event record for tracking
  await paymentEventsRepo.createPaymentEvent({
    id: generateId("payment_event"),
    subscriptionId: referenceId,
    provider: "xendit",
    providerEventId: event.id,
    eventType: "recurring.cycle.retrying",
    status: "processing",
    amount: event.data.amount,
    currency: event.data.currency,
    providerCycleId: event.data.cycleNumber?.toString(),
    rawPayload: event as unknown as Record<string, unknown>,
    processedAt: new Date(),
  });

  console.log(`Payment retry for subscription ${referenceId}`);
  return { success: true, message: "Payment retry recorded" };
}

/**
 * Handle recurring plan activated
 */
async function handlePlanActivated(event: XenditWebhookEvent) {
  const referenceId = event.data.referenceId;
  if (!referenceId) {
    console.error("No referenceId in plan activated event");
    return { success: false, message: "Missing referenceId" };
  }

  // Get subscription
  const subscription = await subscriptionsRepo.getSubscriptionById(referenceId);
  if (!subscription) {
    console.error(`Subscription not found: ${referenceId}`);
    return { success: false, message: "Subscription not found" };
  }

  // Store Xendit recurring payment ID
  await subscriptionsRepo.updateSubscription(referenceId, {
    providerSubscriptionId: event.data.id,
    status: subscription.trialEndsAt ? "trialing" : "active",
  });

  // Create payment event record
  await paymentEventsRepo.createPaymentEvent({
    id: generateId("payment_event"),
    subscriptionId: referenceId,
    provider: "xendit",
    providerEventId: event.id,
    eventType: "subscription.created",
    status: "succeeded",
    rawPayload: event as unknown as Record<string, unknown>,
    processedAt: new Date(),
  });

  console.log(`Recurring plan activated for subscription ${referenceId}`);
  return { success: true, message: "Plan activation processed" };
}

/**
 * Handle recurring plan paused
 */
async function handlePlanPaused(event: XenditWebhookEvent) {
  const referenceId = event.data.referenceId;
  if (!referenceId) {
    console.error("No referenceId in plan paused event");
    return { success: false, message: "Missing referenceId" };
  }

  // Update subscription status
  await subscriptionsRepo.updateSubscription(referenceId, {
    status: "paused",
  });

  // Create payment event record
  await paymentEventsRepo.createPaymentEvent({
    id: generateId("payment_event"),
    subscriptionId: referenceId,
    provider: "xendit",
    providerEventId: event.id,
    eventType: "subscription.updated",
    status: "succeeded",
    rawPayload: event as unknown as Record<string, unknown>,
    processedAt: new Date(),
  });

  console.log(`Recurring plan paused for subscription ${referenceId}`);
  return { success: true, message: "Plan pause processed" };
}

/**
 * Handle recurring plan stopped
 */
async function handlePlanStopped(event: XenditWebhookEvent) {
  const referenceId = event.data.referenceId;
  if (!referenceId) {
    console.error("No referenceId in plan stopped event");
    return { success: false, message: "Missing referenceId" };
  }

  // Update subscription status
  await subscriptionsRepo.updateSubscription(referenceId, {
    status: "canceled",
  });

  // Create payment event record
  await paymentEventsRepo.createPaymentEvent({
    id: generateId("payment_event"),
    subscriptionId: referenceId,
    provider: "xendit",
    providerEventId: event.id,
    eventType: "subscription.canceled",
    status: "succeeded",
    rawPayload: event as unknown as Record<string, unknown>,
    processedAt: new Date(),
  });

  console.log(`Recurring plan stopped for subscription ${referenceId}`);
  return { success: true, message: "Plan cancellation processed" };
}

/**
 * Handle recurring plan completed
 */
async function handlePlanCompleted(event: XenditWebhookEvent) {
  const referenceId = event.data.referenceId;
  if (!referenceId) {
    console.error("No referenceId in plan completed event");
    return { success: false, message: "Missing referenceId" };
  }

  // Update subscription status
  await subscriptionsRepo.updateSubscription(referenceId, {
    status: "expired",
  });

  // Create payment event record
  await paymentEventsRepo.createPaymentEvent({
    id: generateId("payment_event"),
    subscriptionId: referenceId,
    provider: "xendit",
    providerEventId: event.id,
    eventType: "subscription.updated",
    status: "succeeded",
    rawPayload: event as unknown as Record<string, unknown>,
    processedAt: new Date(),
  });

  console.log(`Recurring plan completed for subscription ${referenceId}`);
  return { success: true, message: "Plan completion processed" };
}
