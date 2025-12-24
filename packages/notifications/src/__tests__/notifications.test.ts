import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTemplateSubject, isValidTemplateId } from "../templates";

// Mock the db module for preference service tests
vi.mock("@workspace/db", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
  },
  eq: vi.fn(),
  notificationPreferences: {},
}));

describe("@workspace/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("template utilities", () => {
    describe("isValidTemplateId", () => {
      it("should return true for valid template ids", () => {
        expect(isValidTemplateId("welcome")).toBe(true);
        expect(isValidTemplateId("password-reset")).toBe(true);
        expect(isValidTemplateId("verification")).toBe(true);
        expect(isValidTemplateId("security-alert")).toBe(true);
      });

      it("should return false for invalid template ids", () => {
        expect(isValidTemplateId("invalid")).toBe(false);
        expect(isValidTemplateId("")).toBe(false);
        expect(isValidTemplateId("random-template")).toBe(false);
      });
    });

    describe("getTemplateSubject", () => {
      it("should return correct subject for welcome template", () => {
        expect(getTemplateSubject("welcome")).toBe("Welcome to our platform!");
      });

      it("should return correct subject for password-reset template", () => {
        expect(getTemplateSubject("password-reset")).toBe(
          "Reset your password"
        );
      });

      it("should return correct subject for verification template", () => {
        expect(getTemplateSubject("verification")).toBe(
          "Verify your email address"
        );
      });

      it("should return correct subject for security-alert template", () => {
        expect(getTemplateSubject("security-alert")).toBe("Security Alert");
      });
    });
  });

  describe("preference service", () => {
    it("should create preference service with required methods", async () => {
      const { createPreferenceService } = await import(
        "../services/preference.service"
      );
      const service = createPreferenceService();

      expect(service.getPreferences).toBeDefined();
      expect(service.upsertPreferences).toBeDefined();
      expect(service.isChannelEnabled).toBeDefined();
      expect(service.isCategoryEnabled).toBeDefined();
    });

    it("should return true for channel when no preferences exist", async () => {
      const { createPreferenceService } = await import(
        "../services/preference.service"
      );
      const service = createPreferenceService();

      const result = await service.isChannelEnabled("user_123", "email");
      expect(result).toBe(true);
    });

    it("should return true for category when no preferences exist", async () => {
      const { createPreferenceService } = await import(
        "../services/preference.service"
      );
      const service = createPreferenceService();

      const result = await service.isCategoryEnabled(
        "user_123",
        "transactional"
      );
      expect(result).toBe(true);
    });
  });

  describe("notification system factory", () => {
    it("should create notification system with required methods", async () => {
      const { createNotificationSystem } = await import("../index");
      const system = createNotificationSystem({});

      expect(system.start).toBeDefined();
      expect(system.stop).toBeDefined();
      expect(system.notification).toBeDefined();
      expect(system.preferences).toBeDefined();
    });

    it("should start and stop without queue", async () => {
      const { createNotificationSystem } = await import("../index");
      const system = createNotificationSystem({});

      await expect(system.start()).resolves.toBeUndefined();
      await expect(system.stop()).resolves.toBeUndefined();
    });
  });

  describe("provider registry", () => {
    it("should create registry with null providers when no config", async () => {
      const { createProviderRegistry } = await import("../providers");
      const registry = createProviderRegistry({});

      expect(registry.email).toBeNull();
      expect(registry.sms).toBeNull();
      expect(registry.whatsapp).toBeNull();
      expect(registry.telegram).toBeNull();
    });

    it("should have all channel properties defined", async () => {
      const { createProviderRegistry } = await import("../providers");
      const registry = createProviderRegistry({});

      expect("email" in registry).toBe(true);
      expect("sms" in registry).toBe(true);
      expect("whatsapp" in registry).toBe(true);
      expect("telegram" in registry).toBe(true);
    });
  });
});
