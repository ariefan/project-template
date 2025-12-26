import type {
  AuditLogQueryResult,
  AuthorizationAuditService,
} from "@workspace/authorization";
import type { AuthorizationLog } from "@workspace/db/schema";
import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  AuthorizationAuditService: vi.fn(),
  createViolationManager: vi.fn(() => ({
    suspendPermission: vi.fn(),
    restorePermission: vi.fn(),
    suspendOrganization: vi.fn(),
    restoreOrganization: vi.fn(),
    getViolations: vi.fn(),
  })),
}));

// Mock the auth middleware
vi.mock("../../auth/middleware", () => ({
  requireAuth: vi.fn(async (request, _reply) => {
    await Promise.resolve();
    request.user = { id: "admin1", email: "admin@test.com" };
    request.session = { userId: "admin1" };
  }),
}));

// Mock the authorization middleware
vi.mock("../../auth/authorization-middleware", () => ({
  requirePermission: vi.fn(
    (_resource: string, _action: string) =>
      async (request: unknown, _reply: unknown) => {
        await Promise.resolve();
        (request as { user: { id: string; email: string } }).user = {
          id: "admin1",
          email: "admin@test.com",
        };
      }
  ),
}));

// Import modules after mocking
const { auditLogRoutes } = await import("../audit-log-routes");
const { default: authorizationPlugin } = await import(
  "../../../plugins/authorization"
);

// Regex patterns for export URL matching
const JSON_DATA_URL_PATTERN = /^data:application\/json;base64,/;
const CSV_DATA_URL_PATTERN = /^data:text\/csv;base64,/;
const JOB_ID_PATTERN = /^job_/;

// Sample audit log data
const sampleLog: AuthorizationLog = {
  id: 1,
  timestamp: new Date("2024-01-15T10:00:00Z"),
  eventType: "role.assigned",
  userId: "user123",
  orgId: "org1",
  resource: "users",
  action: "assign",
  actorId: "admin1",
  actorIp: "192.168.1.1",
  actorUserAgent: "test-agent",
  details: { role: "editor" },
  previousHash: null,
  recordHash: "hash123",
};

const sampleLog2: AuthorizationLog = {
  id: 2,
  timestamp: new Date("2024-01-15T11:00:00Z"),
  eventType: "permission.denied",
  userId: "user456",
  orgId: "org1",
  resource: "posts",
  action: "delete",
  actorId: "user456",
  actorIp: "192.168.1.2",
  actorUserAgent: "test-agent",
  details: { reason: "insufficient permissions" },
  previousHash: "hash123",
  recordHash: "hash456",
};

describe("Audit Log Routes", () => {
  let app: FastifyInstance;
  let mockAuditService: AuthorizationAuditService;

  beforeEach(async () => {
    app = Fastify({ logger: false });

    // Create mock audit service with query methods
    mockAuditService = {
      logPolicyAdded: vi.fn(),
      logPolicyRemoved: vi.fn(),
      logPermissionDenied: vi.fn(),
      logPermissionGranted: vi.fn(),
      logRoleAssigned: vi.fn(),
      logRoleRemoved: vi.fn(),
      verifyHashChainIntegrity: vi.fn(),
      queryLogs: vi.fn(),
      getLogById: vi.fn(),
      countLogs: vi.fn(),
    } as unknown as AuthorizationAuditService;

    // Register authorization plugin
    await app.register(authorizationPlugin, {
      enforcer: mockEnforcer as unknown as import("casbin").Enforcer,
      auditService: mockAuditService,
    });

    // Register routes under /authorization prefix
    await app.register(
      async (instance) => {
        auditLogRoutes(instance);
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

  describe("GET /:orgId/audit-logs", () => {
    it("should list audit logs with pagination", async () => {
      const queryResult: AuditLogQueryResult = {
        data: [sampleLog, sampleLog2],
        pagination: {
          page: 1,
          pageSize: 50,
          totalItems: 2,
          totalPages: 1,
          hasMore: false,
        },
      };
      vi.mocked(mockAuditService.queryLogs).mockResolvedValue(queryResult);

      const response = await app.inject({
        method: "GET",
        url: "/authorization/org1/audit-logs",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.data).toHaveLength(2);
      expect(body.data[0].eventId).toBe("evt_1");
      expect(body.data[0].eventType).toBe("role.assigned");
      expect(body.data[0].tenantId).toBe("org1");
      expect(body.data[0].actor.id).toBe("admin1");
      expect(body.data[0].actor.ipAddress).toBe("192.168.1.1");
      expect(body.data[0].resource.type).toBe("users");

      expect(body.pagination).toBeDefined();
      expect(body.pagination.totalItems).toBe(2);
      expect(body.meta).toBeDefined();
    });

    it("should pass filters to queryLogs", async () => {
      const queryResult: AuditLogQueryResult = {
        data: [sampleLog],
        pagination: {
          page: 1,
          pageSize: 50,
          totalItems: 1,
          totalPages: 1,
          hasMore: false,
        },
      };
      vi.mocked(mockAuditService.queryLogs).mockResolvedValue(queryResult);

      const response = await app.inject({
        method: "GET",
        url: "/authorization/org1/audit-logs?eventType=role.assigned&actorId=admin1&page=2&pageSize=10",
      });

      expect(response.statusCode).toBe(200);
      expect(mockAuditService.queryLogs).toHaveBeenCalledWith("org1", {
        page: "2",
        pageSize: "10",
        filters: {
          eventType: "role.assigned",
          actorId: "admin1",
          resourceType: undefined,
          timestampAfter: undefined,
          timestampBefore: undefined,
          ipAddress: undefined,
        },
      });
    });

    it("should handle empty results", async () => {
      const queryResult: AuditLogQueryResult = {
        data: [],
        pagination: {
          page: 1,
          pageSize: 50,
          totalItems: 0,
          totalPages: 0,
          hasMore: false,
        },
      };
      vi.mocked(mockAuditService.queryLogs).mockResolvedValue(queryResult);

      const response = await app.inject({
        method: "GET",
        url: "/authorization/org1/audit-logs",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toEqual([]);
      expect(body.pagination.totalItems).toBe(0);
    });

    it("should handle timestamp filters", async () => {
      const queryResult: AuditLogQueryResult = {
        data: [sampleLog],
        pagination: {
          page: 1,
          pageSize: 50,
          totalItems: 1,
          totalPages: 1,
          hasMore: false,
        },
      };
      vi.mocked(mockAuditService.queryLogs).mockResolvedValue(queryResult);

      const response = await app.inject({
        method: "GET",
        url: "/authorization/org1/audit-logs?timestampAfter=2024-01-01T00:00:00Z&timestampBefore=2024-12-31T23:59:59Z",
      });

      expect(response.statusCode).toBe(200);
      expect(mockAuditService.queryLogs).toHaveBeenCalledWith("org1", {
        page: undefined,
        pageSize: undefined,
        filters: expect.objectContaining({
          timestampAfter: new Date("2024-01-01T00:00:00Z"),
          timestampBefore: new Date("2024-12-31T23:59:59Z"),
        }),
      });
    });
  });

  describe("GET /:orgId/audit-logs/:eventId", () => {
    it("should return a single audit log by eventId", async () => {
      vi.mocked(mockAuditService.getLogById).mockResolvedValue(sampleLog);

      const response = await app.inject({
        method: "GET",
        url: "/authorization/org1/audit-logs/evt_1",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.data.eventId).toBe("evt_1");
      expect(body.data.eventType).toBe("role.assigned");
      expect(body.data.tenantId).toBe("org1");
      expect(body.data.actor).toEqual({
        type: "user",
        id: "admin1",
        ipAddress: "192.168.1.1",
        userAgent: "test-agent",
      });
      expect(body.data.resource).toEqual({
        type: "users",
        id: "user123",
        endpoint: "assign",
      });
      expect(body.meta).toBeDefined();
    });

    it("should return 404 for non-existent eventId", async () => {
      vi.mocked(mockAuditService.getLogById).mockResolvedValue(null);

      const response = await app.inject({
        method: "GET",
        url: "/authorization/org1/audit-logs/evt_999",
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe("notFound");
    });

    it("should return 404 for invalid eventId format", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/authorization/org1/audit-logs/invalid-id",
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe("notFound");
    });

    it("should handle system actor type", async () => {
      const systemLog: AuthorizationLog = {
        ...sampleLog,
        actorId: "system",
      };
      vi.mocked(mockAuditService.getLogById).mockResolvedValue(systemLog);

      const response = await app.inject({
        method: "GET",
        url: "/authorization/org1/audit-logs/evt_1",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.actor.type).toBe("system");
      expect(body.data.actor.id).toBe("system");
    });
  });

  describe("POST /:orgId/audit-logs/export", () => {
    it("should export logs as JSON for small datasets", async () => {
      vi.mocked(mockAuditService.countLogs).mockResolvedValue(2);
      vi.mocked(mockAuditService.queryLogs).mockResolvedValue({
        data: [sampleLog, sampleLog2],
        pagination: {
          page: 1,
          pageSize: 100,
          totalItems: 2,
          totalPages: 1,
          hasMore: false,
        },
      });

      const response = await app.inject({
        method: "POST",
        url: "/authorization/org1/audit-logs/export",
        payload: {
          format: "json",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.data.downloadUrl).toMatch(JSON_DATA_URL_PATTERN);
      expect(body.data.eventCount).toBe(2);
      expect(body.data.expiresAt).toBeDefined();
    });

    it("should export logs as CSV", async () => {
      vi.mocked(mockAuditService.countLogs).mockResolvedValue(1);
      vi.mocked(mockAuditService.queryLogs).mockResolvedValue({
        data: [sampleLog],
        pagination: {
          page: 1,
          pageSize: 100,
          totalItems: 1,
          totalPages: 1,
          hasMore: false,
        },
      });

      const response = await app.inject({
        method: "POST",
        url: "/authorization/org1/audit-logs/export",
        payload: {
          format: "csv",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.data.downloadUrl).toMatch(CSV_DATA_URL_PATTERN);
      expect(body.data.eventCount).toBe(1);

      // Decode and verify CSV content
      const base64Content = body.data.downloadUrl.split(",")[1];
      const csvContent = Buffer.from(base64Content, "base64").toString("utf-8");
      expect(csvContent).toContain("eventId,eventType,timestamp");
      expect(csvContent).toContain("evt_1,role.assigned");
    });

    it("should return 202 for large exports", async () => {
      vi.mocked(mockAuditService.countLogs).mockResolvedValue(15_000);

      const response = await app.inject({
        method: "POST",
        url: "/authorization/org1/audit-logs/export",
        payload: {
          format: "json",
        },
      });

      expect(response.statusCode).toBe(202);
      const body = JSON.parse(response.body);

      expect(body.data.jobId).toMatch(JOB_ID_PATTERN);
      expect(body.data.status).toBe("pending");
    });

    it("should pass timestamp filters to export", async () => {
      vi.mocked(mockAuditService.countLogs).mockResolvedValue(1);
      vi.mocked(mockAuditService.queryLogs).mockResolvedValue({
        data: [sampleLog],
        pagination: {
          page: 1,
          pageSize: 100,
          totalItems: 1,
          totalPages: 1,
          hasMore: false,
        },
      });

      await app.inject({
        method: "POST",
        url: "/authorization/org1/audit-logs/export",
        payload: {
          format: "json",
          timestampAfter: "2024-01-01T00:00:00Z",
          timestampBefore: "2024-12-31T23:59:59Z",
        },
      });

      expect(mockAuditService.countLogs).toHaveBeenCalledWith("org1", {
        timestampAfter: new Date("2024-01-01T00:00:00Z"),
        timestampBefore: new Date("2024-12-31T23:59:59Z"),
        eventType: undefined,
      });
    });
  });

  describe("Service unavailable handling", () => {
    it("should return 503 when audit service is not available", async () => {
      // Create app without audit service
      const appWithoutService = Fastify({ logger: false });

      // Register authorization plugin without audit service
      await appWithoutService.register(authorizationPlugin, {
        enforcer: mockEnforcer as unknown as import("casbin").Enforcer,
      });

      await appWithoutService.register(
        async (instance) => {
          auditLogRoutes(instance);
          await Promise.resolve();
        },
        { prefix: "/authorization" }
      );

      await appWithoutService.ready();

      const response = await appWithoutService.inject({
        method: "GET",
        url: "/authorization/org1/audit-logs",
      });

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe("serviceUnavailable");

      await appWithoutService.close();
    });
  });
});
