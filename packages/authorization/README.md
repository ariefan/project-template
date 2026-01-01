# @workspace/authorization

**Casbin-based RBAC with multi-app multi-tenant support, deny-override, and dynamic conditions**

This package provides a powerful authorization system built on [Casbin](https://casbin.org/) with support for multi-tenancy, dynamic conditions, and comprehensive audit logging.

## Architecture

**Key Design Principle:** DB owns user→role mapping, Casbin owns role→permission evaluation.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Authorization Flow                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Request: authorize(userId, orgId, resource, action)             │
│                              │                                       │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  2. DB Lookup: user_role_assignments                           │ │
│  │     SELECT role_name FROM user_role_assignments                │ │
│  │     WHERE user_id = ? AND app_id = ? AND tenant_id = ?         │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                       │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  3. Casbin: role→permission evaluation                         │ │
│  │     enforce(userId, role, appId, tenantId, resource, action)   │ │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐   │ │
│  │  │ Policy     │  │ Role       │  │ Condition Functions    │   │ │
│  │  │ Matching   │──│ Inheritance│──│ isOwner()              │   │ │
│  │  └────────────┘  └────────────┘  └────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                       │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  4. Effect: allow | deny (deny-override)                       │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

Data Stores:
┌─────────────────────────────┐    ┌─────────────────────────────┐
│   user_role_assignments     │    │      casbin_rules           │
│   (user→role mapping)       │    │   (role→permission rules)   │
│   - userId                  │    │   - p: role,app,tenant,     │
│   - roleId                  │    │        resource,action,eft  │
│   - applicationId           │    │   - g: role inheritance     │
│   - tenantId                │    │        (optional)           │
└─────────────────────────────┘    └─────────────────────────────┘
```

## Exports

```typescript
// Main factory function
export { createAuthorization } from "@workspace/authorization";

// Default instance
export { authorization } from "@workspace/authorization";

// Types
export type { Authorization, AuthorizationConfig } from "@workspace/authorization";
export { RESOURCES, ACTIONS, ROLES } from "@workspace/authorization";
export type { Resource, Action, Role, AuthorizationResult } from "@workspace/authorization";

// Services
export { RoleService, UserRoleService } from "@workspace/authorization";
export { AuthorizationAuditService } from "@workspace/authorization";
export { ViolationManager, createViolationManager } from "@workspace/authorization";

// Adapter
export { CasbinDrizzleAdapter } from "@workspace/authorization";

// Condition functions
export { isOwner, isShared } from "@workspace/authorization";
```

## Usage

### Basic Authorization Check

```typescript
import { authorization } from "@workspace/authorization";

// Check if user can read posts in an organization
const allowed = await authorization.enforce(
  "user_123",      // subject (user ID)
  "api",           // app (which application)
  "org_456",       // tenant (organization ID)
  "posts",         // resource
  "read",          // action
  ""               // resourceOwnerId (for owner checks)
);

if (!allowed) {
  throw new ForbiddenError("Access denied");
}
```

### With Resource Owner Check

```typescript
// Check if user can update their own post
const allowed = await authorization.enforce(
  "user_123",      // subject
  "api",           // app
  "org_456",       // tenant
  "posts",         // resource
  "update",        // action
  "user_123"       // resourceOwnerId (post author)
);
```

### Role Management

```typescript
import { RoleService, UserRoleService } from "@workspace/authorization";

// Create services
const roleService = new RoleService(enforcer);
const userRoleService = new UserRoleService(db); // Only needs DB, not enforcer

// Create a custom role with permissions
await roleService.createRole({
  name: "editor",
  appId: "api",
  tenantId: "org_456",
  permissions: [
    { resource: "posts", action: "read", effect: "allow" },
    { resource: "posts", action: "create", effect: "allow" },
    { resource: "posts", action: "update", effect: "allow", condition: "isOwner" },
    { resource: "posts", action: "delete", effect: "deny" },
  ],
});

// Assign role to user (writes to user_role_assignments table)
await userRoleService.assignRole({
  userId: "user_123",
  roleId: "role_editor_id", // Role ID from roles table
  applicationId: "api",
  tenantId: "org_456",
});
```

## Policy Model

The authorization model uses a 7-tuple request format (role is resolved from DB):

```
Request:  (sub, role, app, tenant, obj, act, resourceOwnerId)
          └─ role is looked up from user_role_assignments table

Policy:   (role, app, tenant, obj, act, eft, condition)
          └─ Defines what each role can do

Grouping: (child_role, parent_role)
          └─ Optional role inheritance (e.g., admin inherits member permissions)
```

### Effect Evaluation (Deny-Override)

```
1. If ANY policy matches with eft=deny → DENY
2. If ANY policy matches with eft=allow → ALLOW
3. Otherwise → DENY (default deny)
```

### Built-in Conditions

| Condition | Description |
|-----------|-------------|
| `isOwner` | True if `resourceOwnerId == subject` |
| `isShared` | True if resource is shared with subject |

## Audit Logging

```typescript
import { AuthorizationAuditService } from "@workspace/authorization";

const auditService = new AuthorizationAuditService(db);

// Log authorization check
await auditService.log({
  userId: "user_123",
  action: "update",
  resource: "posts",
  resourceId: "post_789",
  allowed: true,
  context: { ip: "192.168.1.1" },
});

// Query audit logs
const logs = await auditService.query({
  userId: "user_123",
  startDate: new Date("2024-01-01"),
});
```

## Violation Tracking

```typescript
import { createViolationManager } from "@workspace/authorization";

const violations = createViolationManager(db);

// Record a violation
await violations.record({
  userId: "user_123",
  resource: "settings",
  action: "delete",
  severity: "high",
});

// Check violation count
const count = await violations.getCount("user_123", { severity: "high" });
```

## Constants

```typescript
// Default resources
const RESOURCES = {
  POSTS: "posts",
  COMMENTS: "comments",
  USERS: "users",
  SETTINGS: "settings",
  INVITATIONS: "invitations",
};

// Default actions
const ACTIONS = {
  READ: "read",
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  MANAGE: "manage",
};

// Default roles
const ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  MEMBER: "member",
  VIEWER: "viewer",
};
```

## Dependencies

- `casbin` - Authorization library
- `@workspace/db` - Database (Drizzle adapter)
- `@workspace/cache` - Policy caching (optional)

## Related Packages

- `@workspace/cache` - Policy caching

## Testing

```bash
pnpm test
```

The package includes comprehensive tests for:
- Drizzle adapter persistence
- Audit service logging
- Violation tracking
- Role/permission management
