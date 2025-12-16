import { auth } from "@workspace/auth";
import { toNodeHandler } from "better-auth/node";
import type { FastifyInstance } from "fastify";

export async function authRoutes(app: FastifyInstance) {
  const authHandler = toNodeHandler(auth);

  app.all("/api/auth/*", async (request, reply) => {
    await authHandler(request.raw, reply.raw);
  });
}
