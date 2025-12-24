/**
 * Labels for authorization permission check metrics
 */
export type PermissionCheckLabels = {
  result: "allowed" | "denied";
  resource: string;
  action: string;
  orgId: string;
  cached?: boolean;
};

/**
 * Labels for cache operation metrics
 */
export type CacheOperationLabels = {
  operation: "get" | "set" | "delete" | "deletePattern";
};

/**
 * Labels for policy operation metrics
 */
export type PolicyOperationLabels = {
  operation: "add" | "remove" | "sync";
  orgId: string;
};

/**
 * Labels for organization-specific metrics
 */
export type OrgLabels = {
  orgId: string;
};

/**
 * Histogram bucket configuration
 */
export type HistogramBuckets = {
  /** Buckets for duration in seconds */
  durationSeconds?: number[];
};
