/**
 * Metrics package types
 */

export type MetricsConfig = {
  /** Enable default metrics collection (CPU, memory, etc.) */
  collectDefaultMetrics?: boolean;
  /** Prefix for all metric names */
  prefix?: string;
  /** Default labels to add to all metrics */
  defaultLabels?: Record<string, string>;
  /** Custom buckets for HTTP request duration histogram */
  httpDurationBuckets?: number[];
};

export type HttpRequestLabels = {
  method: string;
  route: string;
  statusCode: string;
};

export type AuthorizationLabels = {
  resource: string;
  action: string;
  result: "allowed" | "denied";
};

export type CacheLabels = {
  operation: "get" | "set" | "delete" | "mget" | "mset";
  result: "hit" | "miss" | "error";
};

export type DatabaseLabels = {
  operation: "select" | "insert" | "update" | "delete";
  table: string;
};
