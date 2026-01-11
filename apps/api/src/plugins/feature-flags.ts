import { buildFeatureFlagKey, type CacheProvider } from "@workspace/cache";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

interface FeatureFlagsDeps {
  cache: CacheProvider | null;
  cacheTtl: number;
  log: FastifyInstance["log"];
}

declare module "fastify" {
  interface FastifyInstance {
    /**
     * Check if an organization has access to a specific feature based on their subscription
     *
     * Uses caching to avoid repeated DB lookups for the same org+feature combo.
     * Cache is invalidated when subscription changes.
     *
     * @param orgId Organization ID
     * @param featureKey Feature key to check (e.g., "advanced_analytics", "custom_branding")
     * @returns true if the org has access to the feature, false otherwise
     */
    checkFeature(orgId: string, featureKey: string): Promise<boolean>;

    /**
     * Batch check multiple features for an organization
     * Optimized for UI rendering where multiple feature checks are needed at once
     *
     * @param orgId Organization ID
     * @param featureKeys Array of feature keys to check
     * @returns Map of featureKey -> enabled boolean
     */
    batchCheckFeatures(
      orgId: string,
      featureKeys: string[]
    ): Promise<Map<string, boolean>>;

    /**
     * Invalidate feature flag cache for an organization
     * Call this when subscription plan changes
     *
     * @param orgId Organization ID
     */
    invalidateFeatureCache(orgId: string): Promise<void>;
  }
}

/**
 * Fastify plugin for subscription-based feature flags
 *
 * Separated from authorization plugin for clean conceptual boundaries:
 * - Authorization: "Can this user perform this action?" (RBAC/ABAC)
 * - Feature flags: "Is this feature available for this organization?" (SaaS tiers)
 *
 * Uses caching for performance since feature flags rarely change mid-session.
 */
function featureFlagsPlugin(
  fastify: FastifyInstance,
  opts: {
    cache?: CacheProvider | null;
    cacheTtlSeconds?: number;
  }
): void {
  const deps: FeatureFlagsDeps = {
    cache: opts.cache ?? null,
    cacheTtl: opts.cacheTtlSeconds ?? 600, // 10 minutes default (longer than authz)
    log: fastify.log,
  };

  // Check single feature
  fastify.decorate(
    "checkFeature",
    async (orgId: string, featureKey: string): Promise<boolean> => {
      // Check cache first
      if (deps.cache) {
        const cacheKey = buildFeatureFlagKey(orgId, featureKey);
        const cachedValue = await deps.cache.get<boolean>(cacheKey);
        if (cachedValue !== null) {
          deps.log.debug({ cacheKey }, "Feature flag cache hit");
          return cachedValue;
        }
      }

      // Import dynamically to avoid circular dependencies
      const { checkFeatureAccess } = await import(
        "../modules/subscriptions/services/subscriptions.service"
      );

      // Use default application ID for now
      const { DEFAULT_APPLICATION_ID } = await import("@workspace/db/schema");
      const allowed = await checkFeatureAccess(
        orgId,
        DEFAULT_APPLICATION_ID,
        featureKey
      );

      // Cache the result
      if (deps.cache) {
        const cacheKey = buildFeatureFlagKey(orgId, featureKey);
        await deps.cache.set(cacheKey, allowed, deps.cacheTtl);
        deps.log.debug({ cacheKey, allowed }, "Feature flag cached");
      }

      return allowed;
    }
  );

  // Batch check features
  // Helper to resolve uncached features
  const resolveUncachedFeatures = async (
    orgId: string,
    uncachedKeys: string[]
  ): Promise<Map<string, boolean>> => {
    const results = new Map<string, boolean>();

    if (uncachedKeys.length === 0) {
      return results;
    }

    const { checkFeatureAccess } = await import(
      "../modules/subscriptions/services/subscriptions.service"
    );
    const { DEFAULT_APPLICATION_ID } = await import("@workspace/db/schema");

    for (const featureKey of uncachedKeys) {
      const allowed = await checkFeatureAccess(
        orgId,
        DEFAULT_APPLICATION_ID,
        featureKey
      );
      results.set(featureKey, allowed);

      // Cache the result
      if (deps.cache) {
        const cacheKey = buildFeatureFlagKey(orgId, featureKey);
        await deps.cache.set(cacheKey, allowed, deps.cacheTtl);
      }
    }

    return results;
  };

  // Batch check features
  const batchCheckFeatures = async (
    orgId: string,
    featureKeys: string[]
  ): Promise<Map<string, boolean>> => {
    const results = new Map<string, boolean>();

    // Check cache for all keys first
    const uncachedKeys: string[] = [];
    if (deps.cache) {
      for (const featureKey of featureKeys) {
        const cacheKey = buildFeatureFlagKey(orgId, featureKey);
        const cachedValue = await deps.cache.get<boolean>(cacheKey);
        if (cachedValue !== null) {
          results.set(featureKey, cachedValue);
        } else {
          uncachedKeys.push(featureKey);
        }
      }
    } else {
      uncachedKeys.push(...featureKeys);
    }

    // Fetch uncached features
    if (uncachedKeys.length > 0) {
      const fetched = await resolveUncachedFeatures(orgId, uncachedKeys);
      for (const [key, value] of fetched) {
        results.set(key, value);
      }
    }

    return results;
  };

  fastify.decorate("batchCheckFeatures", batchCheckFeatures);

  // Invalidate feature cache for an org
  fastify.decorate(
    "invalidateFeatureCache",
    async (orgId: string): Promise<void> => {
      if (deps.cache) {
        const pattern = `feature:${orgId}:*`;
        const count = await deps.cache.deletePattern(pattern);
        fastify.log.info(
          { orgId, count },
          "Invalidated feature flag cache for organization"
        );
      }
    }
  );
}

export default fp(featureFlagsPlugin, {
  name: "feature-flags",
  dependencies: [],
});
