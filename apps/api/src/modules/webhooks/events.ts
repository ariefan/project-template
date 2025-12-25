/**
 * Webhook Event Types Registry
 *
 * Defines all available webhook event types that can be subscribed to.
 * Event names follow the pattern: {resource}.{action}
 *
 * Add new event types here as your application grows.
 */

export const WEBHOOK_EVENTS = {
  // User events
  "user.created": "A new user was created",
  "user.updated": "A user was updated",
  "user.deleted": "A user was deleted",

  // Organization events
  "organization.created": "A new organization was created",
  "organization.updated": "An organization was updated",
  "organization.deleted": "An organization was deleted",
  "organization.member.added": "A member was added to an organization",
  "organization.member.removed": "A member was removed from an organization",
  "organization.member.role_changed": "A member's role was changed",

  // File events
  "file.uploaded": "A file was uploaded",
  "file.deleted": "A file was deleted",

  // Job events
  "job.completed": "An async job completed",
  "job.failed": "An async job failed",

  // Test event (always available for testing webhooks)
  "webhook.test": "Test event for verifying webhook configuration",
} as const;

export type WebhookEventType = keyof typeof WEBHOOK_EVENTS;

/**
 * Check if an event type is valid
 */
export function isValidEventType(
  eventType: string
): eventType is WebhookEventType {
  return eventType in WEBHOOK_EVENTS || eventType === "*";
}

/**
 * Validate an array of event types
 * Returns null if all valid, or an array of invalid event types
 */
export function validateEventTypes(eventTypes: string[]): string[] | null {
  const invalid = eventTypes.filter((type) => !isValidEventType(type));
  return invalid.length > 0 ? invalid : null;
}

/**
 * Get all event types as an array for the API
 */
export function getEventTypes(): Array<{
  type: string;
  description: string;
}> {
  return Object.entries(WEBHOOK_EVENTS).map(([type, description]) => ({
    type,
    description,
  }));
}
