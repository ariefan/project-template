import type { FastifyInstance } from "fastify";
import { webhooksRoutes } from "./routes/webhooks";

/**
 * Webhooks module
 * Provides webhook management and delivery endpoints
 */
export function webhooksModule(app: FastifyInstance) {
  webhooksRoutes(app);
}

// Re-export event types
export {
  getEventTypes,
  isValidEventType,
  validateEventTypes,
  WEBHOOK_EVENTS,
  type WebhookEventType,
} from "./events";

// Re-export queue
export { createWebhookQueue, type WebhookQueue } from "./queue/webhook-queue";

// Re-export services for use by other modules
export * as webhookService from "./services/webhook.service";
export * as webhookDeliveryService from "./services/webhook-delivery.service";
