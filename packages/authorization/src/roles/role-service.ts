import { and, db, eq, isNull } from "@workspace/db";
import { type NewRole, type Role, roles } from "@workspace/db/schema";
import type { ConditionType } from "../functions/conditions";
import type { Enforcer } from "../types";

/**
 * Permission effect - allow or deny
 */
export const Effect = {
  ALLOW: "allow",
  DENY: "deny",
} as const;

export type Effect = (typeof Effect)[keyof typeof Effect];

/**
 * Permission definition for a role
 */
export type RolePermission = {
  resource: string;
  action: string;
  effect: Effect;
  condition?: ConditionType;
};

/**
 * Input for creating a role
 */
export type CreateRoleInput = {
  applicationId: string;
  tenantId?: string | null;
  name: string;
  description?: string;
  isSystemRole?: boolean;
  createdBy?: string;
  permissions?: RolePermission[];
};

/**
 * Input for updating a role
 */
export type UpdateRoleInput = {
  name?: string;
  description?: string;
  permissions?: RolePermission[];
};

/**
 * Generate a role ID with prefix
 */
function generateRoleId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `role_${timestamp}${random}`;
}

/**
 * RoleService - CRUD operations for roles with Casbin policy sync
 *
 * This service manages role metadata in the roles table and syncs
 * permissions to Casbin policies. Casbin remains the single source
 * of truth for authorization decisions.
 */
export class RoleService {
  private readonly enforcer: Enforcer;

  constructor(enforcer: Enforcer) {
    this.enforcer = enforcer;
  }

  /**
   * Create a new role and sync its permissions to Casbin
   */
  async create(input: CreateRoleInput): Promise<Role> {
    const roleId = generateRoleId();
    const tenantId = input.tenantId ?? null;

    // Insert role metadata
    const newRole: NewRole = {
      id: roleId,
      applicationId: input.applicationId,
      tenantId,
      name: input.name,
      description: input.description ?? null,
      isSystemRole: input.isSystemRole ?? false,
      createdBy: input.createdBy ?? null,
    };

    const result = await db.insert(roles).values(newRole).returning();
    const role = result[0];

    if (!role) {
      throw new Error("Failed to create role");
    }

    // Sync permissions to Casbin
    if (input.permissions && input.permissions.length > 0) {
      await this.syncPermissionsToCasbin(
        input.name,
        input.applicationId,
        tenantId,
        input.permissions
      );
    }

    return role;
  }

  /**
   * Get a role by ID
   */
  async getById(roleId: string): Promise<Role | null> {
    const result = await db
      .select()
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Get a role by name within an application and optional tenant
   */
  async getByName(
    applicationId: string,
    name: string,
    tenantId?: string | null
  ): Promise<Role | null> {
    const conditions = [
      eq(roles.applicationId, applicationId),
      eq(roles.name, name),
    ];

    if (tenantId) {
      conditions.push(eq(roles.tenantId, tenantId));
    } else {
      conditions.push(isNull(roles.tenantId));
    }

    const result = await db
      .select()
      .from(roles)
      .where(and(...conditions))
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * List global roles for an application (no tenant)
   */
  listGlobalRoles(applicationId: string): Promise<Role[]> {
    return db
      .select()
      .from(roles)
      .where(
        and(eq(roles.applicationId, applicationId), isNull(roles.tenantId))
      );
  }

  /**
   * List tenant-scoped roles
   */
  listTenantRoles(applicationId: string, tenantId: string): Promise<Role[]> {
    return db
      .select()
      .from(roles)
      .where(
        and(
          eq(roles.applicationId, applicationId),
          eq(roles.tenantId, tenantId)
        )
      );
  }

  /**
   * List all roles for an application (global + tenant)
   */
  listAllRoles(applicationId: string): Promise<Role[]> {
    return db
      .select()
      .from(roles)
      .where(eq(roles.applicationId, applicationId));
  }

  /**
   * Update a role's metadata and permissions
   */
  async update(roleId: string, input: UpdateRoleInput): Promise<Role | null> {
    const existingRole = await this.getById(roleId);
    if (!existingRole) {
      return null;
    }

    // Prevent modifying system roles (name only, permissions can be customized)
    if (existingRole.isSystemRole && input.name) {
      throw new Error("Cannot rename system roles");
    }

    const oldName = existingRole.name;
    const newName = input.name ?? existingRole.name;

    // Update role metadata
    const result = await db
      .update(roles)
      .set({
        name: newName,
        description:
          input.description !== undefined
            ? input.description
            : existingRole.description,
      })
      .where(eq(roles.id, roleId))
      .returning();

    const updatedRole = result[0];
    if (!updatedRole) {
      return null;
    }

    // If name changed, update Casbin policies
    if (input.name && input.name !== oldName) {
      await this.renameRoleInCasbin(
        oldName,
        newName,
        existingRole.applicationId,
        existingRole.tenantId
      );
    }

    // If permissions provided, sync to Casbin
    if (input.permissions) {
      // Remove old permissions
      await this.removePermissionsFromCasbin(
        newName,
        existingRole.applicationId,
        existingRole.tenantId
      );
      // Add new permissions
      await this.syncPermissionsToCasbin(
        newName,
        existingRole.applicationId,
        existingRole.tenantId,
        input.permissions
      );
    }

    return updatedRole;
  }

  /**
   * Delete a role and its Casbin policies
   */
  async delete(roleId: string): Promise<boolean> {
    const role = await this.getById(roleId);
    if (!role) {
      return false;
    }

    // Prevent deleting system roles
    if (role.isSystemRole) {
      throw new Error("Cannot delete system roles");
    }

    // Remove role from database
    await db.delete(roles).where(eq(roles.id, roleId));

    // Remove all Casbin policies for this role
    await this.removePermissionsFromCasbin(
      role.name,
      role.applicationId,
      role.tenantId
    );

    // Remove all grouping policies (user-role assignments) for this role
    await this.removeGroupingPoliciesForRole(
      role.name,
      role.applicationId,
      role.tenantId
    );

    return true;
  }

  /**
   * Get permissions for a role from Casbin
   */
  async getPermissions(roleId: string): Promise<RolePermission[]> {
    const role = await this.getById(roleId);
    if (!role) {
      return [];
    }

    const tenant = role.tenantId ?? "";
    const policies = await this.enforcer.getFilteredPolicy(
      0,
      role.name,
      role.applicationId,
      tenant
    );

    return policies.map((policy) => ({
      resource: policy[3] ?? "",
      action: policy[4] ?? "",
      effect: (policy[5] as Effect) ?? Effect.ALLOW,
      condition: (policy[6] as ConditionType) ?? "",
    }));
  }

  /**
   * Sync permissions to Casbin policies
   *
   * Policy format: (sub, app, tenant, obj, act, eft, condition)
   * - sub: role name
   * - app: applicationId
   * - tenant: tenantId (empty string for global)
   * - obj: resource
   * - act: action
   * - eft: effect (allow/deny)
   * - condition: condition type (owner, shared, or empty)
   */
  private async syncPermissionsToCasbin(
    roleName: string,
    applicationId: string,
    tenantId: string | null,
    permissions: RolePermission[]
  ): Promise<void> {
    const tenant = tenantId ?? "";

    const policies = permissions.map((perm) => [
      roleName,
      applicationId,
      tenant,
      perm.resource,
      perm.action,
      perm.effect,
      perm.condition ?? "",
    ]);

    if (policies.length > 0) {
      await this.enforcer.addPolicies(policies);
    }
  }

  /**
   * Remove all permissions for a role from Casbin
   */
  private async removePermissionsFromCasbin(
    roleName: string,
    applicationId: string,
    tenantId: string | null
  ): Promise<void> {
    const tenant = tenantId ?? "";
    await this.enforcer.removeFilteredPolicy(
      0,
      roleName,
      applicationId,
      tenant
    );
  }

  /**
   * Rename a role in Casbin policies
   */
  private async renameRoleInCasbin(
    oldName: string,
    newName: string,
    applicationId: string,
    tenantId: string | null
  ): Promise<void> {
    const tenant = tenantId ?? "";

    // Get existing policies
    const policies = await this.enforcer.getFilteredPolicy(
      0,
      oldName,
      applicationId,
      tenant
    );

    // Remove old policies
    await this.enforcer.removeFilteredPolicy(0, oldName, applicationId, tenant);

    // Add new policies with updated role name
    const newPolicies = policies.map((policy) => [
      newName,
      policy[1] ?? applicationId,
      policy[2] ?? tenant,
      policy[3] ?? "",
      policy[4] ?? "",
      policy[5] ?? Effect.ALLOW,
      policy[6] ?? "",
    ]);

    if (newPolicies.length > 0) {
      await this.enforcer.addPolicies(newPolicies);
    }

    // Update grouping policies (user-role assignments)
    const groupingPolicies = await this.enforcer.getFilteredGroupingPolicy(
      1,
      oldName,
      applicationId,
      tenant
    );

    for (const gp of groupingPolicies) {
      const userId = gp[0] ?? "";
      const appId = gp[2] ?? applicationId;
      const tenId = gp[3] ?? tenant;
      await this.enforcer.removeGroupingPolicy(userId, oldName, appId, tenId);
      await this.enforcer.addGroupingPolicy(userId, newName, appId, tenId);
    }
  }

  /**
   * Remove all grouping policies for a role
   */
  private async removeGroupingPoliciesForRole(
    roleName: string,
    applicationId: string,
    tenantId: string | null
  ): Promise<void> {
    const tenant = tenantId ?? "";
    await this.enforcer.removeFilteredGroupingPolicy(
      1,
      roleName,
      applicationId,
      tenant
    );
  }
}
