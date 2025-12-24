import { Counter, Gauge, Histogram, Registry } from "prom-client";
import type {
  CacheOperationLabels,
  HistogramBuckets,
  OrgLabels,
  PermissionCheckLabels,
  PolicyOperationLabels,
} from "./types";

/**
 * Prometheus metrics for authorization system
 * Tracks permission checks, cache performance, and policy operations
 */
export class AuthorizationMetrics {
  private readonly registry: Registry;

  // Counters
  private readonly permissionChecksTotal: Counter<
    "result" | "resource" | "action" | "orgId"
  >;
  private readonly permissionDenialsTotal: Counter<
    "resource" | "action" | "orgId"
  >;
  private readonly cacheHitsTotal: Counter<"operation">;
  private readonly cacheMissesTotal: Counter<"operation">;

  // Histograms
  private readonly permissionCheckDuration: Histogram<"resource" | "cached">;
  private readonly policyOperationDuration: Histogram<"operation">;

  // Gauges
  private readonly cachedPoliciesCount: Gauge<"orgId">;
  private readonly totalPoliciesCount: Gauge<"orgId">;

  constructor(config?: { registry?: Registry; buckets?: HistogramBuckets }) {
    this.registry = config?.registry ?? new Registry();

    const durationBuckets = config?.buckets?.durationSeconds ?? [
      0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10,
    ];

    // Initialize counters
    this.permissionChecksTotal = new Counter({
      name: "authorization_permission_checks_total",
      help: "Total number of permission checks performed",
      labelNames: ["result", "resource", "action", "orgId"] as const,
      registers: [this.registry],
    });

    this.permissionDenialsTotal = new Counter({
      name: "authorization_permission_denials_total",
      help: "Total number of permission denials",
      labelNames: ["resource", "action", "orgId"] as const,
      registers: [this.registry],
    });

    this.cacheHitsTotal = new Counter({
      name: "authorization_cache_hits_total",
      help: "Total number of cache hits",
      labelNames: ["operation"] as const,
      registers: [this.registry],
    });

    this.cacheMissesTotal = new Counter({
      name: "authorization_cache_misses_total",
      help: "Total number of cache misses",
      labelNames: ["operation"] as const,
      registers: [this.registry],
    });

    // Initialize histograms
    this.permissionCheckDuration = new Histogram({
      name: "authorization_permission_check_duration_seconds",
      help: "Duration of permission checks in seconds",
      labelNames: ["resource", "cached"] as const,
      buckets: durationBuckets,
      registers: [this.registry],
    });

    this.policyOperationDuration = new Histogram({
      name: "authorization_policy_operation_duration_seconds",
      help: "Duration of policy operations in seconds",
      labelNames: ["operation"] as const,
      buckets: durationBuckets,
      registers: [this.registry],
    });

    // Initialize gauges
    this.cachedPoliciesCount = new Gauge({
      name: "authorization_cached_policies_count",
      help: "Number of policies currently cached",
      labelNames: ["orgId"] as const,
      registers: [this.registry],
    });

    this.totalPoliciesCount = new Gauge({
      name: "authorization_total_policies_count",
      help: "Total number of policies in the system",
      labelNames: ["orgId"] as const,
      registers: [this.registry],
    });
  }

  /**
   * Record a permission check
   */
  recordPermissionCheck(
    labels: PermissionCheckLabels,
    durationSeconds: number
  ): void {
    this.permissionChecksTotal.inc({
      result: labels.result,
      resource: labels.resource,
      action: labels.action,
      orgId: labels.orgId,
    });

    if (labels.result === "denied") {
      this.permissionDenialsTotal.inc({
        resource: labels.resource,
        action: labels.action,
        orgId: labels.orgId,
      });
    }

    this.permissionCheckDuration.observe(
      {
        resource: labels.resource,
        cached: labels.cached ? "true" : "false",
      },
      durationSeconds
    );
  }

  /**
   * Record a cache hit
   */
  recordCacheHit(labels: CacheOperationLabels): void {
    this.cacheHitsTotal.inc({ operation: labels.operation });
  }

  /**
   * Record a cache miss
   */
  recordCacheMiss(labels: CacheOperationLabels): void {
    this.cacheMissesTotal.inc({ operation: labels.operation });
  }

  /**
   * Record a policy operation duration
   */
  recordPolicyOperation(
    labels: PolicyOperationLabels,
    durationSeconds: number
  ): void {
    this.policyOperationDuration.observe(
      { operation: labels.operation },
      durationSeconds
    );
  }

  /**
   * Update cached policies count for an organization
   */
  setCachedPoliciesCount(labels: OrgLabels, count: number): void {
    this.cachedPoliciesCount.set({ orgId: labels.orgId }, count);
  }

  /**
   * Update total policies count for an organization
   */
  setTotalPoliciesCount(labels: OrgLabels, count: number): void {
    this.totalPoliciesCount.set({ orgId: labels.orgId }, count);
  }

  /**
   * Get the metrics registry for exposing metrics
   */
  getRegistry(): Registry {
    return this.registry;
  }

  /**
   * Get metrics in Prometheus format
   */
  getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  /**
   * Reset all metrics (useful for testing)
   */
  reset(): void {
    this.registry.resetMetrics();
  }
}
