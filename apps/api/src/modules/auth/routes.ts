import type { Auth } from "@workspace/auth";
import { toNodeHandler } from "better-auth/node";
import type { FastifyInstance } from "fastify";

// Extend Fastify's type to include our auth decoration
declare module "fastify" {
  // biome-ignore lint/style/useConsistentTypeDefinitions: Required for module augmentation
  // biome-ignore lint/nursery/noShadow: Required for module augmentation
  interface FastifyInstance {
    auth: Auth;
  }
}

export function authRoutes(app: FastifyInstance) {
  const authHandler = toNodeHandler(app.auth);

  app.all("/api/auth/*", async (request, reply) => {
    await authHandler(request.raw, reply.raw);
    return reply; // Tell Fastify we handled the response
  });
}
