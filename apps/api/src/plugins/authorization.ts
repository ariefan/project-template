import type { AuthorizationAuditService } from "@workspace/authorization";
import {
  buildAuthzKey,
  buildAuthzPatternForOrg,
  buildAuthzPatternForUser,
  type CacheProvider,
} from "@workspace/cache";
import type * as casbin from "casbin";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

interface AuthorizeParams {
  userId: string;
  orgId: string;
  resource: string;
  action: string;
}

interface AuthorizationDeps {
  enforcer: casbin.Enforcer;
  cache: CacheProvider | null;
  cacheTtl: number;
  auditService: AuthorizationAuditService | null;
  logPermissionDenials: boolean;
  log: FastifyInstance["log"];
}

/**
 * Check cache for authorization result
 */
async function checkCache(
  params: AuthorizeParams,
  deps: AuthorizationDeps
): Promise<{ hit: boolean; allowed: boolean | null }> {
  if (!deps.cache) {
    return { hit: false, allowed: null };
  }

  const cacheKey = buildAuthzKey(
    params.userId,
    params.orgId,
    params.resource,
    params.action
  );
  const cachedValue = await deps.cache.get<boolean>(cacheKey);

  if (cachedValue !== null) {
    deps.log.debug({ cacheKey }, "Authorization cache hit");
    return { hit: true, allowed: cachedValue };
  }

  return { hit: false, allowed: null };
}

/**
 * Store authorization result in cache
 */
async function storeInCache(
  params: AuthorizeParams,
  allowed: boolean,
  deps: AuthorizationDeps
): Promise<void> {
  if (!deps.cache) {
    return;
  }

  const cacheKey = buildAuthzKey(
    params.userId,
    params.orgId,
    params.resource,
    params.action
  );
  await deps.cache.set(cacheKey, allowed, deps.cacheTtl);
  deps.log.debug({ cacheKey, allowed }, "Authorization cached");
}

/**
 * Log permission denial to audit service
 */
async function logDenialIfEnabled(
  params: AuthorizeParams,
  deps: AuthorizationDeps
): Promise<void> {
  if (!deps.auditService) {
    return;
  }
  if (!deps.logPermissionDenials) {
    return;
  }

  try {
    await deps.auditService.logPermissionDenied({
      userId: params.userId,
      orgId: params.orgId,
      resource: params.resource,
      action: params.action,
      context: { actorId: params.userId },
    });
  } catch (auditError) {
    deps.log.error(
      { ...params, error: auditError },
      "Failed to log permission denial"
    );
  }
}

/**
 * Perform authorization check with caching and logging
 */
async function performAuthorizationCheck(
  params: AuthorizeParams,
  deps: AuthorizationDeps
): Promise<boolean> {
  // Check cache first
  const cacheResult = await checkCache(params, deps);
  if (cacheResult.hit && cacheResult.allowed !== null) {
    return cacheResult.allowed;
  }

  // Cache miss - check enforcer
  const allowed = await deps.enforcer.enforce(
    params.userId,
    params.orgId,
    params.resource,
    params.action
  );

  // Log denial if enabled
  if (!allowed) {
    await logDenialIfEnabled(params, deps);
  }

  // Store in cache
  await storeInCache(params, allowed, deps);

  return allowed;
}

declare module "fastify" {
  interface FastifyInstance {
    /**
     * Casbin enforcer instance for manual authorization checks
     */
    readonly enforcer: casbin.Enforcer;

    /**
     * Cache provider instance (may be null if caching is disabled)
     */
    readonly authzCache: CacheProvider | null;

    /**
     * Authorization audit service for logging auth events
     */
    readonly auditService: AuthorizationAuditService | null;

    /**
     * Check if a user has permission for a resource action in an organization
     *
     * @param userId User ID from better-auth
     * @param orgId Organization ID
     * @param resource Resource name (posts, comments, etc.)
     * @param action Action name (read, create, update, delete, manage)
     * @returns true if user has permission, false otherwise
     */
    authorize(
      userId: string,
      orgId: string,
      resource: string,
      action: string
    ): Promise<boolean>;

    /**
     * Invalidate authorization cache for a specific user
     *
     * @param userId User ID
     * @param orgId Optional organization ID (if provided, only invalidates cache for that org)
     */
    invalidateAuthzCache(userId: string, orgId?: string): Promise<void>;

    /**
     * Invalidate authorization cache for an entire organization
     *
     * @param orgId Organization ID
     */
    invalidateOrgAuthzCache(orgId: string): Promise<void>;
  }
}

/**
 * Fastify plugin for Casbin authorization with optional caching and audit logging
 * Provides enforcer instance, authorize() helper method, cache invalidation, and audit service
 */
function authorizationPlugin(
  fastify: FastifyInstance,
  opts: {
    enforcer: casbin.Enforcer;
    cache?: CacheProvider | null;
    cacheTtlSeconds?: number;
    auditService?: AuthorizationAuditService | null;
    logPermissionDenials?: boolean;
  }
): void {
  const deps: AuthorizationDeps = {
    enforcer: opts.enforcer,
    cache: opts.cache ?? null,
    cacheTtl: opts.cacheTtlSeconds ?? 300, // 5 minutes default
    auditService: opts.auditService ?? null,
    logPermissionDenials: opts.logPermissionDenials ?? false,
    log: fastify.log,
  };

  // Decorate fastify with enforcer instance
  fastify.decorate("enforcer", opts.enforcer);

  // Decorate fastify with cache provider instance
  fastify.decorate("authzCache", deps.cache);

  // Decorate fastify with audit service instance
  fastify.decorate("auditService", deps.auditService);

  // Decorate fastify with convenience authorize method
  fastify.decorate(
    "authorize",
    async (
      userId: string,
      orgId: string,
      resource: string,
      action: string
    ): Promise<boolean> => {
      try {
        return await performAuthorizationCheck(
          { userId, orgId, resource, action },
          deps
        );
      } catch (error) {
        fastify.log.error(
          { userId, orgId, resource, action, error },
          "Authorization check failed"
        );
        return false;
      }
    }
  );

  // Cache invalidation for user in organization
  fastify.decorate(
    "invalidateAuthzCache",
    async (userId: string, orgId?: string): Promise<void> => {
      if (deps.cache) {
        const pattern = buildAuthzPatternForUser(userId, orgId);
        const count = await deps.cache.deletePattern(pattern);
        fastify.log.info(
          { userId, orgId, count },
          "Invalidated user authorization cache"
        );
      }
    }
  );

  // Cache invalidation for organization
  fastify.decorate(
    "invalidateOrgAuthzCache",
    async (orgId: string): Promise<void> => {
      if (deps.cache) {
        const pattern = buildAuthzPatternForOrg(orgId);
        const count = await deps.cache.deletePattern(pattern);
        fastify.log.info(
          { orgId, count },
          "Invalidated organization authorization cache"
        );
      }
    }
  );
}

export default fp(authorizationPlugin, {
  name: "authorization",
  dependencies: [],
});
