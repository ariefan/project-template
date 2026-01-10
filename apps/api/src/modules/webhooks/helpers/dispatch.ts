/**
 * Webhook Dispatch Helper
 *
 * Simple, convenient way to send webhooks from anywhere in your API.
 *
 * Usage:
 *   import { dispatchWebhook } from "@workspace/webhooks/helpers";
 *
 *   // After creating a post
 *   await dispatchWebhook(orgId, "posts.created", { postId: newPost.id, ... });
 *
 *   // After updating a user
 *   await dispatchWebhook(orgId, "user.updated", { userId: user.id, ... });
 */

import { isValidEventType } from "../events";
import { queueEvent } from "../services/webhook-delivery.service";

/**
 * Dispatch a webhook event to all subscribed endpoints
 *
 * This helper:
 * - Queues the webhook for async delivery (non-blocking)
 * - Creates delivery records for retry tracking
 * - Handles finding all webhooks subscribed to this event type
 * - Silently fails if no webhooks are subscribed (no error thrown)
 *
 * @param orgId - Organization ID to send webhooks for
 * @param eventType - Event type (e.g., "posts.created", "user.updated")
 * @param data - Event payload data
 * @returns Array of delivery IDs (empty if no webhooks subscribed)
 *
 * @example
 * ```typescript
 * // In your posts create route
 * const newPost = await createPost(input);
 * await dispatchWebhook(orgId, "posts.created", {
 *   postId: newPost.id,
 *   title: newPost.title,
 *   createdBy: session.userId,
 * });
 * ```
 */
export async function dispatchWebhook(
  orgId: string,
  eventType: string,
  data: Record<string, unknown>
): Promise<string[]> {
  // Validate event type
  if (!isValidEventType(eventType) && eventType !== "webhook.test") {
    console.warn(
      `[Webhooks] Unknown event type "${eventType}". Add it to events.ts to avoid this warning.`
    );
    // Continue anyway - allow custom event types
  }

  try {
    const deliveryIds = await queueEvent(orgId, eventType, data);
    if (deliveryIds.length > 0) {
      console.log(
        `[Webhooks] Dispatched ${eventType} to ${deliveryIds.length} subscriber(s) for org ${orgId}`
      );
    }
    return deliveryIds;
  } catch (error) {
    // Log but don't throw - webhook failures shouldn't break your API
    console.error(
      `[Webhooks] Failed to dispatch ${eventType} for org ${orgId}:`,
      error
    );
    return [];
  }
}

/**
 * Dispatch multiple webhook events at once
 * Useful when an action triggers multiple events
 *
 * @param orgId - Organization ID
 * @param events - Array of { eventType, data } tuples
 * @returns Flattened array of all delivery IDs
 *
 * @example
 * ```typescript
 * await dispatchWebhooksMany(orgId, [
 *   ["posts.created", { postId: newPost.id }],
 *   ["organization.activity", { action: "post_created" }],
 * ]);
 * ```
 */
export async function dispatchWebhooksMany(
  orgId: string,
  events: [eventType: string, data: Record<string, unknown>][]
): Promise<string[]> {
  const allDeliveryIds: string[] = [];

  for (const [eventType, data] of events) {
    const ids = await dispatchWebhook(orgId, eventType, data);
    allDeliveryIds.push(...ids);
  }

  return allDeliveryIds;
}

/**
 * Type-safe wrapper for dispatching specific event types
 *
 * @example
 * ```typescript
 * import type { WebhookEvents } from "@workspace/webhooks/helpers";
 *
 * function dispatchTyped<T extends keyof WebhookEvents>(
 *   orgId: string,
 *   eventType: T,
 *   data: WebhookEvents[T]
 * ) {
 *   return dispatchWebhook(orgId, eventType, data);
 * }
 * ```
 */
export interface WebhookEventPayloads {
  // User events
  "user.created": { userId: string; email: string; name?: string };
  "user.updated": { userId: string; changes: Record<string, unknown> };
  "user.deleted": { userId: string };

  // Organization events
  "organization.created": { orgId: string; name: string };
  "organization.updated": { orgId: string; changes: Record<string, unknown> };
  "organization.member.added": {
    orgId: string;
    userId: string;
    role: string;
  };
  "organization.member.removed": { orgId: string; userId: string };
  "organization.member.role_changed": {
    orgId: string;
    userId: string;
    oldRole: string;
    newRole: string;
  };

  // File events
  "file.uploaded": {
    fileId: string;
    fileName: string;
    size: number;
    mimeType: string;
  };
  "file.deleted": { fileId: string; fileName: string };

  // Job events
  "job.completed": { jobId: string; jobType: string; result?: unknown };
  "job.failed": { jobId: string; jobType: string; error: string };

  // Posts events (example - add your own)
  "posts.created": {
    postId: string;
    title: string;
    authorId: string;
    orgId: string;
  };
  "posts.updated": {
    postId: string;
    changes: Record<string, unknown>;
  };
  "posts.deleted": { postId: string };

  // Comment events (example)
  "comments.created": {
    commentId: string;
    postId: string;
    authorId: string;
    content: string;
  };

  // Schedule/Job events
  "schedules.created": { scheduleId: string; name: string; jobType: string };
  "schedules.updated": { scheduleId: string; changes: Record<string, unknown> };
  "schedules.deleted": { scheduleId: string };
  "schedules.triggered": {
    scheduleId: string;
    jobId: string;
    triggeredAt: string;
  };
}

/**
 * Type-safe webhook dispatcher
 * Only works for event types defined in WebhookEventPayloads
 */
export function dispatchWebhookTyped<T extends keyof WebhookEventPayloads>(
  orgId: string,
  eventType: T,
  data: WebhookEventPayloads[T]
): Promise<string[]> {
  return dispatchWebhook(orgId, eventType, data as Record<string, unknown>);
}
