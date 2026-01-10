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
  "organization.activity": "General organization activity event",

  // File events
  "file.uploaded": "A file was uploaded",
  "file.deleted": "A file was deleted",
  "file.updated": "A file metadata was updated",

  // Job events
  "job.created": "An async job was created",
  "job.completed": "An async job completed",
  "job.failed": "An async job failed",
  "job.started": "An async job started processing",

  // Posts events (example for your blog/forum features)
  "posts.created": "A new post was created",
  "posts.updated": "A post was updated",
  "posts.deleted": "A post was deleted",
  "posts.published": "A post was published",

  // Comments events
  "comments.created": "A new comment was created",
  "comments.updated": "A comment was updated",
  "comments.deleted": "A comment was deleted",

  // Schedule events
  "schedules.created": "A new scheduled job was created",
  "schedules.updated": "A scheduled job was updated",
  "schedules.deleted": "A scheduled job was deleted",
  "schedules.triggered": "A scheduled job was triggered",
  "schedules.paused": "A scheduled job was paused",
  "schedules.resumed": "A scheduled job was resumed",

  // Subscription events
  "subscription.created": "A new subscription was created",
  "subscription.updated": "A subscription was updated",
  "subscription.canceled": "A subscription was canceled",
  "subscription.renewed": "A subscription was renewed",
  "subscription.payment.succeeded": "A subscription payment succeeded",
  "subscription.payment.failed": "A subscription payment failed",

  // Notification events
  "notification.sent": "A notification was sent",
  "notification.delivered": "A notification was delivered",
  "notification.failed": "A notification failed to deliver",

  // Report events
  "reports.generated": "A report was generated",
  "reports.completed": "A report generation completed",
  "reports.failed": "A report generation failed",

  // Announcement events
  "announcements.published": "An announcement was published",
  "announcements.updated": "An announcement was updated",
  "announcements.archived": "An announcement was archived",

  // Webhook events
  "webhook.test": "Test event for verifying webhook configuration",
  "webhook.delivered": "A webhook was successfully delivered",
  "webhook.failed": "A webhook delivery failed after all retries",
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
