import type { AuthorizationAuditService } from "@workspace/authorization";
import type { CacheProvider } from "@workspace/cache";
import type { Database } from "@workspace/db";
import type { Enforcer } from "casbin";
import Fastify, { type FastifyInstance } from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import authorizationPlugin from "../authorization";

/**
 * Create a mock database that returns specified roles for user lookups
 */
function createMockDb(roles: string[] = ["member"]): Database {
  const mockResult = roles.map((roleName) => ({ roleName }));
  return {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(mockResult),
  } as unknown as Database;
}

describe("Authorization Plugin", () => {
  let app: FastifyInstance;
  let mockCache: CacheProvider;
  let mockAuditService: AuthorizationAuditService;
  let mockEnforcer: Enforcer;
  let mockDb: Database;

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    app = Fastify({ logger: false });

    // Create mock enforcer
    mockEnforcer = {
      enforce: vi.fn(),
      addPolicy: vi.fn(),
      removePolicy: vi.fn(),
      getFilteredPolicy: vi.fn(),
      getRolesForUserInDomain: vi.fn(),
      enableAutoSave: vi.fn(),
    } as unknown as Enforcer;

    // Create mock database that returns a role
    mockDb = createMockDb(["member"]);

    // Create mock cache provider
    mockCache = {
      name: "mock",
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      deletePattern: vi.fn(),
      clear: vi.fn(),
      mget: vi.fn().mockResolvedValue(new Map()),
      mset: vi.fn(),
      ping: vi.fn().mockResolvedValue(true),
    };

    // Create mock audit service
    mockAuditService = {
      logPolicyAdded: vi.fn(),
      logPolicyRemoved: vi.fn(),
      logPermissionDenied: vi.fn(),
      logPermissionGranted: vi.fn(),
      logRoleAssigned: vi.fn(),
      logRoleRemoved: vi.fn(),
      verifyHashChainIntegrity: vi.fn(),
    } as unknown as AuthorizationAuditService;
  });

  describe("Plugin Registration", () => {
    it("should register plugin successfully", async () => {
      await app.register(authorizationPlugin, { enforcer: mockEnforcer });

      expect(app.enforcer).toBeDefined();
      expect(app.authorize).toBeDefined();
      expect(app.invalidateAuthzCache).toBeDefined();
      expect(app.invalidateOrgAuthzCache).toBeDefined();
    });

    it("should register with cache provider", async () => {
      await app.register(authorizationPlugin, {
        enforcer: mockEnforcer,
        cache: mockCache,
      });

      expect(app.authzCache).toBe(mockCache);
    });

    it("should register with audit service", async () => {
      await app.register(authorizationPlugin, {
        enforcer: mockEnforcer,
        auditService: mockAuditService,
      });

      expect(app.auditService).toBe(mockAuditService);
    });
  });

  describe("authorize() method", () => {
    it("should return false when enforcer denies", async () => {
      await app.register(authorizationPlugin, {
        enforcer: mockEnforcer,
        db: mockDb,
      });

      // Mock enforcer to deny
      vi.spyOn(app.enforcer, "enforce").mockResolvedValue(false);

      const result = await app.authorize("user1", "org1", "posts", "delete");

      expect(result).toBe(false);
    });

    it("should return true when enforcer allows", async () => {
      await app.register(authorizationPlugin, {
        enforcer: mockEnforcer,
        db: mockDb,
      });

      // Mock enforcer to allow
      vi.spyOn(app.enforcer, "enforce").mockResolvedValue(true);

      const result = await app.authorize("user1", "org1", "posts", "read");

      expect(result).toBe(true);
    });

    it("should check cache first when cache is enabled", async () => {
      await app.register(authorizationPlugin, {
        enforcer: mockEnforcer,
        db: mockDb,
        cache: mockCache,
      });

      // Create a spy on the enforcer's enforce method
      const enforceSpy = vi.spyOn(app.enforcer, "enforce");

      // Mock cache hit
      vi.mocked(mockCache.get).mockResolvedValue(true);

      const result = await app.authorize("user1", "org1", "posts", "read");

      expect(result).toBe(true);
      expect(mockCache.get).toHaveBeenCalledWith(
        expect.stringContaining("authz:user1:org1:posts:read")
      );
      // Enforcer should not be called on cache hit
      expect(enforceSpy).not.toHaveBeenCalled();
    });

    it("should call enforcer on cache miss", async () => {
      await app.register(authorizationPlugin, {
        enforcer: mockEnforcer,
        db: mockDb,
        cache: mockCache,
      });

      // Mock cache miss
      vi.mocked(mockCache.get).mockResolvedValue(null);
      vi.spyOn(app.enforcer, "enforce").mockResolvedValue(true);

      const result = await app.authorize("user1", "org1", "posts", "read");

      expect(result).toBe(true);
      expect(mockCache.get).toHaveBeenCalled();
      expect(app.enforcer.enforce).toHaveBeenCalledWith(
        "user1",
        "member", // role resolved from mockDb
        "app_default", // DEFAULT_APPLICATION_ID
        "org1",
        "posts",
        "read",
        "" // empty resourceOwnerId
      );
      // Should cache the result
      expect(mockCache.set).toHaveBeenCalledWith(
        expect.stringContaining("authz:user1:org1:posts:read"),
        true,
        300 // default TTL
      );
    });

    it("should log permission denials when audit logging is enabled", async () => {
      await app.register(authorizationPlugin, {
        enforcer: mockEnforcer,
        db: mockDb,
        auditService: mockAuditService,
        logPermissionDenials: true,
      });

      // Mock enforcer to deny
      vi.spyOn(app.enforcer, "enforce").mockResolvedValue(false);

      await app.authorize("user1", "org1", "posts", "delete");

      expect(mockAuditService.logPermissionDenied).toHaveBeenCalledWith({
        userId: "user1",
        orgId: "org1",
        resource: "posts",
        action: "delete",
        context: {
          actorId: "user1",
        },
      });
    });

    it("should NOT log permission denials when flag is disabled", async () => {
      await app.register(authorizationPlugin, {
        enforcer: mockEnforcer,
        db: mockDb,
        auditService: mockAuditService,
        logPermissionDenials: false,
      });

      // Mock enforcer to deny
      vi.spyOn(app.enforcer, "enforce").mockResolvedValue(false);

      await app.authorize("user1", "org1", "posts", "delete");

      expect(mockAuditService.logPermissionDenied).not.toHaveBeenCalled();
    });

    it("should return false on error", async () => {
      await app.register(authorizationPlugin, {
        enforcer: mockEnforcer,
        db: mockDb,
      });

      // Mock enforcer to throw error
      vi.spyOn(app.enforcer, "enforce").mockRejectedValue(
        new Error("Database error")
      );

      const result = await app.authorize("user1", "org1", "posts", "read");

      expect(result).toBe(false);
    });
  });

  describe("invalidateAuthzCache()", () => {
    it("should invalidate user cache with orgId", async () => {
      await app.register(authorizationPlugin, {
        enforcer: mockEnforcer,
        cache: mockCache,
      });

      vi.mocked(mockCache.deletePattern).mockResolvedValue(5);

      await app.invalidateAuthzCache("user1", "org1");

      expect(mockCache.deletePattern).toHaveBeenCalledWith(
        expect.stringContaining("authz:user1:org1:*")
      );
    });

    it("should invalidate all user cache without orgId", async () => {
      await app.register(authorizationPlugin, {
        enforcer: mockEnforcer,
        cache: mockCache,
      });

      vi.mocked(mockCache.deletePattern).mockResolvedValue(10);

      await app.invalidateAuthzCache("user1");

      expect(mockCache.deletePattern).toHaveBeenCalledWith(
        expect.stringContaining("authz:user1:*")
      );
    });

    it("should do nothing when cache is not enabled", async () => {
      await app.register(authorizationPlugin, { enforcer: mockEnforcer });

      // Should not throw
      await app.invalidateAuthzCache("user1", "org1");

      // Cache not initialized, so deletePattern should not exist
      expect(mockCache.deletePattern).not.toHaveBeenCalled();
    });
  });

  describe("invalidateOrgAuthzCache()", () => {
    it("should invalidate organization cache", async () => {
      await app.register(authorizationPlugin, {
        enforcer: mockEnforcer,
        cache: mockCache,
      });

      vi.mocked(mockCache.deletePattern).mockResolvedValue(20);

      await app.invalidateOrgAuthzCache("org1");

      expect(mockCache.deletePattern).toHaveBeenCalledWith(
        expect.stringContaining("authz:*:org1:*")
      );
    });

    it("should do nothing when cache is not enabled", async () => {
      await app.register(authorizationPlugin, { enforcer: mockEnforcer });

      // Should not throw
      await app.invalidateOrgAuthzCache("org1");

      expect(mockCache.deletePattern).not.toHaveBeenCalled();
    });
  });

  describe("Custom TTL", () => {
    it("should use custom cache TTL when provided", async () => {
      await app.register(authorizationPlugin, {
        enforcer: mockEnforcer,
        db: mockDb,
        cache: mockCache,
        cacheTtlSeconds: 600, // 10 minutes
      });

      // Mock cache miss
      vi.mocked(mockCache.get).mockResolvedValue(null);
      vi.spyOn(app.enforcer, "enforce").mockResolvedValue(true);

      await app.authorize("user1", "org1", "posts", "read");

      expect(mockCache.set).toHaveBeenCalledWith(
        expect.any(String),
        true,
        600 // custom TTL
      );
    });
  });
});
