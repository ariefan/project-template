import { AuthorizationMetrics } from "@workspace/metrics";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

declare module "fastify" {
  // biome-ignore lint/style/useConsistentTypeDefinitions: Module augmentation requires interface
  // biome-ignore lint/nursery/noShadow: Module augmentation pattern
  interface FastifyInstance {
    /**
     * Authorization metrics instance for tracking performance
     */
    readonly metrics: AuthorizationMetrics;
  }
}

/**
 * Fastify plugin for Prometheus metrics
 * Provides metrics instance and /metrics endpoint
 */
function metricsPlugin(
  fastify: FastifyInstance,
  opts?: {
    metrics?: AuthorizationMetrics;
    endpoint?: string;
  }
): void {
  const metrics = opts?.metrics ?? new AuthorizationMetrics();
  const endpoint = opts?.endpoint ?? "/metrics";

  // Decorate fastify with metrics instance
  fastify.decorate("metrics", metrics);

  // Expose metrics endpoint
  fastify.get(endpoint, async (_request, reply) => {
    try {
      const metricsData = await metrics.getMetrics();
      reply.header("Content-Type", metrics.getRegistry().contentType);
      return metricsData;
    } catch (error) {
      fastify.log.error({ error }, "Failed to get metrics");
      reply.status(500);
      return { error: "Failed to retrieve metrics" };
    }
  });

  fastify.log.info({ endpoint }, "Metrics endpoint registered");
}

export default fp(metricsPlugin, {
  name: "metrics",
  dependencies: [],
});
