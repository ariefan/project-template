import type { WebhookDeliveryRow, WebhookRow } from "@workspace/db/schema";
import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Sample webhook data
const sampleWebhook: WebhookRow = {
  id: "whk_test123",
  orgId: "org1",
  name: "Test Webhook",
  url: "https://example.com/webhook",
  secret: "secret_abc123",
  events: ["user.created", "user.updated"],
  isActive: true,
  description: "Test webhook description",
  createdBy: "user1",
  createdAt: new Date("2024-01-15T10:00:00Z"),
  updatedAt: new Date("2024-01-15T10:00:00Z"),
};

const sampleDelivery: WebhookDeliveryRow = {
  id: "whd_delivery123",
  webhookId: "whk_test123",
  eventId: "wh_evt_abc123",
  eventType: "user.created",
  payload: {
    id: "wh_evt_abc123",
    type: "user.created",
    createdAt: "2024-01-15T10:00:00Z",
    data: { userId: "user123" },
    metadata: { tenantId: "org1", apiVersion: "v1" },
  },
  status: "delivered",
  statusCode: 200,
  responseBody: "OK",
  attempts: 1,
  maxAttempts: 7,
  nextRetryAt: null,
  deliveredAt: new Date("2024-01-15T10:00:01Z"),
  createdAt: new Date("2024-01-15T10:00:00Z"),
};

// Mock modules
vi.mock("../../auth/middleware", () => ({
  requireAuth: vi.fn(async (request, _reply) => {
    await Promise.resolve();
    request.user = { id: "user1", email: "test@example.com" };
    request.session = { userId: "user1" };
  }),
}));

// Mock webhook service
vi.mock("../services/webhook.service", () => ({
  createWebhook: vi.fn(),
  getWebhook: vi.fn(),
  listWebhooks: vi.fn(),
  updateWebhook: vi.fn(),
  deleteWebhook: vi.fn(),
  rotateSecret: vi.fn(),
  testWebhook: vi.fn(),
  listEventTypes: vi.fn(),
}));

// Mock webhook delivery service
vi.mock("../services/webhook-delivery.service", () => ({
  listDeliveries: vi.fn(),
  getDelivery: vi.fn(),
  retryDelivery: vi.fn(),
}));

// Import after mocking
const { webhooksRoutes } = await import("../routes/webhooks");
const webhookService = await import("../services/webhook.service");
const webhookDeliveryService = await import(
  "../services/webhook-delivery.service"
);

describe("Webhooks Routes", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify({ logger: false });

    await app.register(
      async (instance) => {
        webhooksRoutes(instance);
        await Promise.resolve();
      },
      { prefix: "/v1/orgs" }
    );

    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  describe("GET /:orgId/webhooks", () => {
    it("should list webhooks with pagination", async () => {
      const mockResult = {
        data: [sampleWebhook],
        pagination: {
          page: 1,
          pageSize: 50,
          totalCount: 1,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false,
        },
      };
      vi.mocked(webhookService.listWebhooks).mockResolvedValue(mockResult);

      const response = await app.inject({
        method: "GET",
        url: "/v1/orgs/org1/webhooks",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.data).toHaveLength(1);
      expect(body.data[0].id).toBe("whk_test123");
      expect(body.data[0].name).toBe("Test Webhook");
      expect(body.data[0].url).toBe("https://example.com/webhook");
      expect(body.data[0].events).toEqual(["user.created", "user.updated"]);
      expect(body.data[0].isActive).toBe(true);
      expect(body.pagination).toBeDefined();
      expect(body.meta).toBeDefined();
      expect(body.meta.requestId).toBeDefined();
    });

    it("should pass filters to listWebhooks", async () => {
      const mockResult = {
        data: [],
        pagination: {
          page: 2,
          pageSize: 10,
          totalCount: 0,
          totalPages: 0,
          hasNext: false,
          hasPrevious: true,
        },
      };
      vi.mocked(webhookService.listWebhooks).mockResolvedValue(mockResult);

      await app.inject({
        method: "GET",
        url: "/v1/orgs/org1/webhooks?page=2&pageSize=10&isActive=true",
      });

      expect(webhookService.listWebhooks).toHaveBeenCalledWith("org1", {
        page: 2,
        pageSize: 10,
        isActive: true,
      });
    });

    it("should handle empty results", async () => {
      const mockResult = {
        data: [],
        pagination: {
          page: 1,
          pageSize: 50,
          totalCount: 0,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false,
        },
      };
      vi.mocked(webhookService.listWebhooks).mockResolvedValue(mockResult);

      const response = await app.inject({
        method: "GET",
        url: "/v1/orgs/org1/webhooks",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toEqual([]);
      expect(body.pagination.totalCount).toBe(0);
    });
  });

  describe("POST /:orgId/webhooks", () => {
    it("should create a webhook and return secret", async () => {
      vi.mocked(webhookService.createWebhook).mockResolvedValue({
        webhook: sampleWebhook,
        secret: "whsec_new_secret_123",
      });

      const response = await app.inject({
        method: "POST",
        url: "/v1/orgs/org1/webhooks",
        payload: {
          name: "Test Webhook",
          url: "https://example.com/webhook",
          events: ["user.created", "user.updated"],
          description: "Test webhook description",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);

      expect(body.data.id).toBe("whk_test123");
      expect(body.data.secret).toBe("whsec_new_secret_123");
      expect(body.meta).toBeDefined();
    });

    it("should return 400 for invalid input", async () => {
      vi.mocked(webhookService.createWebhook).mockRejectedValue(
        new Error("Invalid URL format")
      );

      const response = await app.inject({
        method: "POST",
        url: "/v1/orgs/org1/webhooks",
        payload: {
          name: "Test Webhook",
          url: "not-a-valid-url",
          events: ["user.created"],
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe("badRequest");
      expect(body.error.message).toBe("Invalid URL format");
    });
  });

  describe("GET /:orgId/webhooks/event-types", () => {
    it("should list available event types", async () => {
      const eventTypes = [
        { type: "user.created", description: "User was created" },
        { type: "user.updated", description: "User was updated" },
      ];
      vi.mocked(webhookService.listEventTypes).mockReturnValue(eventTypes);

      const response = await app.inject({
        method: "GET",
        url: "/v1/orgs/org1/webhooks/event-types",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.data).toHaveLength(2);
      expect(body.data[0].type).toBe("user.created");
      expect(body.meta).toBeDefined();
    });
  });

  describe("GET /:orgId/webhooks/:webhookId", () => {
    it("should return a single webhook", async () => {
      vi.mocked(webhookService.getWebhook).mockResolvedValue(sampleWebhook);

      const response = await app.inject({
        method: "GET",
        url: "/v1/orgs/org1/webhooks/whk_test123",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.data.id).toBe("whk_test123");
      expect(body.data.name).toBe("Test Webhook");
      expect(body.meta).toBeDefined();
    });

    it("should return 404 for non-existent webhook", async () => {
      vi.mocked(webhookService.getWebhook).mockResolvedValue(null);

      const response = await app.inject({
        method: "GET",
        url: "/v1/orgs/org1/webhooks/whk_nonexistent",
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe("notFound");
    });
  });

  describe("PATCH /:orgId/webhooks/:webhookId", () => {
    it("should update a webhook", async () => {
      const updatedWebhook = {
        ...sampleWebhook,
        name: "Updated Webhook",
        isActive: false,
      };
      vi.mocked(webhookService.updateWebhook).mockResolvedValue(updatedWebhook);

      const response = await app.inject({
        method: "PATCH",
        url: "/v1/orgs/org1/webhooks/whk_test123",
        payload: {
          name: "Updated Webhook",
          isActive: false,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.data.name).toBe("Updated Webhook");
      expect(body.data.isActive).toBe(false);
    });

    it("should return 404 for non-existent webhook", async () => {
      vi.mocked(webhookService.updateWebhook).mockResolvedValue(null);

      const response = await app.inject({
        method: "PATCH",
        url: "/v1/orgs/org1/webhooks/whk_nonexistent",
        payload: { name: "Updated Name" },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("DELETE /:orgId/webhooks/:webhookId", () => {
    it("should delete a webhook", async () => {
      vi.mocked(webhookService.deleteWebhook).mockResolvedValue(sampleWebhook);

      const response = await app.inject({
        method: "DELETE",
        url: "/v1/orgs/org1/webhooks/whk_test123",
      });

      expect(response.statusCode).toBe(204);
    });

    it("should return 404 for non-existent webhook", async () => {
      vi.mocked(webhookService.deleteWebhook).mockResolvedValue(null);

      const response = await app.inject({
        method: "DELETE",
        url: "/v1/orgs/org1/webhooks/whk_nonexistent",
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("POST /:orgId/webhooks/:webhookId/rotate-secret", () => {
    it("should rotate secret and return new secret", async () => {
      vi.mocked(webhookService.rotateSecret).mockResolvedValue({
        webhook: { ...sampleWebhook, secret: "whsec_rotated_123" },
        secret: "whsec_rotated_123",
      });

      const response = await app.inject({
        method: "POST",
        url: "/v1/orgs/org1/webhooks/whk_test123/rotate-secret",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.data.secret).toBe("whsec_rotated_123");
    });

    it("should return 404 for non-existent webhook", async () => {
      vi.mocked(webhookService.rotateSecret).mockResolvedValue(null);

      const response = await app.inject({
        method: "POST",
        url: "/v1/orgs/org1/webhooks/whk_nonexistent/rotate-secret",
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("POST /:orgId/webhooks/:webhookId/test", () => {
    it("should test webhook successfully", async () => {
      vi.mocked(webhookService.testWebhook).mockResolvedValue({
        success: true,
        httpStatus: 200,
        durationMs: 150,
      });

      const response = await app.inject({
        method: "POST",
        url: "/v1/orgs/org1/webhooks/whk_test123/test",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.data.success).toBe(true);
      expect(body.data.httpStatus).toBe(200);
      expect(body.data.durationMs).toBe(150);
    });

    it("should return test failure details", async () => {
      vi.mocked(webhookService.testWebhook).mockResolvedValue({
        success: false,
        httpStatus: 500,
        durationMs: 250,
        error: "Internal Server Error",
      });

      const response = await app.inject({
        method: "POST",
        url: "/v1/orgs/org1/webhooks/whk_test123/test",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.data.success).toBe(false);
      expect(body.data.error).toBe("Internal Server Error");
    });

    it("should return 404 for non-existent webhook", async () => {
      vi.mocked(webhookService.testWebhook).mockResolvedValue({
        success: false,
        error: "Webhook not found",
      });

      const response = await app.inject({
        method: "POST",
        url: "/v1/orgs/org1/webhooks/whk_nonexistent/test",
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("GET /:orgId/webhooks/:webhookId/deliveries", () => {
    it("should list deliveries with pagination", async () => {
      vi.mocked(webhookService.getWebhook).mockResolvedValue(sampleWebhook);
      vi.mocked(webhookDeliveryService.listDeliveries).mockResolvedValue({
        data: [sampleDelivery],
        pagination: {
          page: 1,
          pageSize: 50,
          totalCount: 1,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false,
        },
      });

      const response = await app.inject({
        method: "GET",
        url: "/v1/orgs/org1/webhooks/whk_test123/deliveries",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.data).toHaveLength(1);
      expect(body.data[0].id).toBe("whd_delivery123");
      expect(body.data[0].eventType).toBe("user.created");
      expect(body.data[0].status).toBe("delivered");
      expect(body.pagination).toBeDefined();
    });

    it("should pass filters to listDeliveries", async () => {
      vi.mocked(webhookService.getWebhook).mockResolvedValue(sampleWebhook);
      vi.mocked(webhookDeliveryService.listDeliveries).mockResolvedValue({
        data: [],
        pagination: {
          page: 1,
          pageSize: 50,
          totalCount: 0,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false,
        },
      });

      await app.inject({
        method: "GET",
        url: "/v1/orgs/org1/webhooks/whk_test123/deliveries?status=failed&eventType=user.created",
      });

      expect(webhookDeliveryService.listDeliveries).toHaveBeenCalledWith(
        "whk_test123",
        expect.objectContaining({
          status: "failed",
          eventType: "user.created",
        })
      );
    });

    it("should return 404 when webhook not found", async () => {
      vi.mocked(webhookService.getWebhook).mockResolvedValue(null);

      const response = await app.inject({
        method: "GET",
        url: "/v1/orgs/org1/webhooks/whk_nonexistent/deliveries",
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("GET /:orgId/webhooks/:webhookId/deliveries/:deliveryId", () => {
    it("should return a single delivery", async () => {
      vi.mocked(webhookService.getWebhook).mockResolvedValue(sampleWebhook);
      vi.mocked(webhookDeliveryService.getDelivery).mockResolvedValue(
        sampleDelivery
      );

      const response = await app.inject({
        method: "GET",
        url: "/v1/orgs/org1/webhooks/whk_test123/deliveries/whd_delivery123",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.data.id).toBe("whd_delivery123");
      expect(body.data.eventType).toBe("user.created");
      expect(body.data.payload).toBeDefined();
    });

    it("should return 404 for non-existent delivery", async () => {
      vi.mocked(webhookService.getWebhook).mockResolvedValue(sampleWebhook);
      vi.mocked(webhookDeliveryService.getDelivery).mockResolvedValue(null);

      const response = await app.inject({
        method: "GET",
        url: "/v1/orgs/org1/webhooks/whk_test123/deliveries/whd_nonexistent",
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("POST /:orgId/webhooks/:webhookId/deliveries/:deliveryId/retry", () => {
    it("should retry a failed delivery", async () => {
      vi.mocked(webhookService.getWebhook).mockResolvedValue(sampleWebhook);
      vi.mocked(webhookDeliveryService.retryDelivery).mockResolvedValue({
        ...sampleDelivery,
        status: "pending",
        attempts: 2,
      });

      const response = await app.inject({
        method: "POST",
        url: "/v1/orgs/org1/webhooks/whk_test123/deliveries/whd_delivery123/retry",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.data.status).toBe("pending");
      expect(body.data.attempts).toBe(2);
    });

    it("should return 404 when delivery cannot be retried", async () => {
      vi.mocked(webhookService.getWebhook).mockResolvedValue(sampleWebhook);
      vi.mocked(webhookDeliveryService.retryDelivery).mockResolvedValue(null);

      const response = await app.inject({
        method: "POST",
        url: "/v1/orgs/org1/webhooks/whk_test123/deliveries/whd_delivery123/retry",
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
