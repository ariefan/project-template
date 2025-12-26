import type { AuthorizationAuditService } from "@workspace/authorization";
import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Create mock violation manager
const mockViolationManager = {
  suspendPermission: vi.fn(),
  restorePermission: vi.fn(),
  suspendOrganization: vi.fn(),
  restoreOrganization: vi.fn(),
  getViolations: vi.fn(),
};

// Create mock enforcer for use in tests
const mockEnforcer = {
  enforce: vi.fn(),
  addPolicy: vi.fn(),
  removePolicy: vi.fn(),
  getFilteredPolicy: vi.fn(),
  getRolesForUserInDomain: vi.fn(),
  enableAutoSave: vi.fn(),
};

// Mock the authorization package before any imports
vi.mock("@workspace/authorization", () => ({
  AuthorizationAuditService: {
    extractContext: vi.fn(() => ({
      actorId: "admin1",
      actorIp: "127.0.0.1",
      actorUserAgent: "test-agent",
    })),
  },
  createViolationManager: vi.fn(() => mockViolationManager),
  ViolationSeverity: {
    WARNING: "warning",
    MINOR: "minor",
    MAJOR: "major",
    CRITICAL: "critical",
  },
}));

// Mock the auth middleware
vi.mock("../../auth/middleware", () => ({
  requireAuth: vi.fn(async (request, _reply) => {
    await Promise.resolve();
    // Simulate authenticated user
    request.user = { id: "admin1", email: "admin@test.com" };
    request.session = { userId: "admin1" };
  }),
}));

// Mock the authorization middleware
vi.mock("../../auth/authorization-middleware", () => ({
  requirePermission: vi.fn((_resource: string, _action: string) => {
    return async (request: unknown, _reply: unknown) => {
      await Promise.resolve();
      // Simulate permission check passing
      (request as { user: { id: string; email: string } }).user = {
        id: "admin1",
        email: "admin@test.com",
      };
    };
  }),
}));

// Import modules after mocking
const { violationRoutes } = await import("../violation-routes");
const { default: authorizationPlugin } = await import(
  "../../../plugins/authorization"
);

describe("Violation Routes", () => {
  let app: FastifyInstance;
  let mockAuditService: AuthorizationAuditService;

  beforeEach(async () => {
    app = Fastify({ logger: false });

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

    // Register authorization plugin
    await app.register(authorizationPlugin, {
      enforcer: mockEnforcer as unknown as import("casbin").Enforcer,
      auditService: mockAuditService,
    });

    // Register routes under /authorization prefix
    await app.register(
      async (instance) => {
        violationRoutes(instance);
        await Promise.resolve();
      },
      { prefix: "/authorization" }
    );

    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  describe("POST /:orgId/violations/suspend", () => {
    it("should suspend a specific permission", async () => {
      vi.mocked(mockViolationManager.suspendPermission).mockResolvedValue(true);
      vi.spyOn(app, "invalidateOrgAuthzCache").mockResolvedValue();

      const response = await app.inject({
        method: "POST",
        url: "/authorization/org1/violations/suspend",
        payload: {
          resource: "posts",
          action: "write",
          severity: "major",
          reason: "Terms of service violation",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data).toEqual({
        orgId: "org1",
        resource: "posts",
        action: "write",
        status: "suspended",
      });

      // Verify cache was invalidated
      expect(app.invalidateOrgAuthzCache).toHaveBeenCalledWith("org1");

      // Verify audit log was called
      expect(mockAuditService.logPolicyAdded).toHaveBeenCalledWith({
        orgId: "org1",
        role: "*",
        resource: "posts",
        action: "write",
        effect: "deny",
        context: expect.any(Object),
        details: {
          severity: "major",
          reason: "Terms of service violation",
        },
      });
    });

    it("should return 400 when required fields are missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/authorization/org1/violations/suspend",
        payload: {
          resource: "posts",
          // missing action, severity, reason
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toHaveProperty("code");
    });

    it("should return error when suspension fails", async () => {
      vi.mocked(mockViolationManager.suspendPermission).mockResolvedValue(
        false
      );

      const response = await app.inject({
        method: "POST",
        url: "/authorization/org1/violations/suspend",
        payload: {
          resource: "posts",
          action: "write",
          severity: "major",
          reason: "Test violation",
        },
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toHaveProperty("message");
    });
  });

  describe("POST /:orgId/violations/restore", () => {
    it("should restore a suspended permission", async () => {
      vi.mocked(mockViolationManager.restorePermission).mockResolvedValue(true);
      vi.spyOn(app, "invalidateOrgAuthzCache").mockResolvedValue();

      const response = await app.inject({
        method: "POST",
        url: "/authorization/org1/violations/restore",
        payload: {
          resource: "posts",
          action: "write",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toEqual({
        orgId: "org1",
        resource: "posts",
        action: "write",
        status: "restored",
      });

      // Verify cache was invalidated
      expect(app.invalidateOrgAuthzCache).toHaveBeenCalledWith("org1");

      // Verify audit log was called
      expect(mockAuditService.logPolicyRemoved).toHaveBeenCalledWith({
        orgId: "org1",
        role: "*",
        resource: "posts",
        action: "write",
        effect: "deny",
        context: expect.any(Object),
      });
    });

    it("should return 400 when required fields are missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/authorization/org1/violations/restore",
        payload: {
          resource: "posts",
          // missing action
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toHaveProperty("code");
    });
  });

  describe("POST /:orgId/violations/lockdown", () => {
    it("should lockdown entire organization", async () => {
      vi.mocked(mockViolationManager.suspendOrganization).mockResolvedValue(
        true
      );
      vi.spyOn(app, "invalidateOrgAuthzCache").mockResolvedValue();

      const response = await app.inject({
        method: "POST",
        url: "/authorization/org1/violations/lockdown",
        payload: {
          severity: "critical",
          reason: "Severe terms violation",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data).toEqual({
        orgId: "org1",
        resource: "organization",
        action: "lockdown",
        status: "suspended",
      });

      // Verify cache was invalidated
      expect(app.invalidateOrgAuthzCache).toHaveBeenCalledWith("org1");

      // Verify audit log was called
      expect(mockAuditService.logPolicyAdded).toHaveBeenCalledWith({
        orgId: "org1",
        role: "*",
        resource: "organization",
        action: "lockdown",
        effect: "deny",
        context: expect.any(Object),
        details: {
          severity: "critical",
          reason: "Severe terms violation",
        },
      });
    });

    it("should return 400 when required fields are missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/authorization/org1/violations/lockdown",
        payload: {
          severity: "critical",
          // missing reason
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("POST /:orgId/violations/unlock", () => {
    it("should unlock organization", async () => {
      vi.mocked(mockViolationManager.restoreOrganization).mockResolvedValue(
        true
      );
      vi.spyOn(app, "invalidateOrgAuthzCache").mockResolvedValue();

      const response = await app.inject({
        method: "POST",
        url: "/authorization/org1/violations/unlock",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toEqual({
        orgId: "org1",
        resource: "organization",
        action: "lockdown",
        status: "restored",
      });

      // Verify cache was invalidated
      expect(app.invalidateOrgAuthzCache).toHaveBeenCalledWith("org1");

      // Verify audit log was called
      expect(mockAuditService.logPolicyRemoved).toHaveBeenCalledWith({
        orgId: "org1",
        role: "*",
        resource: "organization",
        action: "lockdown",
        effect: "deny",
        context: expect.any(Object),
      });
    });

    it("should return error when no violations found", async () => {
      vi.mocked(mockViolationManager.restoreOrganization).mockResolvedValue(
        false
      );

      const response = await app.inject({
        method: "POST",
        url: "/authorization/org1/violations/unlock",
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("no violations found");
    });
  });

  describe("GET /:orgId/violations", () => {
    it("should return all active violations", async () => {
      vi.mocked(mockViolationManager.getViolations).mockResolvedValue([
        {
          role: "*",
          resource: "posts",
          action: "write",
          effect: "deny",
        },
        {
          role: "*",
          resource: "posts",
          action: "delete",
          effect: "deny",
        },
      ]);

      const response = await app.inject({
        method: "GET",
        url: "/authorization/org1/violations",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(2);
      expect(body.data[0]).toEqual({
        role: "*",
        resource: "posts",
        action: "write",
        effect: "deny",
      });
    });

    it("should return empty array when no violations exist", async () => {
      vi.mocked(mockViolationManager.getViolations).mockResolvedValue([]);

      const response = await app.inject({
        method: "GET",
        url: "/authorization/org1/violations",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toEqual([]);
    });
  });
});
