import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCookieDomain } from "../config";
import {
  createConsoleEmailService,
  createConsoleSmsService,
} from "../services";

describe("@workspace/auth", () => {
  describe("getCookieDomain", () => {
    it("should extract domain from standard URL", () => {
      expect(getCookieDomain("https://auth.example.com")).toBe(".example.com");
    });

    it("should extract domain from subdomain URL", () => {
      expect(getCookieDomain("https://accounts.mydomain.com")).toBe(
        ".mydomain.com"
      );
    });

    it("should handle localhost URLs", () => {
      expect(getCookieDomain("http://localhost:3001")).toBeUndefined();
    });

    it("should handle two-part local domains", () => {
      expect(getCookieDomain("http://accounts.local")).toBe(".accounts.local");
    });

    it("should handle deep subdomains", () => {
      expect(getCookieDomain("https://api.v1.auth.example.com")).toBe(
        ".example.com"
      );
    });

    it("should return undefined for invalid URLs", () => {
      expect(getCookieDomain("not-a-url")).toBeUndefined();
    });

    it("should handle IP addresses", () => {
      // IP addresses get split by dots, taking last 2 parts
      expect(getCookieDomain("http://192.168.1.1:3001")).toBe(".1.1");
    });
  });

  describe("console email service", () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, "log").mockImplementation(vi.fn());
    });

    it("should create service with all required methods", () => {
      const service = createConsoleEmailService();

      expect(service.sendPasswordReset).toBeDefined();
      expect(service.sendEmailVerification).toBeDefined();
      expect(service.sendMagicLink).toBeDefined();
      expect(service.sendOrganizationInvitation).toBeDefined();
      expect(service.sendTwoFactorCode).toBeDefined();
    });

    it("should log password reset email", async () => {
      const service = createConsoleEmailService();

      await service.sendPasswordReset("user@example.com", "https://reset.url");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Password reset")
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("user@example.com")
      );
    });

    it("should log email verification", async () => {
      const service = createConsoleEmailService();

      await service.sendEmailVerification(
        "user@example.com",
        "https://verify.url"
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Verification")
      );
    });

    it("should log magic link", async () => {
      const service = createConsoleEmailService();

      await service.sendMagicLink("user@example.com", "https://magic.url");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Magic link")
      );
    });

    it("should log organization invitation", async () => {
      const service = createConsoleEmailService();

      await service.sendOrganizationInvitation(
        "user@example.com",
        "Acme Corp",
        "John Doe",
        "https://invite.url"
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Org invitation")
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Acme Corp")
      );
    });

    it("should log 2FA code", async () => {
      const service = createConsoleEmailService();

      await service.sendTwoFactorCode("user@example.com", "123456");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("2FA code")
      );
    });

    it("should resolve all methods successfully", async () => {
      const service = createConsoleEmailService();

      await expect(
        service.sendPasswordReset("a@b.com", "url")
      ).resolves.toBeUndefined();
      await expect(
        service.sendEmailVerification("a@b.com", "url")
      ).resolves.toBeUndefined();
      await expect(
        service.sendMagicLink("a@b.com", "url")
      ).resolves.toBeUndefined();
      await expect(
        service.sendOrganizationInvitation("a@b.com", "org", "name", "url")
      ).resolves.toBeUndefined();
      await expect(
        service.sendTwoFactorCode("a@b.com", "code")
      ).resolves.toBeUndefined();
    });
  });

  describe("console SMS service", () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, "log").mockImplementation(vi.fn());
    });

    it("should create service with all required methods", () => {
      const service = createConsoleSmsService();

      expect(service.sendOTP).toBeDefined();
      expect(service.sendVerification).toBeDefined();
    });

    it("should log OTP code", async () => {
      const service = createConsoleSmsService();

      await service.sendOTP("+1234567890", "123456");

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("OTP"));
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("+1234567890")
      );
    });

    it("should log verification code", async () => {
      const service = createConsoleSmsService();

      await service.sendVerification("+1234567890", "654321");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Verification")
      );
    });

    it("should resolve all methods successfully", async () => {
      const service = createConsoleSmsService();

      await expect(
        service.sendOTP("+1234567890", "123456")
      ).resolves.toBeUndefined();
      await expect(
        service.sendVerification("+1234567890", "654321")
      ).resolves.toBeUndefined();
    });
  });
});
