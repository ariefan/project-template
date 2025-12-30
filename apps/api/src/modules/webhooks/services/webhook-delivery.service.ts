import crypto from "node:crypto";
import type { WebhookDeliveryRow, WebhookRow } from "@workspace/db/schema";
import type { WebhookQueue } from "../queue/webhook-queue";
import * as webhookRepository from "../repositories/webhook.repository";
import * as webhookDeliveryRepository from "../repositories/webhook-delivery.repository";

/**
 * Retry delays in milliseconds per API Guide:
 * 1min, 5min, 30min, 2hr, 6hr, 24hr
 */
const RETRY_DELAYS_MS = [
  1 * 60 * 1000, // 1 minute
  5 * 60 * 1000, // 5 minutes
  30 * 60 * 1000, // 30 minutes
  2 * 60 * 60 * 1000, // 2 hours
  6 * 60 * 60 * 1000, // 6 hours
  24 * 60 * 60 * 1000, // 24 hours
];

const DELIVERY_TIMEOUT_MS = 10_000; // 10 seconds per API Guide

// Optional queue instance - set via initQueue()
let webhookQueue: WebhookQueue | null = null;

/**
 * Initialize the webhook queue for async processing
 */
export function initQueue(queue: WebhookQueue): void {
  webhookQueue = queue;
}

/**
 * Generate a delivery ID
 */
function generateDeliveryId(): string {
  return `whd_${crypto.randomBytes(12).toString("base64url")}`;
}

/**
 * Generate an event ID
 */
function generateEventId(): string {
  return `wh_evt_${crypto.randomBytes(12).toString("base64url")}`;
}

/**
 * Create HMAC signature per API Guide format
 * Format: sha256=HMAC(timestamp.payload)
 */
function createSignature(
  secret: string,
  timestamp: number,
  payload: string
): string {
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");

  return `sha256=${signature}`;
}

// biome-ignore lint/style/useConsistentTypeDefinitions: type alias needed for compatibility with Record<string, unknown>
export type WebhookPayload = {
  id: string;
  type: string;
  createdAt: string;
  data: Record<string, unknown>;
  metadata: {
    tenantId: string;
    apiVersion: string;
  };
};

/**
 * Queue a webhook delivery for all webhooks subscribed to an event
 */
export async function queueEvent(
  orgId: string,
  eventType: string,
  data: Record<string, unknown>
): Promise<string[]> {
  // Find all webhooks subscribed to this event type
  const webhooks = await webhookRepository.findByEventType(orgId, eventType);

  const deliveryIds: string[] = [];

  for (const webhook of webhooks) {
    const eventId = generateEventId();
    const deliveryId = generateDeliveryId();

    const payload: WebhookPayload = {
      id: eventId,
      type: eventType,
      createdAt: new Date().toISOString(),
      data,
      metadata: {
        tenantId: orgId,
        apiVersion: "v1",
      },
    };

    // Create delivery record
    await webhookDeliveryRepository.create({
      id: deliveryId,
      webhookId: webhook.id,
      eventId,
      eventType,
      payload,
    });

    deliveryIds.push(deliveryId);

    // Queue for async processing if queue is available
    if (webhookQueue) {
      await webhookQueue.enqueue(deliveryId);
    }
    // If no queue, delivery will need to be triggered manually or via polling
  }

  return deliveryIds;
}

/**
 * Execute a delivery (called by worker or inline)
 */
export async function executeDelivery(
  deliveryId: string
): Promise<{ success: boolean; error?: string }> {
  const delivery = await webhookDeliveryRepository.findByIdOnly(deliveryId);
  if (!delivery) {
    return { success: false, error: "Delivery not found" };
  }

  // Get webhook to get URL and secret
  // Note: We need to find the webhook - delivery has webhookId
  const webhook = await findWebhookForDelivery(delivery);
  if (!webhook) {
    await webhookDeliveryRepository.updateStatus(
      deliveryId,
      "failed",
      undefined,
      "Webhook not found"
    );
    return { success: false, error: "Webhook not found" };
  }

  const result = await executeDeliveryDirect(
    webhook,
    delivery.payload as WebhookPayload
  );

  // Update delivery status
  if (result.success) {
    await webhookDeliveryRepository.updateStatus(
      deliveryId,
      "delivered",
      result.httpStatus
    );
  } else {
    // Increment attempts and check if we should retry
    const updated = await webhookDeliveryRepository.incrementAttempts(
      deliveryId,
      getNextRetryTime(delivery.attempts + 1, delivery.maxAttempts)
    );

    if (updated && updated.attempts >= updated.maxAttempts) {
      // Mark as exhausted
      await webhookDeliveryRepository.markExhausted(deliveryId);
    } else {
      await webhookDeliveryRepository.updateStatus(
        deliveryId,
        "failed",
        result.httpStatus,
        result.error
      );
    }
  }

  return result;
}

/**
 * Execute delivery directly (for testing webhooks)
 */
export async function executeDeliveryDirect(
  webhook: WebhookRow,
  payload: WebhookPayload
): Promise<{
  success: boolean;
  httpStatus?: number;
  durationMs?: number;
  error?: string;
}> {
  const timestamp = Math.floor(Date.now() / 1000);
  const payloadString = JSON.stringify(payload);
  const signature = createSignature(webhook.secret, timestamp, payloadString);

  const headers = {
    "Content-Type": "application/json",
    "X-Webhook-ID": payload.id,
    "X-Webhook-Timestamp": timestamp.toString(),
    "X-Webhook-Signature": signature,
  };

  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

    const response = await fetch(webhook.url, {
      method: "POST",
      headers,
      body: payloadString,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const durationMs = Date.now() - startTime;
    const success = response.status >= 200 && response.status < 300;

    return {
      success,
      httpStatus: response.status,
      durationMs,
      error: success ? undefined : `HTTP ${response.status}`,
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    let error = "Unknown error";
    if (err instanceof Error) {
      error = err.name === "AbortError" ? "Request timeout" : err.message;
    }

    return {
      success: false,
      durationMs,
      error,
    };
  }
}

/**
 * Get delivery by ID
 */
export function getDelivery(
  webhookId: string,
  deliveryId: string
): Promise<WebhookDeliveryRow | null> {
  return webhookDeliveryRepository.findById(webhookId, deliveryId);
}

/**
 * List deliveries
 */
export function listDeliveries(
  webhookId: string,
  options: webhookDeliveryRepository.ListDeliveriesOptions = {}
): Promise<webhookDeliveryRepository.ListDeliveriesResult> {
  return webhookDeliveryRepository.findByWebhook(webhookId, options);
}

/**
 * Retry a failed delivery
 */
export async function retryDelivery(
  webhookId: string,
  deliveryId: string
): Promise<WebhookDeliveryRow | null> {
  const delivery = await webhookDeliveryRepository.findById(
    webhookId,
    deliveryId
  );

  if (!delivery) {
    return null;
  }

  // Only allow retry if failed or exhausted
  if (delivery.status !== "failed" && delivery.status !== "exhausted") {
    return null;
  }

  // Reset to pending for retry
  await webhookDeliveryRepository.updateStatus(deliveryId, "pending");

  // Execute the delivery
  await executeDelivery(deliveryId);

  // Return updated delivery
  return webhookDeliveryRepository.findById(webhookId, deliveryId);
}

/**
 * Helper to find webhook for a delivery
 * Note: This is a simple implementation - in production you might want to
 * include orgId in the delivery record for direct lookup
 */
async function findWebhookForDelivery(
  delivery: WebhookDeliveryRow
): Promise<WebhookRow | null> {
  // Since we have webhookId, we need to find the webhook
  // This requires knowing the orgId, which we don't have in delivery
  // For now, we'll do a direct lookup by ID only
  const [webhook] = await (await import("@workspace/db")).db
    .select()
    .from((await import("@workspace/db/schema")).webhooks)
    .where(
      (await import("drizzle-orm")).eq(
        (await import("@workspace/db/schema")).webhooks.id,
        delivery.webhookId
      )
    )
    .limit(1);

  return webhook ?? null;
}

/**
 * Calculate next retry time based on attempt number
 */
function getNextRetryTime(attempt: number, maxAttempts: number): Date | null {
  if (attempt >= maxAttempts) {
    return null; // No more retries
  }

  const delayIndex = Math.min(attempt - 1, RETRY_DELAYS_MS.length - 1);
  const delayMs = RETRY_DELAYS_MS[delayIndex] ?? 60_000; // Default to 1 minute

  return new Date(Date.now() + delayMs);
}
