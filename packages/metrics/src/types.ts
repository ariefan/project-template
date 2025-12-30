/**
 * Metrics package types
 */

export interface MetricsConfig {
  /** Enable default metrics collection (CPU, memory, etc.) */
  collectDefaultMetrics?: boolean;
  /** Prefix for all metric names */
  prefix?: string;
  /** Default labels to add to all metrics */
  defaultLabels?: Record<string, string>;
  /** Custom buckets for HTTP request duration histogram */
  httpDurationBuckets?: number[];
}

export interface HttpRequestLabels {
  method: string;
  route: string;
  statusCode: string;
}

export interface AuthorizationLabels {
  resource: string;
  action: string;
  result: "allowed" | "denied";
}

export interface CacheLabels {
  operation: "get" | "set" | "delete" | "mget" | "mset";
  result: "hit" | "miss" | "error";
}

export interface DatabaseLabels {
  operation: "select" | "insert" | "update" | "delete";
  table: string;
}
