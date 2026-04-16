import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireAuth } from "../auth/middleware";
import { getDemoAccountsHandler, seedDatabaseHandler } from "./handlers";

export function developerRoutes(app: FastifyInstance) {
  // Middleware to require super admin
  const requireSuperAdmin = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    await requireAuth(request, reply);
    if (reply.sent) {
      return;
    }

    // biome-ignore lint/suspicious/noExplicitAny: user role is available at runtime
    if ((request.user as any)?.role !== "super_admin") {
      reply.status(403).send({
        error: {
          code: "forbidden",
          message: "Requires Super Admin privileges",
          requestId: request.id,
        },
      });
    }
  };

  app.post(
    "/developer/database/seed",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            mode: { type: "string", enum: ["dev", "prod"], default: "dev" },
          },
        },
      },
      preHandler: [requireSuperAdmin],
    },
    seedDatabaseHandler
  );

  app.get("/developer/demo-accounts", getDemoAccountsHandler);
}
