import { and, type Database, eq, isNull } from "@workspace/db";
import {
  type NewUserRoleAssignment,
  type Role,
  roles,
  type UserRoleAssignment,
  userRoleAssignments,
} from "@workspace/db/schema";

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
 * UserRoleService - Manage user-role assignments
 *
 * Architecture:
 * - DB (user_role_assignments table) is the source of truth for user→role mapping
 * - Casbin is only used for role→permission evaluation (p policies, not g policies)
 *
 * This service manages CRUD operations on user_role_assignments table.
 * The authorization plugin performs DB lookup during authorization checks.
 */
export class UserRoleService {
  readonly db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Assign a role to a user
   *
   * 1. Validates the role exists and matches app/tenant
   * 2. Inserts record into user_role_assignments
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

    // Create assignment record
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

    // Remove assignment record
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

    return result.length > 0;
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
   * Get all role names for a user
   */
  async getUserRoleNames(
    userId: string,
    applicationId: string,
    tenantId?: string | null
  ): Promise<string[]> {
    const userRoles = await this.getUserRoles(userId, applicationId, tenantId);
    return userRoles.map((ur) => ur.role.name);
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
   * Check if user has a specific role
   */
  async hasRole(
    userId: string,
    roleName: string,
    applicationId: string,
    tenantId?: string | null
  ): Promise<boolean> {
    const roleNames = await this.getUserRoleNames(
      userId,
      applicationId,
      tenantId
    );
    return roleNames.includes(roleName);
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
