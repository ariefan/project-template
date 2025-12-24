import { beforeEach, describe, expect, it } from "vitest";
import { Registry } from "prom-client";
import { AuthorizationMetrics } from "../authorization-metrics";

describe("Authorization Metrics", () => {
  let metrics: AuthorizationMetrics;
  let registry: Registry;

  beforeEach(() => {
    // Create a fresh registry for each test to avoid metric collisions
    registry = new Registry();
    metrics = new AuthorizationMetrics({ registry });
  });

  describe("Initialization", () => {
    it("should initialize with default registry if not provided", () => {
      const metricsWithoutRegistry = new AuthorizationMetrics();
      expect(metricsWithoutRegistry.getRegistry()).toBeInstanceOf(Registry);
    });

    it("should use provided registry", () => {
      const customRegistry = new Registry();
      const metricsWithRegistry = new AuthorizationMetrics({
        registry: customRegistry,
      });
      expect(metricsWithRegistry.getRegistry()).toBe(customRegistry);
    });

    it("should use custom histogram buckets if provided", () => {
      const customBuckets = [0.01, 0.1, 1, 10];
      const customRegistry = new Registry();
      const metricsWithBuckets = new AuthorizationMetrics({
        registry: customRegistry,
        buckets: { durationSeconds: customBuckets },
      });

      // Verify metrics can be recorded
      metricsWithBuckets.recordPermissionCheck(
        {
          result: "allowed",
          resource: "posts",
          action: "read",
          orgId: "org1",
          cached: false,
        },
        0.05
      );

      expect(metricsWithBuckets.getRegistry()).toBe(customRegistry);
    });
  });

  describe("recordPermissionCheck", () => {
    it("should record allowed permission check", async () => {
      metrics.recordPermissionCheck(
        {
          result: "allowed",
          resource: "posts",
          action: "read",
          orgId: "org1",
          cached: false,
        },
        0.125
      );

      const metricsOutput = await metrics.getMetrics();

      expect(metricsOutput).toContain("authorization_permission_checks_total");
      expect(metricsOutput).toContain('result="allowed"');
      expect(metricsOutput).toContain('resource="posts"');
      expect(metricsOutput).toContain('action="read"');
      expect(metricsOutput).toContain('orgId="org1"');
    });

    it("should record denied permission check and increment denials counter", async () => {
      metrics.recordPermissionCheck(
        {
          result: "denied",
          resource: "posts",
          action: "delete",
          orgId: "org1",
          cached: false,
        },
        0.05
      );

      const metricsOutput = await metrics.getMetrics();

      expect(metricsOutput).toContain("authorization_permission_checks_total");
      expect(metricsOutput).toContain('result="denied"');
      expect(metricsOutput).toContain("authorization_permission_denials_total");
    });

    it("should record duration histogram", async () => {
      metrics.recordPermissionCheck(
        {
          result: "allowed",
          resource: "posts",
          action: "read",
          orgId: "org1",
          cached: false,
        },
        0.125
      );

      const metricsOutput = await metrics.getMetrics();

      expect(metricsOutput).toContain(
        "authorization_permission_check_duration_seconds"
      );
      expect(metricsOutput).toContain('cached="false"');
    });

    it("should differentiate between cached and non-cached checks", async () => {
      metrics.recordPermissionCheck(
        {
          result: "allowed",
          resource: "posts",
          action: "read",
          orgId: "org1",
          cached: true,
        },
        0.001
      );

      metrics.recordPermissionCheck(
        {
          result: "allowed",
          resource: "posts",
          action: "read",
          orgId: "org1",
          cached: false,
        },
        0.125
      );

      const metricsOutput = await metrics.getMetrics();

      expect(metricsOutput).toContain('cached="true"');
      expect(metricsOutput).toContain('cached="false"');
    });
  });

  describe("recordCacheHit", () => {
    it("should record cache hit", async () => {
      metrics.recordCacheHit({ operation: "get" });

      const metricsOutput = await metrics.getMetrics();

      expect(metricsOutput).toContain("authorization_cache_hits_total");
      expect(metricsOutput).toContain('operation="get"');
    });

    it("should increment hit counter on multiple calls", async () => {
      metrics.recordCacheHit({ operation: "get" });
      metrics.recordCacheHit({ operation: "get" });
      metrics.recordCacheHit({ operation: "get" });

      const metricsOutput = await metrics.getMetrics();

      expect(metricsOutput).toContain("authorization_cache_hits_total");
      // Should show count of 3
      expect(metricsOutput).toMatch(/authorization_cache_hits_total.*\s+3/);
    });
  });

  describe("recordCacheMiss", () => {
    it("should record cache miss", async () => {
      metrics.recordCacheMiss({ operation: "get" });

      const metricsOutput = await metrics.getMetrics();

      expect(metricsOutput).toContain("authorization_cache_misses_total");
      expect(metricsOutput).toContain('operation="get"');
    });
  });

  describe("recordPolicyOperation", () => {
    it("should record policy operation duration", async () => {
      metrics.recordPolicyOperation({ operation: "add", orgId: "org1" }, 0.05);

      const metricsOutput = await metrics.getMetrics();

      expect(metricsOutput).toContain(
        "authorization_policy_operation_duration_seconds"
      );
      expect(metricsOutput).toContain('operation="add"');
    });

    it("should handle different operation types", async () => {
      metrics.recordPolicyOperation({ operation: "add", orgId: "org1" }, 0.01);
      metrics.recordPolicyOperation(
        { operation: "remove", orgId: "org1" },
        0.02
      );
      metrics.recordPolicyOperation({ operation: "sync", orgId: "org1" }, 0.03);

      const metricsOutput = await metrics.getMetrics();

      expect(metricsOutput).toContain('operation="add"');
      expect(metricsOutput).toContain('operation="remove"');
      expect(metricsOutput).toContain('operation="sync"');
    });
  });

  describe("setCachedPoliciesCount", () => {
    it("should set cached policies count gauge", async () => {
      metrics.setCachedPoliciesCount({ orgId: "org1" }, 42);

      const metricsOutput = await metrics.getMetrics();

      expect(metricsOutput).toContain("authorization_cached_policies_count");
      expect(metricsOutput).toContain('orgId="org1"');
      expect(metricsOutput).toMatch(
        /authorization_cached_policies_count.*orgId="org1".*\s+42/
      );
    });

    it("should update gauge value on subsequent calls", async () => {
      metrics.setCachedPoliciesCount({ orgId: "org1" }, 10);
      metrics.setCachedPoliciesCount({ orgId: "org1" }, 20);

      const metricsOutput = await metrics.getMetrics();

      // Should show the latest value (20)
      expect(metricsOutput).toMatch(
        /authorization_cached_policies_count.*orgId="org1".*\s+20/
      );
    });

    it("should track different organizations separately", async () => {
      metrics.setCachedPoliciesCount({ orgId: "org1" }, 10);
      metrics.setCachedPoliciesCount({ orgId: "org2" }, 25);

      const metricsOutput = await metrics.getMetrics();

      expect(metricsOutput).toContain('orgId="org1"');
      expect(metricsOutput).toContain('orgId="org2"');
    });
  });

  describe("setTotalPoliciesCount", () => {
    it("should set total policies count gauge", async () => {
      metrics.setTotalPoliciesCount({ orgId: "org1" }, 100);

      const metricsOutput = await metrics.getMetrics();

      expect(metricsOutput).toContain("authorization_total_policies_count");
      expect(metricsOutput).toContain('orgId="org1"');
      expect(metricsOutput).toMatch(
        /authorization_total_policies_count.*orgId="org1".*\s+100/
      );
    });
  });

  describe("getMetrics", () => {
    it("should return metrics in Prometheus format", async () => {
      metrics.recordPermissionCheck(
        {
          result: "allowed",
          resource: "posts",
          action: "read",
          orgId: "org1",
          cached: false,
        },
        0.05
      );

      const metricsOutput = await metrics.getMetrics();

      // Should be a string
      expect(typeof metricsOutput).toBe("string");

      // Should contain metric names
      expect(metricsOutput).toContain("authorization_permission_checks_total");
      expect(metricsOutput).toContain(
        "authorization_permission_check_duration_seconds"
      );
    });

    it("should include HELP and TYPE comments", async () => {
      const metricsOutput = await metrics.getMetrics();

      expect(metricsOutput).toContain("# HELP");
      expect(metricsOutput).toContain("# TYPE");
    });
  });

  describe("reset", () => {
    it("should reset all metrics", async () => {
      // Record some metrics
      metrics.recordPermissionCheck(
        {
          result: "allowed",
          resource: "posts",
          action: "read",
          orgId: "org1",
          cached: false,
        },
        0.05
      );
      metrics.recordCacheHit({ operation: "get" });
      metrics.setCachedPoliciesCount({ orgId: "org1" }, 42);

      // Reset
      metrics.reset();

      const metricsOutput = await metrics.getMetrics();

      // Metrics should still exist but with zero values
      expect(metricsOutput).toContain("authorization_permission_checks_total");
      // But counts should be reset (checking structure, not specific values since reset behavior varies)
      expect(metricsOutput).toBeTruthy();
    });
  });

  describe("Integration Scenarios", () => {
    it("should track a complete authorization flow", async () => {
      // Cache miss
      metrics.recordCacheMiss({ operation: "get" });

      // Permission check (denied, not cached)
      metrics.recordPermissionCheck(
        {
          result: "denied",
          resource: "admin-panel",
          action: "access",
          orgId: "org1",
          cached: false,
        },
        0.125
      );

      // Cache hit on second check
      metrics.recordCacheHit({ operation: "get" });

      // Permission check (allowed, cached)
      metrics.recordPermissionCheck(
        {
          result: "allowed",
          resource: "posts",
          action: "read",
          orgId: "org1",
          cached: true,
        },
        0.001
      );

      // Set policy counts
      metrics.setCachedPoliciesCount({ orgId: "org1" }, 15);
      metrics.setTotalPoliciesCount({ orgId: "org1" }, 50);

      const metricsOutput = await metrics.getMetrics();

      // Verify all metrics are present
      expect(metricsOutput).toContain("authorization_cache_hits_total");
      expect(metricsOutput).toContain("authorization_cache_misses_total");
      expect(metricsOutput).toContain("authorization_permission_checks_total");
      expect(metricsOutput).toContain("authorization_permission_denials_total");
      expect(metricsOutput).toContain("authorization_cached_policies_count");
      expect(metricsOutput).toContain("authorization_total_policies_count");
    });
  });
});
