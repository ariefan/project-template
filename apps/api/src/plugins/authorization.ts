import type { AuthorizationAuditService } from "@workspace/authorization";
import {
  buildAuthzKey,
  buildAuthzPatternForOrg,
  buildAuthzPatternForUser,
  type CacheProvider,
} from "@workspace/cache";
import { and, type Database, eq, isNull, or } from "@workspace/db";
import {
  DEFAULT_APPLICATION_ID,
  roles,
  SystemRoles,
  userRoleAssignments,
} from "@workspace/db/schema";
import type * as casbin from "casbin";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

interface AuthorizeParams {
  userId: string;
  appId: string;
  orgId: string;
  resource: string;
  action: string;
  resourceOwnerId?: string;
}

interface AuthorizationDeps {
  enforcer: casbin.Enforcer;
  db: Database;
  cache: CacheProvider | null;
  cacheTtl: number;
  auditService: AuthorizationAuditService | null;
  logPermissionDenials: boolean;
  log: FastifyInstance["log"];
}

/**
 * Look up user's roles from database for a specific app + tenant
 * Returns array of role names (supports multiple roles per user)
 */
async function lookupUserRoles(
  userId: string,
  appId: string,
  tenantId: string | null,
  db: Database
): Promise<string[]> {
  const conditions = [
    eq(userRoleAssignments.userId, userId),
    eq(userRoleAssignments.applicationId, appId),
  ];

  if (tenantId) {
    // Match specific tenant OR global roles (null tenant)
    const orCondition = or(
      eq(userRoleAssignments.tenantId, tenantId),
      isNull(userRoleAssignments.tenantId)
    );
    if (orCondition) {
      conditions.push(orCondition);
    }
  } else {
    conditions.push(isNull(userRoleAssignments.tenantId));
  }

  const result = await db
    .select({
      roleName: roles.name,
    })
    .from(userRoleAssignments)
    .innerJoin(roles, eq(userRoleAssignments.roleId, roles.id))
    .where(and(...conditions));

  return result.map((r) => r.roleName);
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
 * Perform authorization check with DB role lookup, caching, and logging
 *
 * Flow:
 * 1. Check cache
 * 2. Look up user's roles from DB (user_role_assignments table)
 * 3. Pass each role to Casbin for permission evaluation (short-circuit on first allow)
 * 4. Cache result
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

  // Look up user's roles from DB (supports multiple roles)
  const userRoles = await lookupUserRoles(
    params.userId,
    params.appId,
    params.orgId,
    deps.db
  );

  // Best Practice: Every authenticated user implicitly has the "User" role
  // This ensures members/admins also inherit base platform permissions
  if (!userRoles.includes(SystemRoles.USER)) {
    userRoles.push(SystemRoles.USER);
  }

  // GOD MODE: Super Admin Bypass
  if (userRoles.includes(SystemRoles.SUPER_ADMIN)) {
    // deps.log.debug(
    //   { userId: params.userId, orgId: params.orgId },
    //   "Super User bypass granted"
    // );
    await storeInCache(params, true, deps);
    return true;
  }

  // No roles assigned = no permission
  if (userRoles.length === 0) {
    deps.log.debug(
      { userId: params.userId, appId: params.appId, orgId: params.orgId },
      "No roles found for user in app+tenant"
    );
    await logDenialIfEnabled(params, deps);
    await storeInCache(params, false, deps);
    return false;
  }

  // Check each role - short-circuit on first allow
  // Casbin model: (sub, role, app, tenant, obj, act, resourceOwnerId)
  for (const role of userRoles) {
    const allowed = await deps.enforcer.enforce(
      params.userId,
      role,
      params.appId,
      params.orgId,
      params.resource,
      params.action,
      params.resourceOwnerId ?? ""
    );

    if (allowed) {
      // Store allow in cache and return
      await storeInCache(params, true, deps);
      return true;
    }
  }

  // All roles denied - log and cache
  await logDenialIfEnabled(params, deps);
  await storeInCache(params, false, deps);
  return false;
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
     * Flow:
     * 1. Look up user's role from DB (user_role_assignments)
     * 2. Pass resolved role to Casbin for permission evaluation
     *
     * @param userId User ID from better-auth
     * @param orgId Organization ID (tenant)
     * @param resource Resource name (posts, comments, etc.)
     * @param action Action name (read, create, update, delete, manage)
     * @param resourceOwnerId Optional owner ID for owner-based permissions
     * @returns true if user has permission, false otherwise
     */
    authorize(
      userId: string,
      orgId: string,
      resource: string,
      action: string,
      resourceOwnerId?: string
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

    /**
     * Batch authorization check for multiple resources
     * Optimized for list views where each item may have different owners
     *
     * @param userId User ID from better-auth
     * @param orgId Organization ID (tenant)
     * @param resource Resource name (posts, comments, etc.)
     * @param action Action name (read, create, update, delete, manage)
     * @param resourceOwnerMap Map of resourceId -> ownerId
     * @returns Map of resourceId -> allowed boolean
     */
    batchAuthorize(
      userId: string,
      orgId: string,
      resource: string,
      action: string,
      resourceOwnerMap: Map<string, string>
    ): Promise<Map<string, boolean>>;
  }
}

/**
 * Fastify plugin for Casbin authorization with DB-driven role lookup
 *
 * Architecture:
 * - DB owns user→role mapping (user_role_assignments table)
 * - Casbin owns role→permission evaluation
 *
 * Note: db is required for production use. Tests may omit it if not testing
 * the authorize() method (e.g., testing cache behavior only).
 */
function authorizationPlugin(
  fastify: FastifyInstance,
  opts: {
    enforcer: casbin.Enforcer;
    db?: Database;
    cache?: CacheProvider | null;
    cacheTtlSeconds?: number;
    auditService?: AuthorizationAuditService | null;
    logPermissionDenials?: boolean;
  }
): void {
  const deps: AuthorizationDeps = {
    enforcer: opts.enforcer,
    db: opts.db as Database, // May be undefined in tests
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
      action: string,
      resourceOwnerId?: string
    ): Promise<boolean> => {
      // Runtime check: db is required for authorization
      if (!opts.db) {
        throw new Error(
          "Database connection required for authorization. " +
            "Ensure db is passed to authorization plugin."
        );
      }

      try {
        return await performAuthorizationCheck(
          {
            userId,
            appId: DEFAULT_APPLICATION_ID,
            orgId,
            resource,
            action,
            resourceOwnerId,
          },
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

  // Batch authorization for list endpoints
  // Helper for checking single resource permission
  const checkSingleResourcePermission = async (
    userId: string,
    orgId: string,
    resource: string,
    action: string,
    resourceId: string,
    ownerId: string,
    userRoles: string[]
  ): Promise<boolean> => {
    // Check cache first
    const cacheKey = buildAuthzKey(userId, orgId, resource, action);
    const cachedValue = deps.cache
      ? await deps.cache.get<boolean>(`${cacheKey}:${resourceId}`)
      : null;

    if (cachedValue !== null) {
      return cachedValue;
    }

    // Check each role for this resource
    let allowed = false;
    for (const role of userRoles) {
      const roleAllowed = await deps.enforcer.enforce(
        userId,
        role,
        DEFAULT_APPLICATION_ID,
        orgId,
        resource,
        action,
        ownerId
      );

      if (roleAllowed) {
        allowed = true;
        break;
      }
    }

    // Cache the result
    if (deps.cache) {
      await deps.cache.set(`${cacheKey}:${resourceId}`, allowed, deps.cacheTtl);
    }

    return allowed;
  };

  // Batch authorization for list endpoints
  const batchAuthorize = async (
    userId: string,
    orgId: string,
    resource: string,
    action: string,
    resourceOwnerMap: Map<string, string>
  ): Promise<Map<string, boolean>> => {
    // Runtime check: db is required for authorization
    if (!opts.db) {
      throw new Error(
        "Database connection required for authorization. " +
          "Ensure 'db' option is provided when registering the plugin."
      );
    }

    const results = new Map<string, boolean>();

    // Single DB lookup for user's roles (reused for all resources)
    const userRoles = await lookupUserRoles(
      userId,
      DEFAULT_APPLICATION_ID,
      orgId,
      opts.db
    );

    // No roles = deny all
    if (userRoles.length === 0) {
      for (const resourceId of resourceOwnerMap.keys()) {
        results.set(resourceId, false);
      }
      return results;
    }

    // Check each resource
    for (const [resourceId, ownerId] of resourceOwnerMap) {
      const allowed = await checkSingleResourcePermission(
        userId,
        orgId,
        resource,
        action,
        resourceId,
        ownerId,
        userRoles
      );
      results.set(resourceId, allowed);
    }

    return results;
  };

  fastify.decorate("batchAuthorize", batchAuthorize);
}

export default fp(authorizationPlugin, {
  name: "authorization",
  dependencies: [],
});
