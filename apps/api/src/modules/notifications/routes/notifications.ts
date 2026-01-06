import type { SendNotificationRequest } from "@workspace/contracts";
import { zSendNotificationRequest } from "@workspace/contracts/zod";
import type { FastifyInstance } from "fastify";
import { validateBody } from "../../../lib/validation";
import { CachePresets } from "../../../plugins/caching";
import { requireAuth } from "../../auth";

// Helper function to convert null values to undefined for API responses
function transformNotificationForResponse(
  notification: Record<string, unknown>
): Record<string, unknown> {
  const transformed: Record<string, unknown> = { ...notification };

  // Convert null values to undefined for optional fields
  const optionalFields = [
    "recipientPhone",
    "recipientTelegramId",
    "templateId",
    "bodyHtml",
    "templateData",
    "campaignId",
    "provider",
    "providerMessageId",
    "sentAt",
    "deliveredAt",
    "failedAt",
    "readAt",
    "deletedAt",
    "nextRetryAt",
    "statusMessage",
    "metadata",
  ];

  for (const field of optionalFields) {
    if (transformed[field] === null) {
      transformed[field] = undefined;
    }
  }

  return transformed;
}

export function notificationRoutes(app: FastifyInstance): void {
  app.get(
    "/notifications",
    { preHandler: [requireAuth], config: { cache: CachePresets.noStore } },
    async (request, reply) => {
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

      const notifications = app.notifications;
      if (!notifications) {
        // Return empty list when notification service is not configured
        return reply.status(200).send({
          data: [],
          pagination: {
            page: 1,
            pageSize: 20,
            totalCount: 0,
            totalPages: 0,
            hasNext: false,
            hasPrevious: false,
          },
          meta: { requestId: request.id, timestamp: new Date().toISOString() },
        });
      }

      // Parse query params manually
      const rawQuery = request.query as Record<string, string | undefined>;
      const page = Number(rawQuery.page) || 1;
      const pageSize = Math.min(Number(rawQuery.pageSize) || 20, 100);
      const category = rawQuery.category;
      const readStatus = rawQuery.readStatus; // "read" or "unread"

      // Calculate offset for pagination
      const offset = (page - 1) * pageSize;

      // Get all notifications for the user
      let allNotifications = await notifications.notification.getHistory(
        userId,
        {
          limit: 1000, // Get more than needed to allow filtering
          offset: 0,
        }
      );

      // Filter by category if specified
      if (category) {
        allNotifications = allNotifications.filter(
          (n) => n.category === category
        );
      }

      // Filter by read status if specified
      if (readStatus === "read") {
        allNotifications = allNotifications.filter((n) => n.readAt !== null);
      } else if (readStatus === "unread") {
        allNotifications = allNotifications.filter((n) => n.readAt === null);
      }

      // Calculate pagination
      const totalCount = allNotifications.length;
      const totalPages = Math.ceil(totalCount / pageSize);
      const paginatedNotifications = allNotifications.slice(
        offset,
        offset + pageSize
      );

      // Transform notifications to convert null to undefined
      const transformedNotifications = paginatedNotifications.map((n) =>
        transformNotificationForResponse(n as Record<string, unknown>)
      );

      return reply.status(200).send({
        data: transformedNotifications,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
        },
        meta: { requestId: request.id, timestamp: new Date().toISOString() },
      });
    }
  );

  app.get(
    "/notifications/:id",
    { preHandler: [requireAuth], config: { cache: CachePresets.noStore } },
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

      return {
        data: transformNotificationForResponse(
          notification as Record<string, unknown>
        ),
        meta: { requestId: request.id, timestamp: new Date().toISOString() },
      };
    }
  );

  // TODO: Add authorization check - only users with "notifications:send" permission
  // should be able to send notifications. Current implementation allows any authenticated
  // user to send notifications, which may not be desired for production.
  // Rate limiting is handled globally by the rate-limit plugin.
  app.post(
    "/notifications/send",
    {
      preHandler: [requireAuth, validateBody(zSendNotificationRequest)],
    },
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

      const body = request.body as SendNotificationRequest;

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
        metadata: body.metadata,
      });

      if (!result.success) {
        request.log.error(
          {
            error: result.error,
            channel: body.channel,
            category: body.category,
            priority: body.priority,
            userId: request.user?.id,
            templateId: body.templateId,
          },
          "Failed to send notification"
        );

        return reply.status(500).send({
          error: {
            code: result.error?.code ?? "sendFailed",
            message: result.error?.message ?? "Failed to send notification",
            requestId: request.id,
          },
        });
      }

      request.log.info(
        {
          messageId: result.messageId,
          provider: result.provider,
          channel: body.channel,
          category: body.category,
          userId: request.user?.id,
        },
        "Notification sent successfully"
      );

      return {
        data: { messageId: result.messageId, provider: result.provider },
        meta: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
        },
      };
    }
  );

  app.patch(
    "/notifications/:id/read",
    {
      preHandler: [requireAuth],
    },
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

      const { id } = request.params as { id: string };
      await notifications.notification.markAsRead(id, userId);

      return reply.status(204).send();
    }
  );

  app.patch(
    "/notifications/:id/unread",
    {
      preHandler: [requireAuth],
    },
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

      const { id } = request.params as { id: string };
      await notifications.notification.markAsUnread(id, userId);

      return reply.status(204).send();
    }
  );

  app.post(
    "/notifications/mark-all-read",
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

      const count = await notifications.notification.markAllAsRead(userId);

      return { data: { markedCount: count } };
    }
  );

  app.get(
    "/notifications/unread/count",
    { preHandler: [requireAuth], config: { cache: CachePresets.noStore } },
    async (request, reply) => {
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

      const notifications = app.notifications;
      if (!notifications) {
        // Return 0 when notification service is not configured
        return {
          data: { unreadCount: 0 },
          meta: { requestId: request.id, timestamp: new Date().toISOString() },
        };
      }

      const count = await notifications.notification.getUnreadCount(userId);

      return {
        data: { unreadCount: count },
        meta: { requestId: request.id, timestamp: new Date().toISOString() },
      };
    }
  );

  app.delete(
    "/notifications/:id",
    {
      preHandler: [requireAuth],
    },
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

      const { id } = request.params as { id: string };
      await notifications.notification.deleteNotification(id, userId);

      return reply.status(204).send();
    }
  );

  app.post(
    "/notifications/:id/restore",
    {
      preHandler: [requireAuth],
    },
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

      const { id } = request.params as { id: string };
      await notifications.notification.restoreNotification(id, userId);

      return reply.status(204).send();
    }
  );
}
