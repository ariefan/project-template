import type { Enforcer } from "casbin";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createViolationManager,
  ViolationManager,
  ViolationSeverity,
} from "../violations";

describe("ViolationManager", () => {
  let mockEnforcer: Enforcer;
  let violationManager: ViolationManager;

  beforeEach(() => {
    // Create mock enforcer
    mockEnforcer = {
      addPolicy: vi.fn(),
      removePolicy: vi.fn(),
      getFilteredPolicy: vi.fn(),
    } as unknown as Enforcer;

    violationManager = createViolationManager(mockEnforcer);
  });

  describe("suspendPermission", () => {
    it("should add deny policy for specific permission", async () => {
      vi.mocked(mockEnforcer.addPolicy).mockResolvedValue(true);

      const result = await violationManager.suspendPermission({
        orgId: "org1",
        resource: "posts",
        action: "write",
        severity: ViolationSeverity.MAJOR,
        reason: "Terms violation",
      });

      expect(result).toBe(true);
      expect(mockEnforcer.addPolicy).toHaveBeenCalledWith(
        "*",
        "org1",
        "posts",
        "write",
        "deny"
      );
    });

    it("should return false when policy already exists", async () => {
      vi.mocked(mockEnforcer.addPolicy).mockResolvedValue(false);

      const result = await violationManager.suspendPermission({
        orgId: "org1",
        resource: "posts",
        action: "write",
        severity: ViolationSeverity.MINOR,
        reason: "Duplicate test",
      });

      expect(result).toBe(false);
    });
  });

  describe("restorePermission", () => {
    it("should remove deny policy for specific permission", async () => {
      vi.mocked(mockEnforcer.removePolicy).mockResolvedValue(true);

      const result = await violationManager.restorePermission({
        orgId: "org1",
        resource: "posts",
        action: "write",
      });

      expect(result).toBe(true);
      expect(mockEnforcer.removePolicy).toHaveBeenCalledWith(
        "*",
        "org1",
        "posts",
        "write",
        "deny"
      );
    });

    it("should return false when policy does not exist", async () => {
      vi.mocked(mockEnforcer.removePolicy).mockResolvedValue(false);

      const result = await violationManager.restorePermission({
        orgId: "org1",
        resource: "posts",
        action: "write",
      });

      expect(result).toBe(false);
    });
  });

  describe("suspendResource", () => {
    it("should deny all actions on a resource", async () => {
      vi.mocked(mockEnforcer.addPolicy).mockResolvedValue(true);

      const result = await violationManager.suspendResource({
        orgId: "org1",
        resource: "posts",
        severity: ViolationSeverity.MAJOR,
        reason: "Resource suspended",
      });

      expect(result).toBe(true);
      expect(mockEnforcer.addPolicy).toHaveBeenCalledTimes(4);
      expect(mockEnforcer.addPolicy).toHaveBeenCalledWith(
        "*",
        "org1",
        "posts",
        "read",
        "deny"
      );
      expect(mockEnforcer.addPolicy).toHaveBeenCalledWith(
        "*",
        "org1",
        "posts",
        "write",
        "deny"
      );
      expect(mockEnforcer.addPolicy).toHaveBeenCalledWith(
        "*",
        "org1",
        "posts",
        "delete",
        "deny"
      );
      expect(mockEnforcer.addPolicy).toHaveBeenCalledWith(
        "*",
        "org1",
        "posts",
        "manage",
        "deny"
      );
    });

    it("should return false if any policy fails to add", async () => {
      vi.mocked(mockEnforcer.addPolicy)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);

      const result = await violationManager.suspendResource({
        orgId: "org1",
        resource: "posts",
        severity: ViolationSeverity.MINOR,
        reason: "Test",
      });

      expect(result).toBe(false);
    });
  });

  describe("restoreResource", () => {
    it("should remove deny policies for all actions on a resource", async () => {
      vi.mocked(mockEnforcer.removePolicy).mockResolvedValue(true);

      const result = await violationManager.restoreResource({
        orgId: "org1",
        resource: "posts",
      });

      expect(result).toBe(true);
      expect(mockEnforcer.removePolicy).toHaveBeenCalledTimes(4);
    });

    it("should return true if at least one policy is removed", async () => {
      vi.mocked(mockEnforcer.removePolicy)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false);

      const result = await violationManager.restoreResource({
        orgId: "org1",
        resource: "posts",
      });

      expect(result).toBe(true);
    });
  });

  describe("suspendOrganization", () => {
    it("should deny all permissions for organization", async () => {
      vi.mocked(mockEnforcer.addPolicy).mockResolvedValue(true);

      const result = await violationManager.suspendOrganization({
        orgId: "org1",
        severity: ViolationSeverity.CRITICAL,
        reason: "Emergency lockdown",
      });

      expect(result).toBe(true);
      // 5 resources * 4 actions = 20 policies
      expect(mockEnforcer.addPolicy).toHaveBeenCalledTimes(20);
    });

    it("should return false if any policy fails", async () => {
      vi.mocked(mockEnforcer.addPolicy)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const result = await violationManager.suspendOrganization({
        orgId: "org1",
        severity: ViolationSeverity.CRITICAL,
        reason: "Test failure",
      });

      expect(result).toBe(false);
    });
  });

  describe("restoreOrganization", () => {
    it("should remove all deny policies for organization", async () => {
      vi.mocked(mockEnforcer.getFilteredPolicy).mockResolvedValue([
        ["*", "org1", "posts", "write", "deny"],
        ["*", "org1", "posts", "delete", "deny"],
        ["admin", "org1", "users", "manage", "allow"],
      ]);
      vi.mocked(mockEnforcer.removePolicy).mockResolvedValue(true);

      const result = await violationManager.restoreOrganization({
        orgId: "org1",
      });

      expect(result).toBe(true);
      // Should only remove deny policies (2 out of 3)
      expect(mockEnforcer.removePolicy).toHaveBeenCalledTimes(2);
      expect(mockEnforcer.removePolicy).toHaveBeenCalledWith(
        "*",
        "org1",
        "posts",
        "write",
        "deny"
      );
      expect(mockEnforcer.removePolicy).toHaveBeenCalledWith(
        "*",
        "org1",
        "posts",
        "delete",
        "deny"
      );
    });

    it("should return true if at least one policy is removed", async () => {
      vi.mocked(mockEnforcer.getFilteredPolicy).mockResolvedValue([
        ["*", "org1", "posts", "write", "deny"],
      ]);
      vi.mocked(mockEnforcer.removePolicy).mockResolvedValue(true);

      const result = await violationManager.restoreOrganization({
        orgId: "org1",
      });

      expect(result).toBe(true);
    });

    it("should return false if no policies removed", async () => {
      vi.mocked(mockEnforcer.getFilteredPolicy).mockResolvedValue([
        ["*", "org1", "posts", "write", "deny"],
      ]);
      vi.mocked(mockEnforcer.removePolicy).mockResolvedValue(false);

      const result = await violationManager.restoreOrganization({
        orgId: "org1",
      });

      expect(result).toBe(false);
    });
  });

  describe("hasViolations", () => {
    it("should return true when deny policies exist", async () => {
      vi.mocked(mockEnforcer.getFilteredPolicy).mockResolvedValue([
        ["*", "org1", "posts", "write", "deny"],
        ["admin", "org1", "users", "manage", "allow"],
      ]);

      const result = await violationManager.hasViolations("org1");

      expect(result).toBe(true);
    });

    it("should return false when no deny policies exist", async () => {
      vi.mocked(mockEnforcer.getFilteredPolicy).mockResolvedValue([
        ["admin", "org1", "posts", "write", "allow"],
        ["editor", "org1", "posts", "read", "allow"],
      ]);

      const result = await violationManager.hasViolations("org1");

      expect(result).toBe(false);
    });

    it("should return false when no policies exist", async () => {
      vi.mocked(mockEnforcer.getFilteredPolicy).mockResolvedValue([]);

      const result = await violationManager.hasViolations("org1");

      expect(result).toBe(false);
    });
  });

  describe("getViolations", () => {
    it("should return only deny policies", async () => {
      vi.mocked(mockEnforcer.getFilteredPolicy).mockResolvedValue([
        ["*", "org1", "posts", "write", "deny"],
        ["admin", "org1", "users", "manage", "allow"],
        ["*", "org1", "posts", "delete", "deny"],
      ]);

      const violations = await violationManager.getViolations("org1");

      expect(violations).toHaveLength(2);
      expect(violations[0]).toEqual({
        role: "*",
        resource: "posts",
        action: "write",
        effect: "deny",
      });
      expect(violations[1]).toEqual({
        role: "*",
        resource: "posts",
        action: "delete",
        effect: "deny",
      });
    });

    it("should return empty array when no deny policies exist", async () => {
      vi.mocked(mockEnforcer.getFilteredPolicy).mockResolvedValue([
        ["admin", "org1", "posts", "write", "allow"],
      ]);

      const violations = await violationManager.getViolations("org1");

      expect(violations).toEqual([]);
    });
  });

  describe("createViolationManager", () => {
    it("should create a ViolationManager instance", () => {
      const manager = createViolationManager(mockEnforcer);

      expect(manager).toBeInstanceOf(ViolationManager);
    });
  });
});
