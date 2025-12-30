import { and, type Database, eq, isNull } from "@workspace/db";
import {
  type NewUserRoleAssignment,
  type Role,
  roles,
  type UserRoleAssignment,
  userRoleAssignments,
} from "@workspace/db/schema";
import type { Enforcer } from "../types";

/**
 * Input for assigning a role to a user
 */
export interface AssignRoleInput {
  userId: string;
  roleId: string;
  applicationId: string;
  tenantId?: string | null;
  assignedBy?: string;
}

/**
 * Generate an assignment ID with prefix
 */
function generateAssignmentId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `ura_${timestamp}${random}`;
}

/**
 * UserRoleService - Manage user-role assignments with Casbin sync
 *
 * This service manages the user_role_assignments table (audit trail) and
 * syncs to Casbin grouping policies for actual authorization.
 *
 * Casbin grouping policy format: g(userId, roleName, appId, tenantId)
 */
export class UserRoleService {
  readonly db: Database;
  readonly enforcer: Enforcer;

  constructor(db: Database, enforcer: Enforcer) {
    this.db = db;
    this.enforcer = enforcer;
  }

  /**
   * Assign a role to a user
   *
   * 1. Validates the role exists and matches app/tenant
   * 2. Inserts audit record into user_role_assignments
   * 3. Adds Casbin grouping policy: g(userId, roleName, appId, tenantId)
   */
  async assignRole(input: AssignRoleInput): Promise<UserRoleAssignment> {
    const tenantId = input.tenantId ?? null;

    // Validate role exists and matches context
    const role = await this.getRole(input.roleId);
    if (!role) {
      throw new Error(`Role not found: ${input.roleId}`);
    }

    if (role.applicationId !== input.applicationId) {
      throw new Error("Role does not belong to the specified application");
    }

    // For tenant-scoped assignment, role must be either global or same tenant
    if (tenantId && role.tenantId && role.tenantId !== tenantId) {
      throw new Error("Role does not belong to the specified tenant");
    }

    // Check if assignment already exists
    const existing = await this.getAssignment(
      input.userId,
      input.roleId,
      input.applicationId,
      tenantId
    );

    if (existing) {
      return existing; // Already assigned
    }

    // Create audit record
    const assignment: NewUserRoleAssignment = {
      id: generateAssignmentId(),
      userId: input.userId,
      roleId: input.roleId,
      applicationId: input.applicationId,
      tenantId,
      assignedBy: input.assignedBy ?? null,
    };

    const result = await this.db
      .insert(userRoleAssignments)
      .values(assignment)
      .returning();

    const created = result[0];
    if (!created) {
      throw new Error("Failed to create role assignment");
    }

    // Add Casbin grouping policy
    const tenant = tenantId ?? "";
    await this.enforcer.addGroupingPolicy(
      input.userId,
      role.name,
      input.applicationId,
      tenant
    );

    return created;
  }

  /**
   * Remove a role from a user
   */
  async removeRole(
    userId: string,
    roleId: string,
    applicationId: string,
    tenantId?: string | null
  ): Promise<boolean> {
    const tenant = tenantId ?? null;

    // Get role name for Casbin
    const role = await this.getRole(roleId);
    if (!role) {
      return false;
    }

    // Remove audit record
    const conditions = [
      eq(userRoleAssignments.userId, userId),
      eq(userRoleAssignments.roleId, roleId),
      eq(userRoleAssignments.applicationId, applicationId),
    ];

    if (tenant) {
      conditions.push(eq(userRoleAssignments.tenantId, tenant));
    } else {
      conditions.push(isNull(userRoleAssignments.tenantId));
    }

    const result = await this.db
      .delete(userRoleAssignments)
      .where(and(...conditions))
      .returning();

    if (result.length === 0) {
      return false;
    }

    // Remove Casbin grouping policy
    await this.enforcer.removeGroupingPolicy(
      userId,
      role.name,
      applicationId,
      tenant ?? ""
    );

    return true;
  }

  /**
   * Get all roles assigned to a user in an application
   */
  async getUserRoles(
    userId: string,
    applicationId: string,
    tenantId?: string | null
  ): Promise<Array<UserRoleAssignment & { role: Role }>> {
    const conditions = [
      eq(userRoleAssignments.userId, userId),
      eq(userRoleAssignments.applicationId, applicationId),
    ];

    if (tenantId !== undefined) {
      if (tenantId) {
        conditions.push(eq(userRoleAssignments.tenantId, tenantId));
      } else {
        conditions.push(isNull(userRoleAssignments.tenantId));
      }
    }

    const assignments = await this.db
      .select({
        assignment: userRoleAssignments,
        role: roles,
      })
      .from(userRoleAssignments)
      .innerJoin(roles, eq(userRoleAssignments.roleId, roles.id))
      .where(and(...conditions));

    return assignments.map((a) => ({
      ...a.assignment,
      role: a.role,
    }));
  }

  /**
   * Get all role names for a user (for Casbin queries)
   */
  async getUserRoleNames(
    userId: string,
    applicationId: string,
    tenantId?: string | null
  ): Promise<string[]> {
    const tenant = tenantId ?? "";
    const rolesForUser = await this.enforcer.getRolesForUserInDomain(
      userId,
      `${applicationId}:${tenant}`
    );
    return rolesForUser;
  }

  /**
   * Get all users with a specific role
   */
  getUsersWithRole(
    roleId: string,
    applicationId: string,
    tenantId?: string | null
  ): Promise<UserRoleAssignment[]> {
    const conditions = [
      eq(userRoleAssignments.roleId, roleId),
      eq(userRoleAssignments.applicationId, applicationId),
    ];

    if (tenantId !== undefined) {
      if (tenantId) {
        conditions.push(eq(userRoleAssignments.tenantId, tenantId));
      } else {
        conditions.push(isNull(userRoleAssignments.tenantId));
      }
    }

    return this.db
      .select()
      .from(userRoleAssignments)
      .where(and(...conditions));
  }

  /**
   * Remove all roles for a user in an application/tenant
   */
  async removeAllUserRoles(
    userId: string,
    applicationId: string,
    tenantId?: string | null
  ): Promise<void> {
    const assignments = await this.getUserRoles(
      userId,
      applicationId,
      tenantId
    );

    for (const assignment of assignments) {
      await this.removeRole(
        userId,
        assignment.roleId,
        applicationId,
        assignment.tenantId
      );
    }
  }

  /**
   * Sync user roles from database to Casbin
   *
   * Use this to recover from Casbin/DB drift or after database restore.
   */
  async syncUserToCasbin(
    userId: string,
    applicationId: string,
    tenantId?: string | null
  ): Promise<void> {
    const tenant = tenantId ?? "";

    // Remove all existing Casbin grouping policies for this user in context
    await this.enforcer.removeFilteredGroupingPolicy(
      0,
      userId,
      "", // role name (any)
      applicationId,
      tenant
    );

    // Get assignments from database
    const assignments = await this.getUserRoles(
      userId,
      applicationId,
      tenantId
    );

    // Add Casbin grouping policies
    for (const assignment of assignments) {
      await this.enforcer.addGroupingPolicy(
        userId,
        assignment.role.name,
        applicationId,
        tenant
      );
    }
  }

  /**
   * Check if user has a specific role
   *
   * Note: Uses Casbin's domain format which combines app and tenant
   */
  async hasRole(
    userId: string,
    roleName: string,
    applicationId: string,
    tenantId?: string | null
  ): Promise<boolean> {
    const tenant = tenantId ?? "";
    // Casbin's hasRoleForUser takes domain as 3rd argument
    // We combine app and tenant into a single domain
    const domain = `${applicationId}:${tenant}`;
    return await this.enforcer.hasRoleForUser(userId, roleName, domain);
  }

  /**
   * Get role by ID from database
   */
  private async getRole(roleId: string): Promise<Role | null> {
    const result = await this.db
      .select()
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Get existing assignment
   */
  private async getAssignment(
    userId: string,
    roleId: string,
    applicationId: string,
    tenantId: string | null
  ): Promise<UserRoleAssignment | null> {
    const conditions = [
      eq(userRoleAssignments.userId, userId),
      eq(userRoleAssignments.roleId, roleId),
      eq(userRoleAssignments.applicationId, applicationId),
    ];

    if (tenantId) {
      conditions.push(eq(userRoleAssignments.tenantId, tenantId));
    } else {
      conditions.push(isNull(userRoleAssignments.tenantId));
    }

    const result = await this.db
      .select()
      .from(userRoleAssignments)
      .where(and(...conditions))
      .limit(1);

    return result[0] ?? null;
  }
}
