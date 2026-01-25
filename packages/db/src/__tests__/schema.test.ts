import { getTableColumns, getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  applications,
  authorizationLogs,
  casbinRules,
  exampleComments,
  examplePostStatusEnum,
  examplePosts,
  files,
  jobs,
  notificationPreferences,
  notifications,
  notificationTemplates,
  organizations,
  roles,
  SystemRoles,
  sessions,
  TenantRoles,
  userActiveContext,
  userRoleAssignments,
  users,
} from "../schema";

describe("@workspace/db schema", () => {
  describe("examplePosts table", () => {
    it("should have correct table name", () => {
      expect(getTableName(examplePosts)).toBe("example_posts");
    });

    it("should have required columns", () => {
      const columns = getTableColumns(examplePosts);
      expect(columns.id).toBeDefined();
      expect(columns.orgId).toBeDefined();
      expect(columns.title).toBeDefined();
      expect(columns.content).toBeDefined();
      expect(columns.authorId).toBeDefined();
      expect(columns.status).toBeDefined();
      expect(columns.isDeleted).toBeDefined();
      expect(columns.createdAt).toBeDefined();
      expect(columns.updatedAt).toBeDefined();
    });

    it("should have soft delete columns", () => {
      const columns = getTableColumns(examplePosts);
      expect(columns.isDeleted).toBeDefined();
      expect(columns.deletedAt).toBeDefined();
      expect(columns.deletedBy).toBeDefined();
    });
  });

  describe("examplePostStatusEnum", () => {
    it("should have valid status values", () => {
      expect(examplePostStatusEnum.enumValues).toContain("draft");
      expect(examplePostStatusEnum.enumValues).toContain("published");
      expect(examplePostStatusEnum.enumValues).toContain("archived");
    });
  });

  describe("exampleComments table", () => {
    it("should have correct table name", () => {
      expect(getTableName(exampleComments)).toBe("example_comments");
    });

    it("should have required columns", () => {
      const columns = getTableColumns(exampleComments);
      expect(columns.id).toBeDefined();
      expect(columns.postId).toBeDefined();
      expect(columns.content).toBeDefined();
      expect(columns.authorId).toBeDefined();
    });
  });

  describe("users table", () => {
    it("should have correct table name", () => {
      expect(getTableName(users)).toBe("users");
    });

    it("should have authentication columns", () => {
      const columns = getTableColumns(users);
      expect(columns.id).toBeDefined();
      expect(columns.email).toBeDefined();
      expect(columns.name).toBeDefined();
      expect(columns.emailVerified).toBeDefined();
    });
  });

  describe("sessions table", () => {
    it("should have correct table name", () => {
      expect(getTableName(sessions)).toBe("sessions");
    });

    it("should have session management columns", () => {
      const columns = getTableColumns(sessions);
      expect(columns.id).toBeDefined();
      expect(columns.userId).toBeDefined();
      expect(columns.token).toBeDefined();
      expect(columns.expiresAt).toBeDefined();
    });
  });

  describe("organizations table", () => {
    it("should have correct table name", () => {
      expect(getTableName(organizations)).toBe("organizations");
    });

    it("should have required columns", () => {
      const columns = getTableColumns(organizations);
      expect(columns.id).toBeDefined();
      expect(columns.name).toBeDefined();
      expect(columns.slug).toBeDefined();
    });
  });

  describe("roles table", () => {
    it("should have correct table name", () => {
      expect(getTableName(roles)).toBe("roles");
    });

    it("should have RBAC columns", () => {
      const columns = getTableColumns(roles);
      expect(columns.id).toBeDefined();
      expect(columns.applicationId).toBeDefined();
      expect(columns.tenantId).toBeDefined();
      expect(columns.name).toBeDefined();
      expect(columns.isSystemRole).toBeDefined();
    });
  });

  describe("SystemRoles constants", () => {
    it("should define global roles", () => {
      expect(SystemRoles.SUPER_ADMIN).toBe("super_admin");
      expect(SystemRoles.SUPPORT).toBe("support");
      expect(SystemRoles.USER).toBe("user");
    });
  });

  describe("TenantRoles constants", () => {
    it("should define tenant roles", () => {
      expect(TenantRoles.OWNER).toBe("owner");
      expect(TenantRoles.ADMIN).toBe("admin");
      expect(TenantRoles.MEMBER).toBe("member");
      expect(TenantRoles.VIEWER).toBe("viewer");
    });
  });

  describe("userRoleAssignments table", () => {
    it("should have correct table name", () => {
      expect(getTableName(userRoleAssignments)).toBe("user_role_assignments");
    });

    it("should have assignment columns", () => {
      const columns = getTableColumns(userRoleAssignments);
      expect(columns.id).toBeDefined();
      expect(columns.userId).toBeDefined();
      expect(columns.roleId).toBeDefined();
      expect(columns.tenantId).toBeDefined();
    });
  });

  describe("userActiveContext table", () => {
    it("should have correct table name", () => {
      expect(getTableName(userActiveContext)).toBe("user_active_context");
    });

    it("should have context switching columns", () => {
      const columns = getTableColumns(userActiveContext);
      expect(columns.userId).toBeDefined();
      expect(columns.activeApplicationId).toBeDefined();
      expect(columns.activeTenantId).toBeDefined();
    });
  });

  describe("applications table", () => {
    it("should have correct table name", () => {
      expect(getTableName(applications)).toBe("applications");
    });

    it("should have multi-app columns", () => {
      const columns = getTableColumns(applications);
      expect(columns.id).toBeDefined();
      expect(columns.name).toBeDefined();
      expect(columns.slug).toBeDefined();
    });
  });

  describe("casbinRules table", () => {
    it("should have correct table name", () => {
      expect(getTableName(casbinRules)).toBe("casbin_rules");
    });

    it("should have policy columns", () => {
      const columns = getTableColumns(casbinRules);
      expect(columns.id).toBeDefined();
      expect(columns.ptype).toBeDefined();
      expect(columns.v0).toBeDefined();
      expect(columns.v1).toBeDefined();
      expect(columns.v2).toBeDefined();
    });
  });

  describe("authorizationLogs table", () => {
    it("should have correct table name", () => {
      expect(getTableName(authorizationLogs)).toBe("authorization_logs");
    });

    it("should have audit columns", () => {
      const columns = getTableColumns(authorizationLogs);
      expect(columns.id).toBeDefined();
      expect(columns.eventType).toBeDefined();
      expect(columns.userId).toBeDefined();
      expect(columns.recordHash).toBeDefined();
    });
  });

  describe("files table", () => {
    it("should have correct table name", () => {
      expect(getTableName(files)).toBe("files");
    });

    it("should have file management columns", () => {
      const columns = getTableColumns(files);
      expect(columns.id).toBeDefined();
      expect(columns.filename).toBeDefined();
      expect(columns.mimeType).toBeDefined();
      expect(columns.size).toBeDefined();
      expect(columns.access).toBeDefined();
    });
  });

  describe("jobs table", () => {
    it("should have correct table name", () => {
      expect(getTableName(jobs)).toBe("jobs");
    });

    it("should have async job columns", () => {
      const columns = getTableColumns(jobs);
      expect(columns.id).toBeDefined();
      expect(columns.type).toBeDefined();
      expect(columns.status).toBeDefined();
      expect(columns.progress).toBeDefined();
    });
  });

  describe("notifications table", () => {
    it("should have correct table name", () => {
      expect(getTableName(notifications)).toBe("notifications");
    });

    it("should have notification columns", () => {
      const columns = getTableColumns(notifications);
      expect(columns.id).toBeDefined();
      expect(columns.userId).toBeDefined();
      expect(columns.channel).toBeDefined();
      expect(columns.status).toBeDefined();
    });
  });

  describe("notificationPreferences table", () => {
    it("should have correct table name", () => {
      expect(getTableName(notificationPreferences)).toBe(
        "notification_preferences"
      );
    });

    it("should have preference columns", () => {
      const columns = getTableColumns(notificationPreferences);
      expect(columns.id).toBeDefined();
      expect(columns.userId).toBeDefined();
      expect(columns.emailEnabled).toBeDefined();
      expect(columns.pushEnabled).toBeDefined();
    });
  });

  describe("notificationTemplates table", () => {
    it("should have correct table name", () => {
      expect(getTableName(notificationTemplates)).toBe(
        "notification_templates"
      );
    });

    it("should have template columns", () => {
      const columns = getTableColumns(notificationTemplates);
      expect(columns.id).toBeDefined();
      expect(columns.name).toBeDefined();
      expect(columns.subject).toBeDefined();
      expect(columns.body).toBeDefined();
    });
  });
});
