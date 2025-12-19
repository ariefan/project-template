# Authorization

**Related**: [Authentication](./01-authentication.md) · [Multitenancy](../01-core-concepts/05-multitenancy.md) · [Audit Logging](../06-quality/01-audit-logging.md)

## Overview

Use **Role-Based Access Control (RBAC)** with **tenant-scoped permissions**.

**Key principles:**
- Users can belong to **multiple tenants**
- Each tenant can assign **different roles** to the same user
- Permissions are **tenant-scoped** (isolated per organization)
- Permission checks require **both user identity and tenant context**

## Multi-Tenant RBAC Model

### User → Tenants → Roles

```
User (usr_123)
├─ Tenant A (org_abc)
│  ├─ Role: admin
│  └─ Permissions: users:*, invoices:*, settings:*
│
├─ Tenant B (org_xyz)
│  ├─ Role: member
│  └─ Permissions: users:read, invoices:read
│
└─ Tenant C (org_def)
   ├─ Roles: billing_manager, viewer
   └─ Permissions: invoices:*, reports:read
```

**Same user, different roles per tenant:**
- In Tenant A: Full admin access
- In Tenant B: Read-only member
- In Tenant C: Billing manager + viewer

## Permission Format

**Pattern:** `{resource}:{action}`

**Actions:**
- `read` - View resource
- `write` - Create and update resource
- `delete` - Delete resource
- `admin` - Full control (create, read, update, delete)
- `*` - All actions (wildcard)

**Examples:**
```
users:read              Read user list
users:write             Create/update users
users:delete            Delete users
users:*                 All user operations

invoices:read           View invoices
invoices:write          Create/edit invoices
invoices:admin          Full invoice control

settings:admin          Manage org settings
billing:*               All billing operations
```

## Token Claims

Access tokens include tenant-scoped permissions:

```json
{
  "sub": "usr_123",
  "email": "user@example.com",
  "tenantId": "org_abc",
  "roles": ["admin", "billing_manager"],
  "permissions": [
    "users:read",
    "users:write",
    "users:delete",
    "invoices:read",
    "invoices:write",
    "settings:admin"
  ]
}
```

**Note:** `tenantId` and permissions are specific to the current active tenant.

## User Permissions Model

### Database Schema

```typescript
interface UserTenantRole {
  userId: string;         // usr_123
  tenantId: string;       // org_abc
  roleId: string;         // role_admin
  createdAt: Date;
  createdBy: string;
}

interface Role {
  id: string;              // role_admin
  name: string;            // "Admin"
  permissions: string[];   // ["users:*", "invoices:*"]
  tenantId: string;        // org_abc (tenant-scoped)
  isSystemRole: boolean;   // true for predefined roles
}

interface Permission {
  resource: string;        // "users"
  action: string;          // "read" | "write" | "delete" | "admin" | "*"
}
```

### User Permissions Response

```http
GET /v1/orgs/{orgId}/users/usr_123/permissions HTTP/1.1
```

**Response:**
```json
{
  "data": {
    "userId": "usr_123",
    "tenantId": "org_abc",
    "roles": [
      {
        "id": "role_admin",
        "name": "Admin",
        "permissions": ["users:*", "invoices:*", "settings:*"]
      },
      {
        "id": "role_billing",
        "name": "Billing Manager",
        "permissions": ["invoices:*", "payments:*"]
      }
    ],
    "effectivePermissions": [
      "users:read",
      "users:write",
      "users:delete",
      "invoices:read",
      "invoices:write",
      "invoices:delete",
      "payments:read",
      "payments:write",
      "payments:delete",
      "settings:admin"
    ]
  }
}
```

## Predefined Roles

### System Roles (Recommended)

| Role | Permissions | Use Case |
|------|-------------|----------|
| **owner** | `*:*` | Tenant owner, full access |
| **admin** | `users:*, settings:*, billing:*` | Organization administrator |
| **member** | `users:read, projects:*, tasks:*` | Standard team member |
| **billing_manager** | `invoices:*, payments:*, subscriptions:*` | Financial operations |
| **viewer** | `*:read` | Read-only access |

### Custom Roles

Tenants can create custom roles:

```http
POST /v1/orgs/{orgId}/roles HTTP/1.1
Content-Type: application/json

{
  "name": "Customer Support",
  "permissions": [
    "users:read",
    "tickets:*",
    "customers:read",
    "customers:write"
  ]
}
```

**Response:**
```json
{
  "data": {
    "id": "role_cs_abc",
    "tenantId": "org_abc",
    "name": "Customer Support",
    "permissions": [
      "users:read",
      "tickets:*",
      "customers:read",
      "customers:write"
    ],
    "isSystemRole": false,
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

## Role Management

### Assign Role to User

```http
POST /v1/orgs/{orgId}/users/usr_456/roles HTTP/1.1
Content-Type: application/json

{
  "roleId": "role_admin"
}
```

**Response:**
```json
{
  "data": {
    "userId": "usr_456",
    "tenantId": "org_abc",
    "roleId": "role_admin",
    "assignedAt": "2024-01-15T10:30:00Z",
    "assignedBy": "usr_123"
  }
}
```

### Remove Role from User

```http
DELETE /v1/orgs/{orgId}/users/usr_456/roles/role_admin HTTP/1.1
```

**Response:**
```http
HTTP/1.1 204 No Content
```

### List User Roles (All Tenants)

```http
GET /v1/users/usr_123/tenant-roles HTTP/1.1
```

**Response:**
```json
{
  "data": [
    {
      "tenantId": "org_abc",
      "tenantName": "Acme Corp",
      "roles": ["admin", "billing_manager"]
    },
    {
      "tenantId": "org_xyz",
      "tenantName": "XYZ Inc",
      "roles": ["member"]
    },
    {
      "tenantId": "org_def",
      "tenantName": "DEF LLC",
      "roles": ["viewer"]
    }
  ]
}
```

## Permission Checking

### Authorization Middleware

```typescript
interface AuthContext {
  userId: string;
  tenantId: string;
  permissions: string[];
}

function requirePermission(...requiredPerms: string[]) {
  return (req, res, next) => {
    const user: AuthContext = req.user;

    // Verify tenant context matches URL
    if (req.params.orgId !== user.tenantId) {
      return res.status(403).json({
        error: {
          code: 'forbidden',
          message: 'Access denied to this tenant',
        },
      });
    }

    // Check if user has ALL required permissions
    const hasPermission = requiredPerms.every((required) =>
      user.permissions.some((perm) => matchesPermission(perm, required))
    );

    if (!hasPermission) {
      return res.status(403).json({
        error: {
          code: 'forbidden',
          message: 'Insufficient permissions',
          details: [
            {
              code: 'insufficientPermissions',
              message: `Required: ${requiredPerms.join(', ')}`,
              metadata: {
                requiredPermissions: requiredPerms,
                userPermissions: user.permissions,
              },
            },
          ],
        },
      });
    }

    next();
  };
}

// Permission matching with wildcards
function matchesPermission(userPerm: string, requiredPerm: string): boolean {
  const [userResource, userAction] = userPerm.split(':');
  const [reqResource, reqAction] = requiredPerm.split(':');

  // Exact match
  if (userPerm === requiredPerm) return true;

  // Wildcard resource
  if (userResource === '*' && userAction === '*') return true;

  // Wildcard action for matching resource
  if (userResource === reqResource && userAction === '*') return true;

  // Wildcard resource for matching action
  if (userResource === '*' && userAction === reqAction) return true;

  return false;
}
```

### Usage in Routes

```typescript
// Single permission
app.get(
  '/v1/orgs/:orgId/users',
  authenticate,
  requirePermission('users:read'),
  listUsers
);

// Multiple permissions (AND)
app.post(
  '/v1/orgs/:orgId/users',
  authenticate,
  requirePermission('users:write'),
  createUser
);

// Admin-only
app.delete(
  '/v1/orgs/:orgId/settings',
  authenticate,
  requirePermission('settings:admin'),
  deleteSettings
);
```

## Forbidden Responses

### Missing Permission

```json
{
  "error": {
    "code": "forbidden",
    "message": "Permission denied",
    "details": [
      {
        "code": "insufficientPermissions",
        "message": "This action requires 'users:write' permission",
        "metadata": {
          "requiredPermission": "users:write",
          "userPermissions": ["users:read", "invoices:read"]
        }
      }
    ]
  }
}
```

### Wrong Tenant

```json
{
  "error": {
    "code": "forbidden",
    "message": "Access denied to this tenant",
    "details": [
      {
        "code": "tenantMismatch",
        "message": "You do not have access to org_xyz",
        "metadata": {
          "requestedTenant": "org_xyz",
          "userTenant": "org_abc"
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

## Tenant Switching

Users with access to multiple tenants can switch active tenant:

```http
POST /v1/users/usr_123/switch-tenant HTTP/1.1
Content-Type: application/json

{
  "tenantId": "org_xyz"
}
```

**Response:**
```json
{
  "data": {
    "tenantId": "org_xyz",
    "tenantName": "XYZ Inc",
    "roles": ["member"],
    "permissions": ["users:read", "projects:*"],
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**New token includes:**
- Updated `tenantId`
- Roles for the new tenant
- Permissions for the new tenant

**Security:**
- Verify user is a member of target tenant
- Invalidate old session token
- Log tenant switch in audit log
- Consider requiring MFA for sensitive tenants

## Permission Inheritance

### Role Hierarchy (Optional)

```
owner (inherits all below)
  └─ admin
      └─ manager
          └─ member
              └─ viewer
```

**Example:**
- Owner inherits admin, manager, member, viewer permissions
- Admin inherits manager, member, viewer permissions
- Member inherits viewer permissions

### Implementation

```typescript
const roleHierarchy = {
  owner: ['admin', 'manager', 'member', 'viewer'],
  admin: ['manager', 'member', 'viewer'],
  manager: ['member', 'viewer'],
  member: ['viewer'],
  viewer: [],
};

function getEffectivePermissions(userRoles: string[], allRoles: Role[]) {
  const effectiveRoles = new Set<string>();

  // Add user's direct roles
  userRoles.forEach((role) => effectiveRoles.add(role));

  // Add inherited roles
  userRoles.forEach((role) => {
    roleHierarchy[role]?.forEach((inheritedRole) =>
      effectiveRoles.add(inheritedRole)
    );
  });

  // Collect all permissions
  const permissions = new Set<string>();
  effectiveRoles.forEach((roleName) => {
    const role = allRoles.find((r) => r.name === roleName);
    role?.permissions.forEach((perm) => permissions.add(perm));
  });

  return Array.from(permissions);
}
```

## Best Practices

1. **Principle of Least Privilege**
   - Grant minimum permissions needed
   - Use specific permissions over wildcards
   - Review permissions regularly

2. **Tenant Isolation**
   - Always validate tenantId from token matches URL
   - Never allow cross-tenant data access
   - Audit cross-tenant operations

3. **Role Design**
   - Create meaningful role names
   - Group related permissions into roles
   - Document role purposes

4. **Permission Granularity**
   - Use resource:action format consistently
   - Avoid overly broad wildcards (`*:*`)
   - Create specific actions when needed

5. **Audit Everything**
   - Log role assignments
   - Log permission checks
   - Log tenant switches
   - Track who granted permissions

## See Also

- [Authentication](./01-authentication.md) - Token-based authentication
- [Multitenancy](../01-core-concepts/05-multitenancy.md) - Tenant isolation patterns
- [Audit Logging](../06-quality/01-audit-logging.md) - Track authorization events
- [Security Best Practices](./04-security-best-practices.md) - Security guidelines
