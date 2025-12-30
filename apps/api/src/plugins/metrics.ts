/**
 * Metrics Plugin
 *
 * Prometheus metrics collection for HTTP requests and system monitoring.
 *
 * Features:
 * - Automatic HTTP request metrics (count, duration)
 * - /metrics endpoint for Prometheus scraping
 * - Node.js default metrics (CPU, memory, event loop)
 * - Route normalization for clean metric labels
 *
 * Example metrics output:
 * ```
 * http_requests_total{method="GET",route="/v1/orgs/:orgId/posts",status_code="200"} 42
 * http_request_duration_seconds_bucket{method="GET",route="/v1/orgs/:orgId/posts",status_code="200",le="0.1"} 35
 * ```
 */

import {
  getMetricsContentType,
  getMetricsText,
  initializeMetrics,
  recordHttpRequest,
} from "@workspace/metrics";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { env } from "../env";

declare module "fastify" {
  interface FastifyRequest {
    metricsStartTime?: [number, number];
  }
}

export default function metricsPlugin(app: FastifyInstance) {
  // Initialize metrics with app-specific configuration
  initializeMetrics({
    collectDefaultMetrics: true,
    prefix: env.METRICS_PREFIX ?? "",
    defaultLabels: {
      app: "api",
      env: env.NODE_ENV,
    },
  });

  app.log.info("Metrics collection initialized");

  // Record request start time
  app.addHook("onRequest", (request: FastifyRequest, _reply, done) => {
    request.metricsStartTime = process.hrtime();
    done();
  });

  // Record request metrics on response
  app.addHook(
    "onResponse",
    (request: FastifyRequest, reply: FastifyReply, done) => {
      // Skip metrics endpoint itself
      if (request.url === "/metrics") {
        done();
        return;
      }

      // Calculate duration
      const startTime = request.metricsStartTime;
      if (!startTime) {
        done();
        return;
      }

      const diff = process.hrtime(startTime);
      const durationSeconds = diff[0] + diff[1] / 1e9;

      // Get route pattern (prefer routeOptions.url for parameterized routes)
      const route =
        request.routeOptions?.url || request.url.split("?")[0] || "unknown";

      recordHttpRequest(
        request.method,
        route,
        reply.statusCode,
        durationSeconds
      );

      done();
    }
  );

  // Expose /metrics endpoint for Prometheus scraping
  app.get("/metrics", async (_request, reply) => {
    const metrics = await getMetricsText();
    return reply.header("Content-Type", getMetricsContentType()).send(metrics);
  });
}
