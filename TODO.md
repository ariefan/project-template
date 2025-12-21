# Implementation Status

This table tracks the implementation status of features documented in `docs/api-guide` across `packages/contracts` (TypeSpec) and `apps/api` (Fastify).

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Fully implemented |
| 🟡 | Partially implemented |
| ❌ | Not implemented |
| ➖ | Not applicable |
| 📋 | Contracts only (no API implementation) |

---

## 1. Core Concepts

| Feature | API Guide | Contracts | API | Notes |
|---------|-----------|-----------|-----|-------|
| Naming Conventions | ✅ | ✅ | ✅ | camelCase, resource naming |
| HTTP Methods (CRUD) | ✅ | ✅ | ✅ | ExamplePosts, ExampleComments |
| Request/Response Format | ✅ | ✅ | ✅ | `{ data, pagination?, meta }` envelope |
| Versioning | ✅ | ✅ | ✅ | `/v1/orgs/{orgId}/...` |
| Multitenancy | ✅ | ✅ | ✅ | `orgId` in all routes |

## 2. Data Operations

| Feature | API Guide | Contracts | API | Notes |
|---------|-----------|-----------|-----|-------|
| Page-based Pagination | ✅ | ✅ | ✅ | `page`, `pageSize`, `totalCount` |
| Cursor-based Pagination | ✅ | ❌ | ❌ | Not needed for current resources |
| Filtering (equality) | ✅ | ✅ | ✅ | `status`, `authorId` |
| Filtering (operators) | ✅ | ✅ | ✅ | `statusNe`, `statusIn`, `titleContains` |
| Search | ✅ | ✅ | ✅ | `search` param on list endpoints |
| Date Range Filters | ✅ | ✅ | ✅ | `createdAfter`, `createdBefore` |
| Sorting | ✅ | ✅ | ✅ | `orderBy=-createdAt,title` |
| Field Selection | ✅ | 🟡 | ❌ | Contracts have `fields` param, API ignores it |

## 3. Security

| Feature | API Guide | Contracts | API | Notes |
|---------|-----------|-----------|-----|-------|
| Authentication | ✅ | 📋 | ✅ | `packages/auth` with better-auth |
| Authorization (RBAC) | ✅ | 📋 | ❌ | Contracts: Roles model; Plan: Casbin |
| Rate Limiting | ✅ | ❌ | ❌ | |
| CORS | ✅ | ➖ | ✅ | Configured in app.ts |
| Security Headers | ✅ | ➖ | 🟡 | Basic headers only |

## 4. Error Handling

| Feature | API Guide | Contracts | API | Notes |
|---------|-----------|-----------|-----|-------|
| Error Structure | ✅ | ✅ | ✅ | `{ error: { code, message, details } }` |
| Error Codes | ✅ | ✅ | ✅ | `notFound`, `validationError`, etc. |
| Validation | ✅ | ✅ | ✅ | Zod schemas from contracts |
| Request ID | ✅ | ✅ | ✅ | `meta.requestId` in responses |

## 5. Advanced Operations

| Feature | API Guide | Contracts | API | Notes |
|---------|-----------|-----------|-----|-------|
| Batch Create | ✅ | ✅ | ✅ | `POST /batch` with atomic option |
| Batch Update | ✅ | ✅ | ✅ | `PATCH /batch` with atomic option |
| Batch Soft Delete | ✅ | ✅ | ✅ | `POST /batch/soft-delete` |
| Batch Restore | ✅ | ❌ | ❌ | |
| Soft Delete | ✅ | ✅ | ✅ | 200 + metadata |
| Hard Delete | ✅ | ✅ | ✅ | 204 No Content |
| Restore | ✅ | ✅ | ✅ | `POST /{id}/restore` |
| List Deleted | ✅ | ❌ | ❌ | `GET /deleted` endpoint |
| Async Operations | ✅ | 📋 | ❌ | Contracts: Jobs model |
| File Handling | ✅ | 📋 | ❌ | Contracts: Files model |

## 6. Quality & Reliability

| Feature | API Guide | Contracts | API | Notes |
|---------|-----------|-----------|-----|-------|
| Audit Logging | ✅ | 📋 | ❌ | Contracts: AuditLog model |
| Idempotency | ✅ | ❌ | ❌ | Idempotency-Key header |
| Caching | ✅ | ➖ | ❌ | Cache headers |
| Monitoring | ✅ | ➖ | ❌ | Metrics, tracing |
| Performance | ✅ | ➖ | ➖ | Guidelines only |

## 7. Integrations

| Feature | API Guide | Contracts | API | Notes |
|---------|-----------|-----------|-----|-------|
| Webhooks | ✅ | 📋 | ❌ | Contracts: Webhook model |
| Client SDKs | ✅ | ✅ | ➖ | Auto-generated via @hey-api/openapi-ts |

## 8. Governance

| Feature | API Guide | Contracts | API | Notes |
|---------|-----------|-----------|-----|-------|
| OpenAPI Docs | ✅ | ✅ | ✅ | TypeSpec → OpenAPI → Scalar UI |
| Testing | ✅ | ❌ | ❌ | |
| Deprecation | ✅ | ❌ | ❌ | Sunset headers, warnings |
| Migration | ✅ | ❌ | ❌ | |

---

## Resources Status

| Resource | Model | Routes | DB Schema | Repository | Service | API Routes |
|----------|-------|--------|-----------|------------|---------|------------|
| ExamplePost | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ExampleComment | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| User | ✅ | 📋 | ✅ | ❌ | ❌ | 🟡 | better-auth handles /auth/* routes |
| Session | ➖ | ➖ | ✅ | ➖ | ➖ | 🟡 | better-auth managed |
| Account | ➖ | ➖ | ✅ | ➖ | ➖ | 🟡 | better-auth managed |
| Organization | ✅ | 📋 | ✅ | ❌ | ❌ | 🟡 | better-auth org plugin |
| Role | ✅ | 📋 | ❌ | ❌ | ❌ | ❌ | Casbin for RBAC |
| ApiKey | ✅ | 📋 | ✅ | ❌ | ❌ | 🟡 | better-auth apiKey plugin |
| Notification | ➖ | ➖ | ✅ | ✅ | ✅ | ❌ | `packages/notifications` |
| File | ✅ | 📋 | ❌ | ❌ | ❌ | ❌ |
| Job | ✅ | 📋 | ❌ | ❌ | ❌ | ❌ |
| Webhook | ✅ | 📋 | ❌ | ❌ | ❌ | ❌ |
| AuditLog | ✅ | 📋 | ❌ | ❌ | ❌ | ❌ |

---

## Priority Backlog

### Completed
- [x] Authentication (better-auth integration) - `packages/auth`
- [x] Notifications system - `packages/notifications`
- [x] Database schema for auth tables - CLI-generated `packages/db/src/schema/auth.ts`

### High Priority
- [ ] Authorization (Casbin integration) - see Casbin Plan below
- [ ] Rate limiting
- [ ] Field selection implementation in API

### Medium Priority
- [ ] Batch restore endpoint
- [ ] List deleted resources endpoint
- [ ] Audit logging
- [ ] Idempotency keys

### Low Priority
- [ ] Async operations (Jobs)
- [ ] File handling
- [ ] Webhooks
- [ ] Caching headers
- [ ] Cursor-based pagination

### Future (after Casbin)
- [ ] User routes implementation
- [ ] Role routes implementation
- [ ] API key routes implementation

---

## Casbin Implementation Plan

### Overview

Integrate [Casbin](https://casbin.org/) for fine-grained authorization using RBAC with resource-level permissions. Casbin will work alongside better-auth (authentication) to provide complete access control.

### Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│   better-auth   │────▶│    Casbin    │────▶│  API Route  │
│ (who you are)   │     │ (what you    │     │  (action)   │
│                 │     │  can do)     │     │             │
└─────────────────┘     └──────────────┘     └─────────────┘
```

### Model: RBAC with Domains (Organizations)

```ini
# packages/authorization/src/model.conf
[request_definition]
r = sub, dom, obj, act

[policy_definition]
p = sub, dom, obj, act

[role_definition]
g = _, _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub, r.dom) && r.dom == p.dom && r.obj == p.obj && r.act == p.act
```

- `sub` = user ID or role
- `dom` = organization ID (multitenancy)
- `obj` = resource (posts, comments, users, etc.)
- `act` = action (read, create, update, delete, manage)

### Package Structure

```
packages/authorization/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # Main exports
│   ├── config.ts             # Model configuration
│   ├── enforcer.ts           # Casbin enforcer factory
│   ├── adapter.ts            # Drizzle adapter for policy storage
│   ├── middleware.ts         # Fastify middleware
│   ├── types.ts              # TypeScript types
│   └── policies/
│       ├── index.ts          # Policy management
│       └── defaults.ts       # Default role policies
```

### Database Schema

```typescript
// packages/db/src/schema/authorization.ts

export const casbinRules = pgTable("casbin_rules", {
  id: serial("id").primaryKey(),
  ptype: text("ptype").notNull(),  // "p" or "g"
  v0: text("v0"),                   // sub
  v1: text("v1"),                   // dom
  v2: text("v2"),                   // obj
  v3: text("v3"),                   // act
  v4: text("v4"),
  v5: text("v5"),
}, (table) => [
  index("casbin_rules_ptype_idx").on(table.ptype),
  index("casbin_rules_v0_idx").on(table.v0),
  index("casbin_rules_v1_idx").on(table.v1),
]);
```

### Default Roles & Policies

| Role | Permissions |
|------|-------------|
| `owner` | Full access to all resources in org |
| `admin` | Manage users, roles, settings; CRUD all resources |
| `member` | CRUD own resources, read shared resources |
| `viewer` | Read-only access |

### API Integration

```typescript
// apps/api/src/plugins/authorization.ts
import { createEnforcer } from "@workspace/authorization";

export const authorizationPlugin = fp(async (fastify) => {
  const enforcer = await createEnforcer(fastify.db);

  fastify.decorate("authorize", async (userId, orgId, resource, action) => {
    return enforcer.enforce(userId, orgId, resource, action);
  });
});

// Usage in routes
fastify.get("/posts", async (req, reply) => {
  const allowed = await fastify.authorize(req.user.id, req.params.orgId, "posts", "read");
  if (!allowed) throw new ForbiddenError();
  // ...
});
```

### Implementation Steps

1. **Create package** - `packages/authorization/`
2. **Add dependencies** - `casbin`, `casbin-pg-adapter` or custom Drizzle adapter
3. **Define model** - RBAC with domains for multitenancy
4. **Create DB schema** - `casbin_rules` table
5. **Build enforcer factory** - Initialize with Drizzle adapter
6. **Create Fastify plugin** - Middleware for route protection
7. **Add default policies** - Owner, admin, member, viewer roles
8. **Integrate with better-auth** - Sync roles on user/org changes
9. **Add policy management API** - CRUD for roles and permissions

### Dependencies

```json
{
  "dependencies": {
    "casbin": "^5.30.0",
    "@workspace/db": "workspace:*"
  }
}
```

### Key Files

| Component | File |
|-----------|------|
| Model Config | `packages/authorization/src/model.conf` |
| Enforcer | `packages/authorization/src/enforcer.ts` |
| Drizzle Adapter | `packages/authorization/src/adapter.ts` |
| Fastify Plugin | `apps/api/src/plugins/authorization.ts` |
| DB Schema | `packages/db/src/schema/authorization.ts` |

### Integration with better-auth

- better-auth handles: login, session, user identity
- Casbin handles: "can user X do action Y on resource Z in org O?"
- On org member creation → add role policy
- On org member removal → remove role policy
- On role change → update policy
