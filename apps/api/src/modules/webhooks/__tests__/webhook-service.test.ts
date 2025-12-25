import type { WebhookRow } from "@workspace/db/schema";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Regex patterns for ID matching (defined at top level for performance)
const WEBHOOK_ID_PATTERN = /^whk_/;
const SECRET_PATTERN = /^whsec_/;

// Sample webhook data
const sampleWebhook: WebhookRow = {
  id: "whk_test123",
  orgId: "org1",
  name: "Test Webhook",
  url: "https://example.com/webhook",
  secret: "whsec_secret123",
  events: ["user.created", "user.updated"],
  isActive: true,
  description: "Test webhook description",
  createdBy: "user1",
  createdAt: new Date("2024-01-15T10:00:00Z"),
  updatedAt: new Date("2024-01-15T10:00:00Z"),
};

// Mock repository
vi.mock("../repositories/webhook.repository", () => ({
  create: vi.fn(),
  findById: vi.fn(),
  findByOrg: vi.fn(),
  update: vi.fn(),
  deleteById: vi.fn(),
  updateSecret: vi.fn(),
}));

// Mock delivery service
vi.mock("../services/webhook-delivery.service", () => ({
  executeDeliveryDirect: vi.fn(),
}));

// Import after mocking
const {
  createWebhook,
  getWebhook,
  listWebhooks,
  updateWebhook,
  deleteWebhook,
  rotateSecret,
  testWebhook,
  listEventTypes,
} = await import("../services/webhook.service");
const webhookRepository = await import("../repositories/webhook.repository");
const webhookDeliveryService = await import(
  "../services/webhook-delivery.service"
);

describe("Webhook Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createWebhook", () => {
    it("should create a webhook with valid input", async () => {
      vi.mocked(webhookRepository.create).mockResolvedValue(sampleWebhook);

      const result = await createWebhook({
        orgId: "org1",
        name: "Test Webhook",
        url: "https://example.com/webhook",
        events: ["user.created"],
        description: "Test description",
        createdBy: "user1",
      });

      expect(result.webhook).toBeDefined();
      expect(result.secret).toBeDefined();
      expect(result.secret).toMatch(SECRET_PATTERN);
      expect(webhookRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: "org1",
          name: "Test Webhook",
          url: "https://example.com/webhook",
          events: ["user.created"],
        })
      );
    });

    it("should reject non-HTTPS URLs", async () => {
      await expect(
        createWebhook({
          orgId: "org1",
          name: "Test Webhook",
          url: "http://example.com/webhook",
          events: ["user.created"],
          createdBy: "user1",
        })
      ).rejects.toThrow("Webhook URL must use HTTPS");
    });

    it("should reject invalid event types", async () => {
      await expect(
        createWebhook({
          orgId: "org1",
          name: "Test Webhook",
          url: "https://example.com/webhook",
          events: ["invalid.event"],
          createdBy: "user1",
        })
      ).rejects.toThrow("Invalid event types: invalid.event");
    });

    it("should generate unique ID and secret", async () => {
      vi.mocked(webhookRepository.create).mockResolvedValue(sampleWebhook);

      const result = await createWebhook({
        orgId: "org1",
        name: "Test Webhook",
        url: "https://example.com/webhook",
        events: ["user.created"],
        createdBy: "user1",
      });

      expect(webhookRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.stringMatching(WEBHOOK_ID_PATTERN),
          secret: expect.stringMatching(SECRET_PATTERN),
        })
      );
      expect(result.secret).toMatch(SECRET_PATTERN);
    });
  });

  describe("getWebhook", () => {
    it("should return webhook when found", async () => {
      vi.mocked(webhookRepository.findById).mockResolvedValue(sampleWebhook);

      const result = await getWebhook("org1", "whk_test123");

      expect(result).toEqual(sampleWebhook);
      expect(webhookRepository.findById).toHaveBeenCalledWith(
        "org1",
        "whk_test123"
      );
    });

    it("should return null when not found", async () => {
      vi.mocked(webhookRepository.findById).mockResolvedValue(null);

      const result = await getWebhook("org1", "whk_nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("listWebhooks", () => {
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
      vi.mocked(webhookRepository.findByOrg).mockResolvedValue(mockResult);

      const result = await listWebhooks("org1", { page: 1, pageSize: 50 });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.totalCount).toBe(1);
    });

    it("should pass filter options to repository", async () => {
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
      vi.mocked(webhookRepository.findByOrg).mockResolvedValue(mockResult);

      await listWebhooks("org1", { isActive: true, page: 2, pageSize: 10 });

      expect(webhookRepository.findByOrg).toHaveBeenCalledWith("org1", {
        isActive: true,
        page: 2,
        pageSize: 10,
      });
    });
  });

  describe("updateWebhook", () => {
    it("should update webhook with valid input", async () => {
      const updatedWebhook = { ...sampleWebhook, name: "Updated Name" };
      vi.mocked(webhookRepository.update).mockResolvedValue(updatedWebhook);

      const result = await updateWebhook("org1", "whk_test123", {
        name: "Updated Name",
      });

      expect(result?.name).toBe("Updated Name");
    });

    it("should reject non-HTTPS URL in update", async () => {
      await expect(
        updateWebhook("org1", "whk_test123", {
          url: "http://example.com/webhook",
        })
      ).rejects.toThrow("Webhook URL must use HTTPS");
    });

    it("should reject invalid event types in update", async () => {
      await expect(
        updateWebhook("org1", "whk_test123", {
          events: ["invalid.event"],
        })
      ).rejects.toThrow("Invalid event types: invalid.event");
    });

    it("should return null when webhook not found", async () => {
      vi.mocked(webhookRepository.update).mockResolvedValue(null);

      const result = await updateWebhook("org1", "whk_nonexistent", {
        name: "Updated Name",
      });

      expect(result).toBeNull();
    });
  });

  describe("deleteWebhook", () => {
    it("should delete webhook", async () => {
      vi.mocked(webhookRepository.deleteById).mockResolvedValue(sampleWebhook);

      const result = await deleteWebhook("org1", "whk_test123");

      expect(result).toEqual(sampleWebhook);
      expect(webhookRepository.deleteById).toHaveBeenCalledWith(
        "org1",
        "whk_test123"
      );
    });

    it("should return null when not found", async () => {
      vi.mocked(webhookRepository.deleteById).mockResolvedValue(null);

      const result = await deleteWebhook("org1", "whk_nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("rotateSecret", () => {
    it("should rotate secret and return new secret", async () => {
      const updatedWebhook = { ...sampleWebhook, secret: "whsec_new_secret" };
      vi.mocked(webhookRepository.updateSecret).mockResolvedValue(
        updatedWebhook
      );

      const result = await rotateSecret("org1", "whk_test123");

      expect(result).not.toBeNull();
      expect(result?.secret).toMatch(SECRET_PATTERN);
      expect(webhookRepository.updateSecret).toHaveBeenCalledWith(
        "org1",
        "whk_test123",
        expect.stringMatching(SECRET_PATTERN)
      );
    });

    it("should return null when webhook not found", async () => {
      vi.mocked(webhookRepository.updateSecret).mockResolvedValue(null);

      const result = await rotateSecret("org1", "whk_nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("testWebhook", () => {
    it("should send test event and return success", async () => {
      vi.mocked(webhookRepository.findById).mockResolvedValue(sampleWebhook);
      vi.mocked(webhookDeliveryService.executeDeliveryDirect).mockResolvedValue(
        {
          success: true,
          httpStatus: 200,
          durationMs: 150,
        }
      );

      const result = await testWebhook("org1", "whk_test123");

      expect(result.success).toBe(true);
      expect(result.httpStatus).toBe(200);
      expect(result.durationMs).toBe(150);
    });

    it("should return error when webhook not found", async () => {
      vi.mocked(webhookRepository.findById).mockResolvedValue(null);

      const result = await testWebhook("org1", "whk_nonexistent");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Webhook not found");
    });

    it("should return failure details on error", async () => {
      vi.mocked(webhookRepository.findById).mockResolvedValue(sampleWebhook);
      vi.mocked(webhookDeliveryService.executeDeliveryDirect).mockResolvedValue(
        {
          success: false,
          httpStatus: 500,
          durationMs: 250,
          error: "Internal Server Error",
        }
      );

      const result = await testWebhook("org1", "whk_test123");

      expect(result.success).toBe(false);
      expect(result.httpStatus).toBe(500);
      expect(result.error).toBe("Internal Server Error");
    });
  });

  describe("listEventTypes", () => {
    it("should return available event types", () => {
      const result = listEventTypes();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty("type");
      expect(result[0]).toHaveProperty("description");
    });

    it("should include standard event types", () => {
      const result = listEventTypes();
      const types = result.map((e) => e.type);

      expect(types).toContain("user.created");
      expect(types).toContain("webhook.test");
    });
  });
});
