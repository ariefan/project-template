/**
 * ============================================================================
 * ROLE & PERMISSION MODELS
 * ============================================================================
 *
 * Multi-Application Role-Based Access Control (RBAC) with:
 * - Multiple applications with isolated tenants, users, and roles
 * - Global roles (app-scoped, no tenant) and tenant-scoped roles
 * - Multiple roles per user with deny-override permission model
 * - Dynamic conditions (ownership, sharing) for fine-grained access
 *
 * Key concepts:
 * - Users can belong to multiple applications
 * - Each application has its own tenants and roles
 * - Global roles apply across all tenants within an application
 * - Tenant roles are scoped to a specific organization
 * - Permissions combine allow/deny with deny taking precedence
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

  /** Create resource */
  create: "create",

  /** Update resource */
  update: "update",

  /** Delete resource */
  delete: "delete",

  /** Full control (manage settings, permissions) */
  manage: "manage",

  /** All actions (wildcard) */
  all: "*",
}

/**
 * Permission effect - whether to allow or deny access
 *
 * When a user has multiple roles, permissions are combined:
 * - If ANY role denies an action, it is denied (deny wins)
 * - If no role denies and ANY role allows, it is allowed
 * - If no rules match, access is denied (default deny)
 */
enum PermissionEffect {
  /** Grant access */
  allow: "allow",

  /** Explicitly deny access (overrides allow) */
  deny: "deny",
}

/**
 * Permission condition - when the permission applies
 *
 * Conditions enable dynamic, context-aware access control.
 */
enum PermissionCondition {
  /** No condition - permission always applies */
  none: "",

  /** User must own the resource */
  owner: "owner",

  /** Resource must be shared with the user */
  shared: "shared",
}

// ============================================================================
// MAIN MODELS
// ============================================================================

/**
 * Application resource model
 *
 * Applications provide isolation for tenants, users, and roles.
 * Each application has its own set of roles and permissions.
 */
model Application {
  /** Unique application identifier (format: app_abc123) */
  @example("app_default")
  id: string;

  /** Application name */
  @example("My SaaS Platform")
  name: string;

  /** URL-friendly slug */
  @example("my-saas")
  slug: string;

  /** Application description */
  @example("Main customer-facing application")
  description?: string;

  /** Timestamp when the application was created */
  createdAt: utcDateTime;

  /** Timestamp when the application was last updated */
  updatedAt: utcDateTime;
}

/**
 * Permission definition
 *
 * Permissions define what actions can be performed on resources.
 * They support allow/deny effects and optional conditions.
 */
model Permission {
  /** Resource identifier (e.g., "users", "invoices", "settings") */
  @example("documents")
  resource: string;

  /** Action to perform on the resource */
  @example("update")
  action: PermissionAction | string;

  /** Whether to allow or deny this action */
  effect: PermissionEffect;

  /** Optional condition for when this permission applies */
  condition?: PermissionCondition;
}

/**
 * Role resource model
 *
 * Roles can be:
 * - **Global roles**: App-scoped (tenantId is null), apply across all tenants
 * - **Tenant roles**: Scoped to a specific organization
 *
 * Users can have multiple roles, and permissions are combined with
 * deny-override semantics.
 */
model Role {
  /** Unique role identifier (format: role_abc123) */
  @example("role_admin")
  id: string;

  /** Application this role belongs to */
  @example("app_default")
  applicationId: string;

  /** Tenant this role belongs to (null for global roles) */
  @example("org_abc123")
  tenantId?: string;

  /** Role name */
  @example("Admin")
  name: string;

  /** Role description */
  @example("Full administrative access")
  description?: string;

  /** Permissions granted by this role */
  permissions: Permission[];

  /** Whether this is a system-defined role (cannot be deleted or renamed) */
  isSystemRole: boolean;

  /** Whether this is a global role (tenantId is null) */
  isGlobalRole: boolean;

  /** Timestamp when the role was created */
  createdAt: utcDateTime;

  /** Timestamp when the role was last updated */
  updatedAt: utcDateTime;

  /** User who created this role */
  @example("usr_owner")
  createdBy?: string;
}

/**
 * User's role assignment
 *
 * Represents a single role assigned to a user within a specific
 * application and optional tenant context.
 */
model UserRoleAssignment {
  /** Assignment ID */
  @example("ura_abc123")
  id: string;

  /** User ID */
  @example("usr_123")
  userId: string;

  /** Application ID */
  @example("app_default")
  applicationId: string;

  /** Tenant ID (null for global role assignments) */
  @example("org_abc123")
  tenantId?: string;

  /** Role ID */
  @example("role_admin")
  roleId: string;

  /** Role name (denormalized for convenience) */
  @example("Admin")
  roleName: string;

  /** Whether this is a global role assignment */
  isGlobalRole: boolean;

  /** When the role was assigned */
  assignedAt: utcDateTime;

  /** Who assigned the role */
  @example("usr_owner")
  assignedBy?: string;
}

/**
 * User's effective permissions
 *
 * Represents the combined permissions from all roles assigned to a user
 * within a specific application and tenant context.
 */
model UserEffectivePermissions {
  /** User ID */
  @example("usr_123")
  userId: string;

  /** Application ID */
  @example("app_default")
  applicationId: string;

  /** Tenant ID (context for permission calculation) */
  @example("org_abc123")
  tenantId?: string;

  /** Global roles (app-scoped, no tenant) */
  globalRoles: {
    /** Role ID */
    id: string;

    /** Role name */
    name: string;

    /** Permissions from this role */
    permissions: Permission[];
  }[];

  /** Tenant-specific roles */
  tenantRoles: {
    /** Role ID */
    id: string;

    /** Role name */
    name: string;

    /** Permissions from this role */
    permissions: Permission[];
  }[];

  /** Combined effective permissions (after deny-override resolution) */
  effectivePermissions: Permission[];

  /** Simple list of allowed actions (for quick checks) */
  @example(#["users:read", "users:update", "documents:read", "documents:update:owner"])
  allowedActions: string[];
}

/**
 * User's context across applications and tenants
 */
model UserContext {
  /** Application ID */
  @example("app_default")
  applicationId: string;

  /** Application name */
  @example("My SaaS Platform")
  applicationName: string;

  /** Tenant ID */
  @example("org_abc123")
  tenantId: string;

  /** Tenant name */
  @example("Acme Corp")
  tenantName: string;

  /** Role names in this context */
  @example(#["admin", "billing_manager"])
  roles: string[];
}

/**
 * User's active context (current app/tenant selection)
 */
model ActiveContext {
  /** User ID */
  @example("usr_123")
  userId: string;

  /** Currently active application ID */
  @example("app_default")
  activeApplicationId: string;

  /** Currently active tenant ID (null if no tenant selected) */
  @example("org_abc123")
  activeTenantId?: string;

  /** When the context was last updated */
  updatedAt: utcDateTime;
}

// ============================================================================
// REQUEST MODELS
// ============================================================================

/**
 * Permission input for creating/updating roles
 */
model PermissionInput {
  /** Resource identifier */
  resource: string;

  /** Action to perform */
  action: string;

  /** Effect (defaults to "allow" if not specified) */
  effect?: PermissionEffect;

  /** Optional condition */
  condition?: PermissionCondition;
}

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

  /** Permissions to grant */
  @minItems(1)
  permissions: PermissionInput[];
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

  /** Permissions to grant (replaces existing permissions) */
  permissions?: PermissionInput[];
}

/**
 * Request to assign a role to a user
 */
model AssignRoleRequest {
  /** Role ID to assign */
  roleId: string;
}

/**
 * Request to switch active context (application and/or tenant)
 */
model SwitchContextRequest {
  /** Target application ID (optional, defaults to current) */
  applicationId?: string;

  /** Target tenant ID (optional, null to clear tenant context) */
  tenantId?: string;
}

// ============================================================================
// RESPONSE MODELS
// ============================================================================

/**
 * Single application response
 */
model ApplicationResponse {
  data: Application;
  meta: ResponseMeta;
}

/**
 * Application list response
 */
model ApplicationListResponse {
  data: Application[];
  meta: ResponseMeta;
}

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
 * User effective permissions response
 */
model UserEffectivePermissionsResponse {
  data: UserEffectivePermissions;
  meta: ResponseMeta;
}

/**
 * User role assignment response
 */
model UserRoleAssignmentResponse {
  data: UserRoleAssignment;
  meta: ResponseMeta;
}

/**
 * User role assignments list response
 */
model UserRoleAssignmentListResponse {
  data: UserRoleAssignment[];
  meta: ResponseMeta;
}

/**
 * User available contexts response (all apps/tenants user belongs to)
 */
model UserContextListResponse {
  data: UserContext[];
  meta: ResponseMeta;
}

/**
 * Active context response
 */
model ActiveContextResponse {
  data: ActiveContext;
  meta: ResponseMeta;
}

/**
 * Context switch response
 */
model SwitchContextResponse {
  data: {
    /** New active application ID */
    applicationId: string;

    /** New active tenant ID (null if no tenant) */
    tenantId?: string;

    /** Tenant name (if tenant selected) */
    tenantName?: string;

    /** Roles in the new context */
    roles: string[];

    /** Effective permissions in the new context */
    permissions: Permission[];
  };

  meta: ResponseMeta;
}
