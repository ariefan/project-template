import type * as dbModule from "@workspace/db";
import { AuthorizationAuditEventType } from "@workspace/db/schema";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthorizationAuditService } from "../../audit/service";

// Create mock functions that can be accessed in tests
const mockOrderBy = vi.fn().mockResolvedValue([]);
const mockValues = vi.fn().mockResolvedValue(undefined);

// Mock the database module
vi.mock("@workspace/db", async () => {
  const actual = await vi.importActual<typeof dbModule>("@workspace/db");

  const mockDb = {
    select: vi.fn(),
    insert: vi.fn(),
  };

  // Chain: select() -> from() -> where() -> orderBy()
  const selectChain = {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: mockOrderBy,
      }),
    }),
  };
  mockDb.select.mockReturnValue(selectChain);

  // Chain: insert() -> values()
  mockDb.insert.mockReturnValue({ values: mockValues });

  return {
    ...actual,
    db: mockDb,
    eq: vi.fn((field, value) => ({ field, value, type: "eq" })),
    asc: vi.fn((field) => ({ field, direction: "asc" })),
  };
});

// Import after mocking
const { db } = await import("@workspace/db");

describe("Authorization Audit Service", () => {
  let service: AuthorizationAuditService;

  beforeEach(() => {
    service = new AuthorizationAuditService(
      db as unknown as ConstructorParameters<
        typeof AuthorizationAuditService
      >[0]
    );
    mockOrderBy.mockClear();
    mockValues.mockClear();
  });

  describe("extractContext", () => {
    it("should extract context from request with user", () => {
      const request = {
        user: { id: "user123" },
        ip: "192.168.1.1",
        headers: { "user-agent": "Mozilla/5.0" },
      };

      const context = AuthorizationAuditService.extractContext(request);

      expect(context).toEqual({
        actorId: "user123",
        actorIp: "192.168.1.1",
        actorUserAgent: "Mozilla/5.0",
      });
    });

    it("should use 'system' as actorId when no user", () => {
      const request = {
        ip: "192.168.1.1",
      };

      const context = AuthorizationAuditService.extractContext(request);

      expect(context.actorId).toBe("system");
    });

    it("should handle null user", () => {
      const request = {
        user: null,
        ip: "192.168.1.1",
      };

      const context = AuthorizationAuditService.extractContext(request);

      expect(context.actorId).toBe("system");
    });

    it("should handle user without id", () => {
      const request = {
        user: {},
        ip: "192.168.1.1",
      };

      const context = AuthorizationAuditService.extractContext(request);

      expect(context.actorId).toBe("system");
    });

    it("should handle missing optional fields", () => {
      const request = {};

      const context = AuthorizationAuditService.extractContext(request);

      expect(context).toEqual({
        actorId: "system",
        actorIp: undefined,
        actorUserAgent: undefined,
      });
    });
  });

  describe("logPolicyAdded", () => {
    it("should log a policy addition event", async () => {
      await service.logPolicyAdded({
        orgId: "org1",
        role: "admin",
        resource: "posts",
        action: "write",
        context: {
          actorId: "user123",
          actorIp: "192.168.1.1",
          actorUserAgent: "Mozilla/5.0",
        },
      });

      expect(mockValues).toHaveBeenCalledWith({
        eventType: AuthorizationAuditEventType.POLICY_ADDED,
        orgId: "org1",
        resource: "posts",
        action: "write",
        actorId: "user123",
        actorIp: "192.168.1.1",
        actorUserAgent: "Mozilla/5.0",
        details: { role: "admin" },
        recordHash: "",
      });
    });

    it("should include additional details", async () => {
      await service.logPolicyAdded({
        orgId: "org1",
        role: "editor",
        resource: "posts",
        action: "read",
        context: { actorId: "admin123" },
        details: { reason: "New team member" },
      });

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          details: { role: "editor", reason: "New team member" },
        })
      );
    });
  });

  describe("logPolicyRemoved", () => {
    it("should log a policy removal event", async () => {
      await service.logPolicyRemoved({
        orgId: "org1",
        role: "admin",
        resource: "posts",
        action: "delete",
        context: { actorId: "user123" },
      });

      expect(mockValues).toHaveBeenCalledWith({
        eventType: AuthorizationAuditEventType.POLICY_REMOVED,
        orgId: "org1",
        resource: "posts",
        action: "delete",
        actorId: "user123",
        actorIp: undefined,
        actorUserAgent: undefined,
        details: { role: "admin" },
        recordHash: "",
      });
    });
  });

  describe("logPermissionDenied", () => {
    it("should log a permission denial event", async () => {
      await service.logPermissionDenied({
        userId: "user123",
        orgId: "org1",
        resource: "posts",
        action: "delete",
        context: { actorId: "user123" },
      });

      expect(mockValues).toHaveBeenCalledWith({
        eventType: AuthorizationAuditEventType.PERMISSION_DENIED,
        userId: "user123",
        orgId: "org1",
        resource: "posts",
        action: "delete",
        actorId: "user123",
        actorIp: undefined,
        actorUserAgent: undefined,
        details: undefined,
        recordHash: "",
      });
    });

    it("should include denial details", async () => {
      await service.logPermissionDenied({
        userId: "user123",
        orgId: "org1",
        resource: "sensitive-data",
        action: "read",
        context: { actorId: "user123" },
        details: { reason: "Insufficient privileges" },
      });

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          details: { reason: "Insufficient privileges" },
        })
      );
    });
  });

  describe("logPermissionGranted", () => {
    it("should log a permission grant event", async () => {
      await service.logPermissionGranted({
        userId: "user123",
        orgId: "org1",
        resource: "posts",
        action: "read",
        context: { actorId: "user123" },
      });

      expect(mockValues).toHaveBeenCalledWith({
        eventType: AuthorizationAuditEventType.PERMISSION_GRANTED,
        userId: "user123",
        orgId: "org1",
        resource: "posts",
        action: "read",
        actorId: "user123",
        actorIp: undefined,
        actorUserAgent: undefined,
        details: undefined,
        recordHash: "",
      });
    });
  });

  describe("logRoleAssigned", () => {
    it("should log a role assignment event", async () => {
      await service.logRoleAssigned({
        userId: "user123",
        orgId: "org1",
        role: "admin",
        context: { actorId: "superadmin" },
      });

      expect(mockValues).toHaveBeenCalledWith({
        eventType: AuthorizationAuditEventType.ROLE_ASSIGNED,
        userId: "user123",
        orgId: "org1",
        actorId: "superadmin",
        actorIp: undefined,
        actorUserAgent: undefined,
        details: { role: "admin" },
        recordHash: "",
      });
    });
  });

  describe("logRoleRemoved", () => {
    it("should log a role removal event", async () => {
      await service.logRoleRemoved({
        userId: "user123",
        orgId: "org1",
        role: "editor",
        context: { actorId: "admin" },
      });

      expect(mockValues).toHaveBeenCalledWith({
        eventType: AuthorizationAuditEventType.ROLE_REMOVED,
        userId: "user123",
        orgId: "org1",
        actorId: "admin",
        actorIp: undefined,
        actorUserAgent: undefined,
        details: { role: "editor" },
        recordHash: "",
      });
    });
  });

  describe("verifyHashChainIntegrity", () => {
    it("should return true for intact hash chain", async () => {
      const mockLogs = [
        {
          id: 1,
          timestamp: new Date("2024-01-01T00:00:00Z"),
          eventType: "policy.added",
          userId: null,
          orgId: "org1",
          resource: "posts",
          action: "write",
          actorId: "admin",
          actorIp: "192.168.1.1",
          details: {},
          previousHash: null,
          recordHash: "hash1",
        },
        {
          id: 2,
          timestamp: new Date("2024-01-01T00:01:00Z"),
          eventType: "role.assigned",
          userId: "user123",
          orgId: "org1",
          resource: null,
          action: null,
          actorId: "admin",
          actorIp: "192.168.1.1",
          details: {},
          previousHash: "hash1",
          recordHash: "hash2",
        },
      ];

      mockOrderBy.mockResolvedValue(mockLogs);

      const result = await service.verifyHashChainIntegrity("org1");

      expect(result).toBe(true);
    });

    it("should return false for broken hash chain", async () => {
      const mockLogs = [
        {
          id: 1,
          timestamp: new Date("2024-01-01T00:00:00Z"),
          eventType: "policy.added",
          userId: null,
          orgId: "org1",
          resource: "posts",
          action: "write",
          actorId: "admin",
          actorIp: "192.168.1.1",
          details: {},
          previousHash: null,
          recordHash: "hash1",
        },
        {
          id: 2,
          timestamp: new Date("2024-01-01T00:01:00Z"),
          eventType: "role.assigned",
          userId: "user123",
          orgId: "org1",
          resource: null,
          action: null,
          actorId: "admin",
          actorIp: "192.168.1.1",
          details: {},
          previousHash: "wronghash", // Should be hash1
          recordHash: "hash2",
        },
      ];

      mockOrderBy.mockResolvedValue(mockLogs);

      const result = await service.verifyHashChainIntegrity("org1");

      expect(result).toBe(false);
    });

    it("should return true for empty log chain", async () => {
      mockOrderBy.mockResolvedValue([]);

      const result = await service.verifyHashChainIntegrity("org1");

      expect(result).toBe(true);
    });
  });
});
