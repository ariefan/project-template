import type { FastifyInstance } from "fastify";
import { validateBody } from "../../../lib/validation";
import { requireAuth } from "../../auth";
import {
  type UpdatePreferencesBody,
  UpdatePreferencesBodySchema,
} from "../schemas/preference.schema";

export function preferenceRoutes(app: FastifyInstance) {
  app.get(
    "/preferences",
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

      const preferences =
        await notifications.preferences.getPreferences(userId);

      return {
        data: preferences ?? {
          emailEnabled: true,
          smsEnabled: true,
          whatsappEnabled: true,
          telegramEnabled: true,
          pushEnabled: true,
          marketingEnabled: true,
          transactionalEnabled: true,
          securityEnabled: true,
          systemEnabled: true,
        },
      };
    }
  );

  app.patch(
    "/preferences",
    {
      preHandler: [requireAuth, validateBody(UpdatePreferencesBodySchema)],
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

      const body = request.body as UpdatePreferencesBody;

      const updated = await notifications.preferences.upsertPreferences(
        userId,
        body
      );

      return { data: updated };
    }
  );
}
