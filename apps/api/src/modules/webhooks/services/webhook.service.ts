import crypto from "node:crypto";
import type { WebhookRow } from "@workspace/db/schema";
import { getEventTypes, validateEventTypes } from "../events";
import * as webhookRepository from "../repositories/webhook.repository";
import * as webhookDeliveryService from "./webhook-delivery.service";

/**
 * Generate a webhook ID
 */
function generateWebhookId(): string {
  return `whk_${crypto.randomBytes(12).toString("base64url")}`;
}

/**
 * Generate a webhook secret
 */
function generateSecret(): string {
  return `whsec_${crypto.randomBytes(24).toString("base64url")}`;
}

export interface CreateWebhookInput {
  orgId: string;
  name: string;
  url: string;
  events: string[];
  description?: string;
  createdBy: string;
}

export interface CreateWebhookResult {
  webhook: WebhookRow;
  secret: string; // Only returned on create
}

/**
 * Create a new webhook
 */
export async function createWebhook(
  input: CreateWebhookInput
): Promise<CreateWebhookResult> {
  // Validate URL is HTTPS
  if (!input.url.startsWith("https://")) {
    throw new Error("Webhook URL must use HTTPS");
  }

  // Validate event types
  const invalidEvents = validateEventTypes(input.events);
  if (invalidEvents) {
    throw new Error(`Invalid event types: ${invalidEvents.join(", ")}`);
  }

  const id = generateWebhookId();
  const secret = generateSecret();

  const webhook = await webhookRepository.create({
    id,
    orgId: input.orgId,
    name: input.name,
    url: input.url,
    secret,
    events: input.events,
    description: input.description ?? null,
    createdBy: input.createdBy,
  });

  return { webhook, secret };
}

/**
 * Get webhook by ID
 */
export function getWebhook(
  orgId: string,
  webhookId: string
): Promise<WebhookRow | null> {
  return webhookRepository.findById(orgId, webhookId);
}

/**
 * List webhooks
 */
export function listWebhooks(
  orgId: string,
  options: webhookRepository.ListWebhooksOptions = {}
): Promise<webhookRepository.ListWebhooksResult> {
  return webhookRepository.findByOrg(orgId, options);
}

export interface UpdateWebhookInput {
  name?: string;
  url?: string;
  events?: string[];
  isActive?: boolean;
  description?: string;
}

/**
 * Update a webhook
 */
export async function updateWebhook(
  orgId: string,
  webhookId: string,
  input: UpdateWebhookInput
): Promise<WebhookRow | null> {
  // Validate URL if provided
  if (input.url && !input.url.startsWith("https://")) {
    throw new Error("Webhook URL must use HTTPS");
  }

  // Validate event types if provided
  if (input.events) {
    const invalidEvents = validateEventTypes(input.events);
    if (invalidEvents) {
      throw new Error(`Invalid event types: ${invalidEvents.join(", ")}`);
    }
  }

  return await webhookRepository.update(orgId, webhookId, input);
}

/**
 * Delete a webhook
 */
export function deleteWebhook(
  orgId: string,
  webhookId: string
): Promise<WebhookRow | null> {
  return webhookRepository.deleteById(orgId, webhookId);
}

/**
 * Rotate webhook secret
 */
export async function rotateSecret(
  orgId: string,
  webhookId: string
): Promise<{ webhook: WebhookRow; secret: string } | null> {
  const secret = generateSecret();
  const webhook = await webhookRepository.updateSecret(
    orgId,
    webhookId,
    secret
  );

  if (!webhook) {
    return null;
  }

  return { webhook, secret };
}

/**
 * Test a webhook by sending a test event
 */
export async function testWebhook(
  orgId: string,
  webhookId: string
): Promise<{
  success: boolean;
  httpStatus?: number;
  durationMs?: number;
  error?: string;
}> {
  const webhook = await webhookRepository.findById(orgId, webhookId);
  if (!webhook) {
    return { success: false, error: "Webhook not found" };
  }

  const testPayload = {
    id: `wh_evt_test_${crypto.randomBytes(8).toString("hex")}`,
    type: "webhook.test",
    createdAt: new Date().toISOString(),
    data: {
      message: "This is a test event",
      webhookId,
      orgId,
    },
    metadata: {
      tenantId: orgId,
      apiVersion: "v1",
    },
  };

  const result = await webhookDeliveryService.executeDeliveryDirect(
    webhook,
    testPayload
  );

  return result;
}

/**
 * Get available event types
 */
export function listEventTypes(): Array<{ type: string; description: string }> {
  return getEventTypes();
}
