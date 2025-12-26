import type { FastifyInstance } from "fastify";

export function healthRoutes(app: FastifyInstance) {
  app.get("/health", async (_request, reply) =>
    reply.send({
      status: "ok",
      timestamp: new Date().toISOString(),
    })
  );
}
