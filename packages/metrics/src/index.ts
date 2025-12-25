/**
 * @workspace/metrics
 * Prometheus metrics for API observability
 *
 * Usage:
 * 1. Initialize metrics at app startup: initializeMetrics()
 * 2. Record metrics in your code using helper functions
 * 3. Expose /metrics endpoint using getMetricsText()
 */

// Core metrics functions
export {
  clearMetrics,
  getMetricsContentType,
  getMetricsText,
  getRegistry,
  initializeMetrics,
  recordAuthorizationCheck,
  recordCacheError,
  recordCacheOperation,
  recordDbQuery,
  recordHttpRequest,
  recordWebhookDelivery,
} from "./metrics";

// Types
export type {
  AuthorizationLabels,
  CacheLabels,
  DatabaseLabels,
  HttpRequestLabels,
  MetricsConfig,
} from "./types";
