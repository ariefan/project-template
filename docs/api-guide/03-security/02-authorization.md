# Authorization

**Related**: [Authentication](./01-authentication.md) · [Multitenancy](../01-core-concepts/05-multitenancy.md) · [Audit Logging](../06-quality/01-audit-logging.md)

## Overview

Use **Multi-Application Role-Based Access Control (RBAC)** with:

- **Multiple applications** with isolated tenants, users, and roles
- **Global roles** (app-scoped, no tenant) and tenant-scoped roles
- **Multiple roles per user** with deny-override permission model
- **Dynamic conditions** (ownership, sharing) for fine-grained access

**Key principles:**

- Users can belong to **multiple applications**
- Each application has its **own tenants and roles**
- Global roles apply **across all tenants** within an application
- Permissions combine **allow/deny** with deny taking precedence
- All access is **denied by default**

## Multi-App RBAC Model

### Hierarchy

```
Application (app_default)
├── Global Roles (app-scoped, no tenant)
│   ├── super_user (full system access)
│   ├── app_admin (app-level management)
│   └── user (basic authenticated user)
│
├── Tenant A (org_abc)
│   ├── Tenant Roles
│   │   ├── owner (full control)
│   │   ├── admin (manage members/settings)
│   │   ├── member (create/edit own resources)
│   │   └── viewer (read-only)
│   └── Members
│       └── User + Roles[]
│
└── Tenant B (org_xyz)
    ├── Tenant Roles (can differ from Tenant A)
    └── Members
```

### User Context Example

```
User (usr_123)
├── Application: app_default
│   ├── Global Role: user
│   │   └── Permissions: basic:read
│   │
│   ├── Tenant A (org_abc)
│   │   ├── Tenant Role: admin
│   │   └── Permissions: users:*, settings:*, billing:*
│   │
│   └── Tenant B (org_xyz)
│       ├── Tenant Role: member
│       └── Permissions: documents:read, documents:create:owner
```

**Same user, different permissions per context:**
- Global: Basic read access
- Tenant A: Full admin access
- Tenant B: Member with ownership-based write access

## Permission Model

### Permission Structure

```typescript
interface Permission {
  resource: string;      // "documents", "users", "settings"
  action: string;        // "read", "create", "update", "delete", "manage"
  effect: "allow" | "deny";
  condition?: "owner" | "shared";  // Optional dynamic condition
}
```

### Actions

| Action | Description |
|--------|-------------|
| `read` | View resource |
| `create` | Create new resource |
| `update` | Modify existing resource |
| `delete` | Delete resource |
| `manage` | Full control (settings, permissions) |
| `*` | All actions (wildcard) |

### Effects

| Effect | Description |
|--------|-------------|
| `allow` | Grant access to the action |
| `deny` | Explicitly deny access (overrides allow) |

### Deny-Override Resolution

When a user has multiple roles, permissions are combined:

1. **Collect all permissions** from all roles (global + tenant)
2. **If ANY role denies** an action → **DENIED**
3. **If no deny and ANY role allows** → **ALLOWED**
4. **If no rules match** → **DENIED** (default deny)

```
Example: User has "admin" and "restricted_viewer" roles

admin role:
  - documents:* → allow

restricted_viewer role:
  - documents:delete → deny

Result:
  - documents:read → ALLOWED (admin allows, no deny)
  - documents:create → ALLOWED (admin allows, no deny)
  - documents:delete → DENIED (restricted_viewer denies, overrides admin's allow)
```

### Dynamic Conditions

Conditions enable context-aware access control:

| Condition | Description | Use Case |
|-----------|-------------|----------|
| `owner` | User must own the resource | Edit own posts, delete own comments |
| `shared` | Resource must be shared with user | View shared documents |

**Example permission with condition:**

```json
{
  "resource": "documents",
  "action": "update",
  "effect": "allow",
  "condition": "owner"
}
```

This allows: "User can update documents they own"

## Role Types

### Global Roles (App-scoped)

Global roles have `tenantId: null` and apply across all tenants within an application.

| Role | Description | Use Case |
|------|-------------|----------|
| `super_user` | Full system access | Platform administrators |
| `app_admin` | App-level management | Support staff, ops team |
| `user` | Basic authenticated user | Default role for all users |

**API endpoint:** `GET/POST /v1/roles`

### Tenant Roles (Org-scoped)

Tenant roles are scoped to a specific organization.

| Role | Description | Typical Permissions |
|------|-------------|---------------------|
| `owner` | Organization owner | `*:*` (full access) |
| `admin` | Organization admin | `users:*, settings:*, billing:*` |
| `member` | Standard member | `documents:*, projects:*` |
| `viewer` | Read-only access | `*:read` |

**API endpoint:** `GET/POST /v1/orgs/{orgId}/roles`

### System Roles

System roles (`isSystemRole: true`) have special protections:

- ❌ Cannot be deleted
- ❌ Cannot be renamed
- ✅ Permissions CAN be modified

This allows customization while preventing accidental removal.

## API Endpoints

### Global Roles

```http
# List global roles
GET /v1/roles

# Create global role
POST /v1/roles
{
  "name": "Support Staff",
  "description": "Customer support team",
  "permissions": [
    { "resource": "users", "action": "read", "effect": "allow" },
    { "resource": "tickets", "action": "*", "effect": "allow" }
  ]
}

# Get/Update/Delete role
GET /v1/roles/{roleId}
PATCH /v1/roles/{roleId}
DELETE /v1/roles/{roleId}
```

### Tenant Roles

```http
# List tenant roles
GET /v1/orgs/{orgId}/roles

# Create tenant role
POST /v1/orgs/{orgId}/roles
{
  "name": "Project Manager",
  "description": "Can manage projects and tasks",
  "permissions": [
    { "resource": "projects", "action": "*", "effect": "allow" },
    { "resource": "tasks", "action": "*", "effect": "allow" },
    { "resource": "settings", "action": "read", "effect": "allow" }
  ]
}
```

### User Role Assignment

```http
# List user's roles in tenant
GET /v1/orgs/{orgId}/users/{userId}/roles

# Assign role to user
POST /v1/orgs/{orgId}/users/{userId}/roles
{
  "roleId": "role_admin"
}

# Remove role from user
DELETE /v1/orgs/{orgId}/users/{userId}/roles/{roleId}
```

### Effective Permissions

```http
GET /v1/orgs/{orgId}/users/{userId}/permissions
```

**Response:**

```json
{
  "data": {
    "userId": "usr_123",
    "applicationId": "app_default",
    "tenantId": "org_abc",
    "globalRoles": [
      {
        "id": "role_user",
        "name": "user",
        "permissions": [
          { "resource": "basic", "action": "read", "effect": "allow" }
        ]
      }
    ],
    "tenantRoles": [
      {
        "id": "role_admin",
        "name": "admin",
        "permissions": [
          { "resource": "users", "action": "*", "effect": "allow" },
          { "resource": "settings", "action": "*", "effect": "allow" }
        ]
      }
    ],
    "effectivePermissions": [
      { "resource": "basic", "action": "read", "effect": "allow" },
      { "resource": "users", "action": "*", "effect": "allow" },
      { "resource": "settings", "action": "*", "effect": "allow" }
    ],
    "allowedActions": [
      "basic:read",
      "users:read",
      "users:create",
      "users:update",
      "users:delete",
      "settings:read",
      "settings:manage"
    ]
  }
}
```

## Context Management

### Active Context

Users can switch between applications and tenants. The active context is for **UI state management only**, not authorization decisions.

```http
# Get current context
GET /v1/users/me/context

# Response
{
  "data": {
    "userId": "usr_123",
    "activeApplicationId": "app_default",
    "activeTenantId": "org_abc",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### Switch Context

```http
POST /v1/users/me/switch-context
{
  "applicationId": "app_default",
  "tenantId": "org_xyz"
}
```

### Available Contexts

```http
GET /v1/users/me/available-contexts

# Response
{
  "data": [
    {
      "applicationId": "app_default",
      "applicationName": "My SaaS Platform",
      "tenantId": "org_abc",
      "tenantName": "Acme Corp",
      "roles": ["admin", "billing_manager"]
    },
    {
      "applicationId": "app_default",
      "applicationName": "My SaaS Platform",
      "tenantId": "org_xyz",
      "tenantName": "XYZ Inc",
      "roles": ["member"]
    }
  ]
}
```

## Authorization Middleware

### Permission Check

```typescript
interface AuthContext {
  userId: string;
  applicationId: string;
  tenantId: string;
}

function requirePermission(resource: string, action: string) {
  return async (req, res, next) => {
    const { userId, applicationId, tenantId } = req.authContext;

    // Check with authorization engine
    const allowed = await authz.enforce(
      userId,
      applicationId,
      tenantId,
      resource,
      action
    );

    if (!allowed) {
      return res.status(403).json({
        error: {
          code: "forbidden",
          message: "Permission denied",
          details: [
            {
              code: "insufficientPermissions",
              message: `Required: ${resource}:${action}`,
            },
          ],
        },
      });
    }

    next();
  };
}
```

### Ownership Check

For permissions with `condition: "owner"`:

```typescript
function requireOwnership(resource: string, action: string) {
  return async (req, res, next) => {
    const { userId, applicationId, tenantId } = req.authContext;
    const resourceId = req.params.id;

    // Get resource owner
    const resourceData = await getResource(resourceId);
    const ownerId = resourceData.createdBy;

    // Check with ownership context
    const allowed = await authz.enforceWithContext(
      userId,
      applicationId,
      tenantId,
      resource,
      action,
      { ownerId }
    );

    if (!allowed) {
      return res.status(403).json({
        error: {
          code: "forbidden",
          message: "You can only modify your own resources",
        },
      });
    }

    next();
  };
}
```

### Usage in Routes

```typescript
// Simple permission check
app.get(
  "/v1/orgs/:orgId/users",
  authenticate,
  requirePermission("users", "read"),
  listUsers
);

// Ownership-based permission
app.patch(
  "/v1/orgs/:orgId/documents/:id",
  authenticate,
  requireOwnership("documents", "update"),
  updateDocument
);

// Multiple permissions (AND)
app.delete(
  "/v1/orgs/:orgId/settings",
  authenticate,
  requirePermission("settings", "manage"),
  deleteSettings
);
```

## Error Responses

### Insufficient Permissions

```json
{
  "error": {
    "code": "forbidden",
    "message": "Permission denied",
    "details": [
      {
        "code": "insufficientPermissions",
        "message": "This action requires 'users:delete' permission",
        "metadata": {
          "requiredPermission": "users:delete"
        }
      }
    ]
  }
}
```

### Ownership Required

```json
{
  "error": {
    "code": "forbidden",
    "message": "You can only modify your own resources",
    "details": [
      {
        "code": "ownershipRequired",
        "message": "This action requires ownership of the resource",
        "metadata": {
          "resourceId": "doc_123",
          "ownerId": "usr_456"
        }
      }
    ]
  }
}
```

### Not a Member

```json
{
  "error": {
    "code": "forbidden",
    "message": "Not a member of this organization",
    "details": [
      {
        "code": "notAMember",
        "message": "User is not a member of org_xyz",
        "metadata": {
          "tenantId": "org_xyz"
        }
      }
    ]
  }
}
```

## Best Practices

### 1. Principle of Least Privilege

- Grant minimum permissions needed
- Use specific permissions over wildcards
- Review permissions regularly
- Use `deny` rules to restrict inherited access

### 2. Role Design

- Create meaningful role names
- Group related permissions into roles
- Document role purposes
- Use tenant roles for org-specific needs
- Use global roles sparingly (admin, support)

### 3. Deny-Override Strategy

Use explicit deny rules for:

- Preventing accidental escalation
- Restricting sensitive operations
- Compliance requirements

```json
{
  "name": "restricted_member",
  "permissions": [
    { "resource": "documents", "action": "*", "effect": "allow" },
    { "resource": "documents", "action": "delete", "effect": "deny" }
  ]
}
```

### 4. Ownership Conditions

Use ownership conditions for:

- User-generated content (posts, comments)
- Personal resources (profiles, settings)
- Draft/unpublished content

```json
{
  "name": "author",
  "permissions": [
    { "resource": "posts", "action": "read", "effect": "allow" },
    { "resource": "posts", "action": "update", "effect": "allow", "condition": "owner" },
    { "resource": "posts", "action": "delete", "effect": "allow", "condition": "owner" }
  ]
}
```

### 5. Audit Everything

- Log role assignments
- Log permission checks (especially denials)
- Log context switches
- Track who granted permissions

## See Also

- [Authentication](./01-authentication.md) - Token-based authentication
- [Multitenancy](../01-core-concepts/05-multitenancy.md) - Tenant isolation patterns
- [Audit Logging](../06-quality/01-audit-logging.md) - Track authorization events
- [Security Best Practices](./04-security-best-practices.md) - Security guidelines
