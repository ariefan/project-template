/**
 * ============================================================================
 * ROLES API - Role Management Endpoints
 * ============================================================================
 *
 * RBAC role management within a tenant.
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

/**
 * Roles API endpoints
 *
 * Manage custom roles within an organization.
 * System roles (owner, admin, member, viewer) are predefined.
 */
@route("/v1/orgs/{orgId}/roles")
@tag("Roles")
interface Roles {
  /**
   * List all roles in an organization
   *
   * Returns both system roles and custom roles.
   */
  @get
  @summary("List roles")
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
   * Create a custom role
   *
   * System roles cannot be created via API.
   */
  @post
  @summary("Create role")
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
   * Update a custom role
   *
   * System roles cannot be modified.
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
   * Delete a custom role
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

/**
 * User Roles API - Role assignment for users
 *
 * Nested under users endpoint for clarity.
 */
@route("/v1/orgs/{orgId}/users/{userId}/roles")
@tag("Roles")
interface UserRoles {
  /**
   * List roles assigned to a user in this tenant
   */
  @get
  @summary("List user roles")
  list(
    /** Organization ID */
    @path orgId: string,

    /** User ID */
    @path userId: string
  ): {
    data: UserRole[];
    meta: ResponseMeta;
  } | ErrorResponse;

  /**
   * Assign a role to a user
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
        @body body: UserRoleResponse;
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
interface UserPermissionsEndpoint {
  /**
   * Get user's effective permissions in this tenant
   *
   * Returns all roles and the combined effective permissions.
   */
  @get
  @summary("Get user permissions")
  get(
    /** Organization ID */
    @path orgId: string,

    /** User ID */
    @path userId: string
  ): UserPermissionsResponse | ErrorResponse;
}

/**
 * Cross-tenant user roles (user-scoped, not tenant-scoped)
 */
@route("/v1/users/{userId}/tenant-roles")
@tag("Roles")
interface CrossTenantRoles {
  /**
   * List user's roles across all tenants
   *
   * Returns all tenants the user belongs to with their roles.
   */
  @get
  @summary("List user tenant roles")
  list(
    /** User ID */
    @path userId: string
  ): UserTenantRolesResponse | ErrorResponse;
}

/**
 * Tenant switching endpoint
 */
@route("/v1/users/{userId}/switch-tenant")
@tag("Roles")
interface TenantSwitch {
  /**
   * Switch user's active tenant
   *
   * Returns a new access token scoped to the target tenant.
   */
  @post
  @summary("Switch tenant")
  switch(
    /** User ID */
    @path userId: string,

    /** Target tenant */
    @body body: SwitchTenantRequest
  ): SwitchTenantResponse | ErrorResponse;
}
