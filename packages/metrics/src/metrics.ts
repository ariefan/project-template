/**
 * Prometheus Metrics Definitions
 *
 * Metrics following the naming conventions from:
 * - docs/api-guide/06-quality/04-monitoring.md
 * - packages/metrics/README.md
 */

import {
  Counter,
  collectDefaultMetrics,
  Histogram,
  Registry,
} from "prom-client";
import type { MetricsConfig } from "./types";

// Default histogram buckets for HTTP request duration (in seconds)
const DEFAULT_HTTP_DURATION_BUCKETS = [
  0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10,
];

// Singleton registry instance
let registry: Registry | null = null;
let metricsInitialized = false;

// Metric instances
let httpRequestsTotal: Counter | null = null;
let httpRequestDurationSeconds: Histogram | null = null;
let authorizationChecksTotal: Counter | null = null;
let cacheOperationsTotal: Counter | null = null;
let dbQueryDurationSeconds: Histogram | null = null;
let webhookDeliveriesTotal: Counter | null = null;
let webhookDeliveryDurationSeconds: Histogram | null = null;

/**
 * Initialize the metrics registry and create all metrics.
 * Call this once at application startup.
 */
export function initializeMetrics(config: MetricsConfig = {}): Registry {
  if (metricsInitialized && registry) {
    return registry;
  }

  const {
    collectDefaultMetrics: shouldCollectDefault = true,
    prefix = "",
    defaultLabels = {},
    httpDurationBuckets = DEFAULT_HTTP_DURATION_BUCKETS,
  } = config;

  // Create new registry
  registry = new Registry();

  // Set default labels
  if (Object.keys(defaultLabels).length > 0) {
    registry.setDefaultLabels(defaultLabels);
  }

  // Collect default Node.js metrics (CPU, memory, event loop, etc.)
  if (shouldCollectDefault) {
    collectDefaultMetrics({ register: registry, prefix });
  }

  // HTTP Request Counter
  httpRequestsTotal = new Counter({
    name: `${prefix}http_requests_total`,
    help: "Total number of HTTP requests",
    labelNames: ["method", "route", "status_code"],
    registers: [registry],
  });

  // HTTP Request Duration Histogram
  httpRequestDurationSeconds = new Histogram({
    name: `${prefix}http_request_duration_seconds`,
    help: "HTTP request latency in seconds",
    labelNames: ["method", "route", "status_code"],
    buckets: httpDurationBuckets,
    registers: [registry],
  });

  // Authorization Checks Counter
  authorizationChecksTotal = new Counter({
    name: `${prefix}authorization_checks_total`,
    help: "Total number of authorization checks",
    labelNames: ["resource", "action", "result"],
    registers: [registry],
  });

  // Cache Operations Counter
  cacheOperationsTotal = new Counter({
    name: `${prefix}cache_operations_total`,
    help: "Total number of cache operations",
    labelNames: ["operation", "result"],
    registers: [registry],
  });

  // Database Query Duration Histogram
  dbQueryDurationSeconds = new Histogram({
    name: `${prefix}db_query_duration_seconds`,
    help: "Database query latency in seconds",
    labelNames: ["operation", "table"],
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
    registers: [registry],
  });

  // Webhook Deliveries Counter
  webhookDeliveriesTotal = new Counter({
    name: `${prefix}webhook_deliveries_total`,
    help: "Total number of webhook delivery attempts",
    labelNames: ["event_type", "status"],
    registers: [registry],
  });

  // Webhook Delivery Duration Histogram
  webhookDeliveryDurationSeconds = new Histogram({
    name: `${prefix}webhook_delivery_duration_seconds`,
    help: "Webhook delivery latency in seconds",
    labelNames: ["event_type", "status"],
    buckets: [0.1, 0.5, 1, 2.5, 5, 10],
    registers: [registry],
  });

  metricsInitialized = true;
  return registry;
}

/**
 * Get the metrics registry. Initializes with defaults if not already done.
 */
export function getRegistry(): Registry {
  if (!registry) {
    return initializeMetrics();
  }
  return registry;
}

/**
 * Record an HTTP request
 */
export function recordHttpRequest(
  method: string,
  route: string,
  statusCode: number,
  durationSeconds: number
): void {
  if (!(httpRequestsTotal && httpRequestDurationSeconds)) {
    return;
  }

  const labels = {
    method: method.toUpperCase(),
    route: normalizeRoute(route),
    status_code: statusCode.toString(),
  };

  httpRequestsTotal.inc(labels);
  httpRequestDurationSeconds.observe(labels, durationSeconds);
}

/**
 * Record an authorization check
 */
export function recordAuthorizationCheck(
  resource: string,
  action: string,
  allowed: boolean
): void {
  if (!authorizationChecksTotal) {
    return;
  }

  authorizationChecksTotal.inc({
    resource,
    action,
    result: allowed ? "allowed" : "denied",
  });
}

/**
 * Record a cache operation
 */
export function recordCacheOperation(
  operation: "get" | "set" | "delete" | "mget" | "mset",
  hit: boolean
): void {
  if (!cacheOperationsTotal) {
    return;
  }

  cacheOperationsTotal.inc({
    operation,
    result: hit ? "hit" : "miss",
  });
}

/**
 * Record a cache error
 */
export function recordCacheError(
  operation: "get" | "set" | "delete" | "mget" | "mset"
): void {
  if (!cacheOperationsTotal) {
    return;
  }

  cacheOperationsTotal.inc({
    operation,
    result: "error",
  });
}

/**
 * Record a database query
 */
export function recordDbQuery(
  operation: "select" | "insert" | "update" | "delete",
  table: string,
  durationSeconds: number
): void {
  if (!dbQueryDurationSeconds) {
    return;
  }

  dbQueryDurationSeconds.observe({ operation, table }, durationSeconds);
}

/**
 * Record a webhook delivery attempt
 */
export function recordWebhookDelivery(
  eventType: string,
  status: "success" | "failed" | "timeout",
  durationSeconds: number
): void {
  if (!(webhookDeliveriesTotal && webhookDeliveryDurationSeconds)) {
    return;
  }

  const labels = { event_type: eventType, status };
  webhookDeliveriesTotal.inc(labels);
  webhookDeliveryDurationSeconds.observe(labels, durationSeconds);
}

/**
 * Get all metrics as Prometheus text format
 */
export async function getMetricsText(): Promise<string> {
  return await getRegistry().metrics();
}

/**
 * Get the content type for Prometheus metrics
 */
export function getMetricsContentType(): string {
  return getRegistry().contentType;
}

/**
 * Clear all metrics (useful for testing)
 */
export function clearMetrics(): void {
  if (registry) {
    registry.clear();
  }
  metricsInitialized = false;
  registry = null;
  httpRequestsTotal = null;
  httpRequestDurationSeconds = null;
  authorizationChecksTotal = null;
  cacheOperationsTotal = null;
  dbQueryDurationSeconds = null;
  webhookDeliveriesTotal = null;
  webhookDeliveryDurationSeconds = null;
}

/**
 * Normalize route path by replacing dynamic segments with placeholders.
 * e.g., /v1/orgs/org_123/posts/post_456 -> /v1/orgs/:orgId/posts/:postId
 */
function normalizeRoute(path: string): string {
  return path
    .replace(/\/org_[a-zA-Z0-9_]+/g, "/:orgId")
    .replace(/\/usr_[a-zA-Z0-9_]+/g, "/:userId")
    .replace(/\/post_[a-zA-Z0-9_]+/g, "/:postId")
    .replace(/\/file_[a-zA-Z0-9_]+/g, "/:fileId")
    .replace(/\/whk_[a-zA-Z0-9_]+/g, "/:webhookId")
    .replace(/\/whd_[a-zA-Z0-9_]+/g, "/:deliveryId")
    .replace(/\/role_[a-zA-Z0-9_]+/g, "/:roleId")
    .replace(/\/[a-f0-9-]{36}/g, "/:uuid");
}
