/**
 * ============================================================================
 * ROLES API - Role Management Endpoints
 * ============================================================================
 *
 * Multi-Application RBAC role management with:
 * - Global roles (app-scoped, no tenant)
 * - Tenant-scoped roles
 * - User role assignments
 * - Context switching (app/tenant)
 *
 * @see docs/api-guide/03-security/02-authorization.md
 * ============================================================================
 */

import "@typespec/http";
import "../common/responses.tsp";
import "../common/errors.tsp";
import "../models/role.tsp";

using TypeSpec.Http;

namespace ProjectAPI;

// ============================================================================
// GLOBAL ROLES (App-scoped, no tenant)
// ============================================================================

/**
 * Global Roles API
 *
 * Manage global roles that apply across all tenants within an application.
 * Global roles are useful for super admins, app-level permissions, etc.
 */
@route("/v1/roles")
@tag("Roles")
interface GlobalRoles {
  /**
   * List all global roles
   *
   * Returns global roles (no tenant scope) for the default application.
   */
  @get
  @summary("List global roles")
  list(
    /** Page number (1-indexed) */
    @query page?: int32 = 1,

    /** Number of items per page */
    @query pageSize?: int32 = 50,

    /** Filter by system role status */
    @query isSystemRole?: boolean
  ): RoleListResponse | ErrorResponse;

  /**
   * Create a global role
   *
   * Creates a role that applies across all tenants.
   */
  @post
  @summary("Create global role")
  create(
    /** Role data */
    @body body: CreateRoleRequest
  ):
    | {
        @statusCode statusCode: 201;
        @body body: RoleResponse;
      }
    | ErrorResponse;

  /**
   * Get a role by ID
   */
  @route("/{roleId}")
  @get
  @summary("Get role")
  get(
    /** Role ID */
    @path roleId: string
  ): RoleResponse | ErrorResponse;

  /**
   * Update a role
   *
   * System roles cannot be renamed but their permissions can be modified.
   */
  @route("/{roleId}")
  @patch(#{ implicitOptionality: true })
  @summary("Update role")
  update(
    /** Role ID */
    @path roleId: string,

    /** Role update data */
    @body body: UpdateRoleRequest
  ): RoleResponse | ErrorResponse;

  /**
   * Delete a role
   *
   * System roles cannot be deleted.
   * Fails if role is assigned to any users.
   */
  @route("/{roleId}")
  @delete
  @summary("Delete role")
  delete(
    /** Role ID */
    @path roleId: string
  ):
    | {
        @statusCode statusCode: 204;
      }
    | ErrorResponse;
}

// ============================================================================
// TENANT-SCOPED ROLES
// ============================================================================

/**
 * Tenant Roles API
 *
 * Manage roles scoped to a specific organization/tenant.
 * These roles only apply within the specified tenant.
 */
@route("/v1/orgs/{orgId}/roles")
@tag("Roles")
interface TenantRoles {
  /**
   * List all roles in a tenant
   *
   * Returns both system roles and custom roles for this tenant.
   */
  @get
  @summary("List tenant roles")
  list(
    /** Organization ID */
    @path orgId: string,

    /** Page number (1-indexed) */
    @query page?: int32 = 1,

    /** Number of items per page */
    @query pageSize?: int32 = 50,

    /** Filter by system role status */
    @query isSystemRole?: boolean
  ): RoleListResponse | ErrorResponse;

  /**
   * Create a tenant-scoped role
   *
   * Creates a custom role for this specific tenant.
   */
  @post
  @summary("Create tenant role")
  create(
    /** Organization ID */
    @path orgId: string,

    /** Role data */
    @body body: CreateRoleRequest
  ):
    | {
        @statusCode statusCode: 201;
        @body body: RoleResponse;
      }
    | ErrorResponse;

  /**
   * Get a role by ID
   */
  @route("/{roleId}")
  @get
  @summary("Get role")
  get(
    /** Organization ID */
    @path orgId: string,

    /** Role ID */
    @path roleId: string
  ): RoleResponse | ErrorResponse;

  /**
   * Update a role
   *
   * System roles cannot be renamed but their permissions can be modified.
   */
  @route("/{roleId}")
  @patch(#{ implicitOptionality: true })
  @summary("Update role")
  update(
    /** Organization ID */
    @path orgId: string,

    /** Role ID */
    @path roleId: string,

    /** Role update data */
    @body body: UpdateRoleRequest
  ): RoleResponse | ErrorResponse;

  /**
   * Delete a role
   *
   * System roles cannot be deleted.
   * Fails if role is assigned to any users.
   */
  @route("/{roleId}")
  @delete
  @summary("Delete role")
  delete(
    /** Organization ID */
    @path orgId: string,

    /** Role ID */
    @path roleId: string
  ):
    | {
        @statusCode statusCode: 204;
      }
    | ErrorResponse;
}

// ============================================================================
// USER ROLE ASSIGNMENTS
// ============================================================================

/**
 * User Roles API - Role assignment within a tenant
 */
@route("/v1/orgs/{orgId}/users/{userId}/roles")
@tag("Roles")
interface UserTenantRoles {
  /**
   * List roles assigned to a user in this tenant
   *
   * Returns both global and tenant-specific role assignments.
   */
  @get
  @summary("List user roles in tenant")
  list(
    /** Organization ID */
    @path orgId: string,

    /** User ID */
    @path userId: string
  ): UserRoleAssignmentListResponse | ErrorResponse;

  /**
   * Assign a role to a user in this tenant
   */
  @post
  @summary("Assign role to user")
  assign(
    /** Organization ID */
    @path orgId: string,

    /** User ID */
    @path userId: string,

    /** Role assignment */
    @body body: AssignRoleRequest
  ):
    | {
        @statusCode statusCode: 201;
        @body body: UserRoleAssignmentResponse;
      }
    | ErrorResponse;

  /**
   * Remove a role from a user
   */
  @route("/{roleId}")
  @delete
  @summary("Remove role from user")
  remove(
    /** Organization ID */
    @path orgId: string,

    /** User ID */
    @path userId: string,

    /** Role ID to remove */
    @path roleId: string
  ):
    | {
        @statusCode statusCode: 204;
      }
    | ErrorResponse;
}

/**
 * User Permissions API - View effective permissions
 */
@route("/v1/orgs/{orgId}/users/{userId}/permissions")
@tag("Roles")
interface UserPermissions {
  /**
   * Get user's effective permissions in this tenant
   *
   * Returns all roles (global + tenant) and the combined effective permissions
   * after applying deny-override resolution.
   */
  @get
  @summary("Get user effective permissions")
  get(
    /** Organization ID */
    @path orgId: string,

    /** User ID */
    @path userId: string
  ): UserEffectivePermissionsResponse | ErrorResponse;
}

// ============================================================================
// CONTEXT MANAGEMENT
// ============================================================================

/**
 * User Context API - Current user's active context
 */
@route("/v1/users/me/context")
@tag("Context")
interface CurrentUserContext {
  /**
   * Get current user's active context
   *
   * Returns the currently active application and tenant for the user.
   * This is for UI state management, not authorization decisions.
   */
  @get
  @summary("Get active context")
  get(): ActiveContextResponse | ErrorResponse;
}

/**
 * Context Switch API
 */
@route("/v1/users/me/switch-context")
@tag("Context")
interface ContextSwitch {
  /**
   * Switch user's active context
   *
   * Changes the active application and/or tenant.
   * This is for UI state management, not authorization decisions.
   */
  @post
  @summary("Switch context")
  switch(
    /** Target context */
    @body body: SwitchContextRequest
  ): SwitchContextResponse | ErrorResponse;
}

/**
 * Available Contexts API
 */
@route("/v1/users/me/available-contexts")
@tag("Context")
interface AvailableContexts {
  /**
   * List all available contexts for the current user
   *
   * Returns all applications and tenants the user has access to.
   */
  @get
  @summary("List available contexts")
  list(): UserContextListResponse | ErrorResponse;
}

/**
 * Cross-context user roles (view roles across all contexts)
 */
@route("/v1/users/{userId}/roles")
@tag("Roles")
interface AllUserRoles {
  /**
   * List user's roles across all applications and tenants
   *
   * Returns all role assignments for the user across all contexts.
   */
  @get
  @summary("List all user roles")
  list(
    /** User ID */
    @path userId: string
  ): UserRoleAssignmentListResponse | ErrorResponse;
}
