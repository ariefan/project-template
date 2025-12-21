import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../auth";

export function notificationRoutes(app: FastifyInstance) {
  app.get(
    "/notifications",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const notifications = app.notifications;
      if (!notifications) {
        return reply.status(503).send({
          error: {
            code: "serviceUnavailable",
            message: "Notification service not configured",
            requestId: request.id,
          },
        });
      }

      const userId = request.user?.id;
      if (!userId) {
        return reply.status(401).send({
          error: {
            code: "unauthorized",
            message: "User not authenticated",
            requestId: request.id,
          },
        });
      }

      const query = request.query as { limit?: string; offset?: string };
      const limit = query.limit ? Number.parseInt(query.limit, 10) : 50;
      const offset = query.offset ? Number.parseInt(query.offset, 10) : 0;

      const history = await notifications.notification.getHistory(userId, {
        limit,
        offset,
      });

      return { data: history };
    }
  );

  app.get(
    "/notifications/:id",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const notifications = app.notifications;
      if (!notifications) {
        return reply.status(503).send({
          error: {
            code: "serviceUnavailable",
            message: "Notification service not configured",
            requestId: request.id,
          },
        });
      }

      const { id } = request.params as { id: string };
      const notification = await notifications.notification.getById(id);

      if (!notification) {
        return reply.status(404).send({
          error: {
            code: "notFound",
            message: "Notification not found",
            requestId: request.id,
          },
        });
      }

      if (notification.userId !== request.user?.id) {
        return reply.status(403).send({
          error: {
            code: "forbidden",
            message: "Not authorized to view this notification",
            requestId: request.id,
          },
        });
      }

      return { data: notification };
    }
  );

  app.post(
    "/notifications/send",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const notifications = app.notifications;
      if (!notifications) {
        return reply.status(503).send({
          error: {
            code: "serviceUnavailable",
            message: "Notification service not configured",
            requestId: request.id,
          },
        });
      }

      const body = request.body as {
        channel: "email" | "sms" | "whatsapp" | "telegram";
        category: "transactional" | "marketing" | "security" | "system";
        priority?: "urgent" | "high" | "normal" | "low";
        recipient: {
          email?: string;
          phone?: string;
          telegramId?: string;
        };
        templateId?: string;
        templateData?: Record<string, unknown>;
        subject?: string;
        body?: string;
        bodyHtml?: string;
      };

      if (!(body.channel && body.category && body.recipient)) {
        return reply.status(400).send({
          error: {
            code: "badRequest",
            message: "Missing required fields: channel, category, recipient",
            requestId: request.id,
          },
        });
      }

      const result = await notifications.notification.send({
        channel: body.channel,
        category: body.category,
        priority: body.priority,
        userId: request.user?.id,
        recipient: body.recipient,
        templateId: body.templateId,
        templateData: body.templateData,
        subject: body.subject,
        body: body.body,
        bodyHtml: body.bodyHtml,
      });

      if (!result.success) {
        return reply.status(500).send({
          error: {
            code: result.error?.code ?? "sendFailed",
            message: result.error?.message ?? "Failed to send notification",
            requestId: request.id,
          },
        });
      }

      return {
        data: { messageId: result.messageId, provider: result.provider },
      };
    }
  );
}
