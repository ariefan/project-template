import type { WebhookDeliveryStatus } from "@workspace/db/schema";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { requireAuth } from "../../auth/middleware";
import * as webhookService from "../services/webhook.service";
import * as webhookDeliveryService from "../services/webhook-delivery.service";

interface OrgParams {
  orgId: string;
}

interface WebhookParams {
  orgId: string;
  webhookId: string;
}

interface DeliveryParams {
  orgId: string;
  webhookId: string;
  deliveryId: string;
}

interface ListWebhooksQuery {
  page?: number;
  pageSize?: number;
  isActive?: string; // Query params come as strings
}

interface ListDeliveriesQuery {
  page?: number;
  pageSize?: number;
  status?: WebhookDeliveryStatus;
  eventType?: string;
  createdAfter?: string;
}

interface CreateWebhookBody {
  name: string;
  url: string;
  events: string[];
  description?: string;
}

interface UpdateWebhookBody {
  name?: string;
  url?: string;
  events?: string[];
  isActive?: boolean;
  description?: string;
}

/**
 * Webhooks routes
 * Provides endpoints for webhook configuration and delivery management
 *
 * Registered with prefix: /v1/orgs
 */
export function webhooksRoutes(app: FastifyInstance) {
  // ========== Webhook CRUD ==========

  /**
   * GET /:orgId/webhooks - List webhooks
   */
  app.get<{
    Params: OrgParams;
    Querystring: ListWebhooksQuery;
  }>(
    "/:orgId/webhooks",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { orgId } = request.params;
      const { page, pageSize, isActive } = request.query;

      const result = await webhookService.listWebhooks(orgId, {
        page: page ? Number(page) : undefined,
        pageSize: pageSize ? Number(pageSize) : undefined,
        isActive: isActive !== undefined ? isActive === "true" : undefined,
      });

      return reply.status(200).send({
        data: result.data.map(formatWebhookResponse),
        pagination: result.pagination,
        meta: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
        },
      });
    }
  );

  /**
   * POST /:orgId/webhooks - Create webhook
   */
  app.post<{
    Params: OrgParams;
    Body: CreateWebhookBody;
  }>(
    "/:orgId/webhooks",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { orgId } = request.params;
      const { name, url, events, description } = request.body;
      const userId = getUserId(request);

      try {
        const { webhook, secret } = await webhookService.createWebhook({
          orgId,
          name,
          url,
          events,
          description,
          createdBy: userId,
        });

        return reply.status(201).send({
          data: {
            ...formatWebhookResponse(webhook),
            secret, // Only returned on create
          },
          meta: {
            requestId: request.id,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to create webhook";
        return reply.status(400).send({
          error: {
            code: "badRequest",
            message,
            requestId: request.id,
          },
        });
      }
    }
  );

  /**
   * GET /:orgId/webhooks/event-types - List available event types
   */
  app.get<{ Params: OrgParams }>(
    "/:orgId/webhooks/event-types",
    { preHandler: [requireAuth] },
    (request, reply) => {
      const eventTypes = webhookService.listEventTypes();

      return reply.status(200).send({
        data: eventTypes,
        meta: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
        },
      });
    }
  );

  /**
   * GET /:orgId/webhooks/:webhookId - Get webhook
   */
  app.get<{ Params: WebhookParams }>(
    "/:orgId/webhooks/:webhookId",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { orgId, webhookId } = request.params;

      const webhook = await webhookService.getWebhook(orgId, webhookId);

      if (!webhook) {
        return reply.status(404).send({
          error: {
            code: "notFound",
            message: "Webhook not found",
            requestId: request.id,
          },
        });
      }

      return reply.status(200).send({
        data: formatWebhookResponse(webhook),
        meta: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
        },
      });
    }
  );

  /**
   * PATCH /:orgId/webhooks/:webhookId - Update webhook
   */
  app.patch<{
    Params: WebhookParams;
    Body: UpdateWebhookBody;
  }>(
    "/:orgId/webhooks/:webhookId",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { orgId, webhookId } = request.params;
      const { name, url, events, isActive, description } = request.body;

      try {
        const webhook = await webhookService.updateWebhook(orgId, webhookId, {
          name,
          url,
          events,
          isActive,
          description,
        });

        if (!webhook) {
          return reply.status(404).send({
            error: {
              code: "notFound",
              message: "Webhook not found",
              requestId: request.id,
            },
          });
        }

        return reply.status(200).send({
          data: formatWebhookResponse(webhook),
          meta: {
            requestId: request.id,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to update webhook";
        return reply.status(400).send({
          error: {
            code: "badRequest",
            message,
            requestId: request.id,
          },
        });
      }
    }
  );

  /**
   * DELETE /:orgId/webhooks/:webhookId - Delete webhook
   */
  app.delete<{ Params: WebhookParams }>(
    "/:orgId/webhooks/:webhookId",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { orgId, webhookId } = request.params;

      const webhook = await webhookService.deleteWebhook(orgId, webhookId);

      if (!webhook) {
        return reply.status(404).send({
          error: {
            code: "notFound",
            message: "Webhook not found",
            requestId: request.id,
          },
        });
      }

      return reply.status(204).send();
    }
  );

  // ========== Webhook Operations ==========

  /**
   * POST /:orgId/webhooks/:webhookId/rotate-secret - Rotate webhook secret
   */
  app.post<{ Params: WebhookParams }>(
    "/:orgId/webhooks/:webhookId/rotate-secret",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { orgId, webhookId } = request.params;

      const result = await webhookService.rotateSecret(orgId, webhookId);

      if (!result) {
        return reply.status(404).send({
          error: {
            code: "notFound",
            message: "Webhook not found",
            requestId: request.id,
          },
        });
      }

      return reply.status(200).send({
        data: {
          ...formatWebhookResponse(result.webhook),
          secret: result.secret, // Return new secret
        },
        meta: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
        },
      });
    }
  );

  /**
   * POST /:orgId/webhooks/:webhookId/test - Test webhook
   */
  app.post<{ Params: WebhookParams }>(
    "/:orgId/webhooks/:webhookId/test",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { orgId, webhookId } = request.params;

      const result = await webhookService.testWebhook(orgId, webhookId);

      if (result.error === "Webhook not found") {
        return reply.status(404).send({
          error: {
            code: "notFound",
            message: "Webhook not found",
            requestId: request.id,
          },
        });
      }

      return reply.status(200).send({
        data: {
          success: result.success,
          httpStatus: result.httpStatus,
          durationMs: result.durationMs,
          error: result.error,
        },
        meta: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
        },
      });
    }
  );

  // ========== Webhook Deliveries ==========

  /**
   * GET /:orgId/webhooks/:webhookId/deliveries - List deliveries
   */
  app.get<{
    Params: WebhookParams;
    Querystring: ListDeliveriesQuery;
  }>(
    "/:orgId/webhooks/:webhookId/deliveries",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { orgId, webhookId } = request.params;
      const { page, pageSize, status, eventType, createdAfter } = request.query;

      // Verify webhook exists and belongs to org
      const webhook = await webhookService.getWebhook(orgId, webhookId);
      if (!webhook) {
        return reply.status(404).send({
          error: {
            code: "notFound",
            message: "Webhook not found",
            requestId: request.id,
          },
        });
      }

      const result = await webhookDeliveryService.listDeliveries(webhookId, {
        page: page ? Number(page) : undefined,
        pageSize: pageSize ? Number(pageSize) : undefined,
        status,
        eventType,
        createdAfter: createdAfter ? new Date(createdAfter) : undefined,
      });

      return reply.status(200).send({
        data: result.data.map(formatDeliveryResponse),
        pagination: result.pagination,
        meta: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
        },
      });
    }
  );

  /**
   * GET /:orgId/webhooks/:webhookId/deliveries/:deliveryId - Get delivery
   */
  app.get<{ Params: DeliveryParams }>(
    "/:orgId/webhooks/:webhookId/deliveries/:deliveryId",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { orgId, webhookId, deliveryId } = request.params;

      // Verify webhook exists and belongs to org
      const webhook = await webhookService.getWebhook(orgId, webhookId);
      if (!webhook) {
        return reply.status(404).send({
          error: {
            code: "notFound",
            message: "Webhook not found",
            requestId: request.id,
          },
        });
      }

      const delivery = await webhookDeliveryService.getDelivery(
        webhookId,
        deliveryId
      );

      if (!delivery) {
        return reply.status(404).send({
          error: {
            code: "notFound",
            message: "Delivery not found",
            requestId: request.id,
          },
        });
      }

      return reply.status(200).send({
        data: formatDeliveryResponse(delivery),
        meta: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
        },
      });
    }
  );

  /**
   * POST /:orgId/webhooks/:webhookId/deliveries/:deliveryId/retry - Retry delivery
   */
  app.post<{ Params: DeliveryParams }>(
    "/:orgId/webhooks/:webhookId/deliveries/:deliveryId/retry",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { orgId, webhookId, deliveryId } = request.params;

      // Verify webhook exists and belongs to org
      const webhook = await webhookService.getWebhook(orgId, webhookId);
      if (!webhook) {
        return reply.status(404).send({
          error: {
            code: "notFound",
            message: "Webhook not found",
            requestId: request.id,
          },
        });
      }

      const delivery = await webhookDeliveryService.retryDelivery(
        webhookId,
        deliveryId
      );

      if (!delivery) {
        return reply.status(404).send({
          error: {
            code: "notFound",
            message: "Delivery not found or cannot be retried",
            requestId: request.id,
          },
        });
      }

      return reply.status(200).send({
        data: formatDeliveryResponse(delivery),
        meta: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
        },
      });
    }
  );
}

/**
 * Get user ID from request
 */
function getUserId(request: FastifyRequest): string {
  const user = (request as FastifyRequest & { user?: { id: string } }).user;
  return user?.id ?? "unknown";
}

/**
 * Format webhook for API response (without secret)
 */
function formatWebhookResponse(webhook: {
  id: string;
  orgId: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  description: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: webhook.id,
    name: webhook.name,
    url: webhook.url,
    events: webhook.events,
    isActive: webhook.isActive,
    description: webhook.description,
    createdBy: webhook.createdBy,
    createdAt: webhook.createdAt.toISOString(),
    updatedAt: webhook.updatedAt.toISOString(),
  };
}

/**
 * Format delivery for API response
 */
function formatDeliveryResponse(delivery: {
  id: string;
  webhookId: string;
  eventId: string;
  eventType: string;
  payload: unknown;
  status: string;
  statusCode: number | null;
  responseBody: string | null;
  attempts: number;
  maxAttempts: number;
  nextRetryAt: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: delivery.id,
    webhookId: delivery.webhookId,
    eventId: delivery.eventId,
    eventType: delivery.eventType,
    payload: delivery.payload,
    status: delivery.status,
    statusCode: delivery.statusCode,
    responseBody: delivery.responseBody,
    attempts: delivery.attempts,
    maxAttempts: delivery.maxAttempts,
    nextRetryAt: delivery.nextRetryAt?.toISOString() ?? null,
    deliveredAt: delivery.deliveredAt?.toISOString() ?? null,
    createdAt: delivery.createdAt.toISOString(),
  };
}
