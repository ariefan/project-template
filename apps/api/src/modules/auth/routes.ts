import type { Auth } from "@workspace/auth";
import { toNodeHandler } from "better-auth/node";
import type { FastifyPluginCallback } from "fastify";
import fp from "fastify-plugin";
import { env } from "../../env";

// Extend Fastify's type to include our auth decoration
declare module "fastify" {
  interface FastifyInstance {
    auth: Auth;
  }
}

const authRoutesPlugin: FastifyPluginCallback = (app, _opts, done) => {
  const authHandler = toNodeHandler(app.auth);

  // Handle auth routes in onRequest hook BEFORE Fastify parses the body
  // This ensures Better Auth gets the raw, unconsumed request stream
  app.addHook("onRequest", async (request, reply) => {
    if (request.url.startsWith("/api/auth/")) {
      // Add CORS headers since we're bypassing Fastify's pipeline
      const origin = request.headers.origin;
      if (origin === env.CORS_ORIGIN) {
        reply.raw.setHeader("Access-Control-Allow-Origin", origin);
        reply.raw.setHeader("Access-Control-Allow-Credentials", "true");
        reply.raw.setHeader(
          "Access-Control-Allow-Methods",
          "GET, POST, PUT, DELETE, PATCH, OPTIONS"
        );
        reply.raw.setHeader(
          "Access-Control-Allow-Headers",
          "Content-Type, Authorization, X-Requested-With"
        );
      }

      // Handle preflight requests
      if (request.method === "OPTIONS") {
        reply.raw.statusCode = 204;
        reply.raw.end();
        reply.hijack();
        return;
      }

      await authHandler(request.raw, reply.raw);
      reply.hijack();
    }
  });

  done();
};

export const authRoutes = fp(authRoutesPlugin, {
  name: "auth-routes",
});
