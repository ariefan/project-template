/**
 * ============================================================================
 * ROLE & PERMISSION MODELS
 * ============================================================================
 *
 * Role-Based Access Control (RBAC) with tenant-scoped permissions.
 *
 * Key concepts:
 * - Users can belong to multiple tenants
 * - Each tenant can assign different roles to the same user
 * - Permissions use format: {resource}:{action}
 *
 * @see docs/api-guide/03-security/02-authorization.md
 * ============================================================================
 */

import "../common/responses.tsp";

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Permission actions
 */
enum PermissionAction {
  /** View resource */
  read: "read",

  /** Create and update resource */
  write: "write",

  /** Delete resource */
  delete: "delete",

  /** Full control */
  admin: "admin",

  /** All actions (wildcard) */
  all: "*",
}

// ============================================================================
// MAIN MODELS
// ============================================================================

/**
 * Role resource model
 *
 * Roles are tenant-scoped and contain a set of permissions.
 */
model Role {
  /** Unique role identifier (format: role_abc123) */
  @example("role_admin")
  id: string;

  /** Tenant this role belongs to */
  @example("org_abc123")
  tenantId: string;

  /** Role name */
  @example("Admin")
  name: string;

  /** Role description */
  @example("Full administrative access")
  description?: string;

  /** Permissions granted by this role (format: resource:action) */
  @example(#["users:*", "invoices:read", "settings:admin"])
  permissions: string[];

  /** Whether this is a system-defined role (cannot be deleted) */
  isSystemRole: boolean;

  /** Timestamp when the role was created */
  createdAt: utcDateTime;

  /** Timestamp when the role was last updated */
  updatedAt: utcDateTime;
}

/**
 * User's role assignment within a tenant
 */
model UserRole {
  /** User ID */
  @example("usr_123")
  userId: string;

  /** Tenant ID */
  @example("org_abc123")
  tenantId: string;

  /** Role ID */
  @example("role_admin")
  roleId: string;

  /** Role name (denormalized for convenience) */
  @example("Admin")
  roleName: string;

  /** When the role was assigned */
  assignedAt: utcDateTime;

  /** Who assigned the role */
  @example("usr_owner")
  assignedBy: string;
}

/**
 * User's permissions within a tenant
 */
model UserPermissions {
  /** User ID */
  @example("usr_123")
  userId: string;

  /** Tenant ID */
  @example("org_abc123")
  tenantId: string;

  /** Roles assigned to the user */
  roles: {
    /** Role ID */
    id: string;

    /** Role name */
    name: string;

    /** Permissions from this role */
    permissions: string[];
  }[];

  /** Combined permissions from all roles (deduplicated, expanded) */
  @example(#["users:read", "users:write", "users:delete", "invoices:read"])
  effectivePermissions: string[];
}

/**
 * User's roles across all tenants
 */
model UserTenantRoles {
  /** Tenant ID */
  @example("org_abc123")
  tenantId: string;

  /** Tenant name */
  @example("Acme Corp")
  tenantName: string;

  /** Role names in this tenant */
  @example(#["admin", "billing_manager"])
  roles: string[];
}

// ============================================================================
// REQUEST MODELS
// ============================================================================

/**
 * Request to create a custom role
 */
model CreateRoleRequest {
  /** Role name */
  @minLength(1)
  @maxLength(100)
  name: string;

  /** Role description */
  @maxLength(500)
  description?: string;

  /** Permissions to grant (format: resource:action) */
  @minItems(1)
  permissions: string[];
}

/**
 * Request to update a role
 */
model UpdateRoleRequest {
  /** Role name */
  @minLength(1)
  @maxLength(100)
  name?: string;

  /** Role description */
  @maxLength(500)
  description?: string;

  /** Permissions to grant */
  permissions?: string[];
}

/**
 * Request to assign a role to a user
 */
model AssignRoleRequest {
  /** Role ID to assign */
  roleId: string;
}

/**
 * Request to switch active tenant
 */
model SwitchTenantRequest {
  /** Target tenant ID */
  tenantId: string;
}

// ============================================================================
// RESPONSE MODELS
// ============================================================================

/**
 * Single role response
 */
model RoleResponse {
  data: Role;
  meta: ResponseMeta;
}

/**
 * Role list response
 */
model RoleListResponse {
  data: Role[];
  pagination: Pagination;
  meta: ResponseMeta;
}

/**
 * User permissions response
 */
model UserPermissionsResponse {
  data: UserPermissions;
  meta: ResponseMeta;
}

/**
 * User role assignment response
 */
model UserRoleResponse {
  data: UserRole;
  meta: ResponseMeta;
}

/**
 * User tenant roles response (all tenants)
 */
model UserTenantRolesResponse {
  data: UserTenantRoles[];
  meta: ResponseMeta;
}

/**
 * Tenant switch response with new token
 */
model SwitchTenantResponse {
  data: {
    /** New active tenant ID */
    tenantId: string;

    /** Tenant name */
    tenantName: string;

    /** Roles in the new tenant */
    roles: string[];

    /** Permissions in the new tenant */
    permissions: string[];

    /** New access token scoped to the tenant */
    accessToken: string;
  };

  meta: ResponseMeta;
}
