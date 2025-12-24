# Implementation Status

This table tracks the implementation status of features documented in `docs/api-guide` across `packages/contracts` (TypeSpec) and `apps/api` (Fastify).

## Current Project State

**✅ Implementation Complete:**
- Multi-App RBAC authorization system with Casbin
- Authentication via better-auth
- Notifications system with email/SMS/push support
- Caching layer (memory + Redis)
- Metrics/monitoring for authorization
- TypeSpec contracts with auto-generated SDK
- Comprehensive API documentation
- **Rate limiting** with tier-based limits (Free/Basic/Pro/Enterprise)
- **Security headers** via @fastify/helmet
- **Field selection** (sparse fieldsets) for bandwidth optimization
- **Cursor-based pagination** for large datasets
- **Idempotency keys** middleware for POST/PATCH operations
- **Batch restore** and **list deleted** endpoints
- **Async Operations (Jobs)** - Background job management with status polling
- **File Handling** - Secure file uploads with presigned URLs and MIME validation

**⚠️ Pending Setup:**
- PostgreSQL database needs to be started
- Database migrations need to be run
- Default application (`app_default`) needs to be seeded
- Environment variables need to be configured (`.env` file)

**📝 In Progress:**
- Testing infrastructure (Vitest configs added, tests being written)

See [Immediate Next Steps](#immediate-next-steps) below for setup instructions.

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
| Multitenancy | ✅ | ✅ | ✅ | Multi-app architecture with `applicationId` + `tenantId` |

## 2. Data Operations

| Feature | API Guide | Contracts | API | Notes |
|---------|-----------|-----------|-----|-------|
| Page-based Pagination | ✅ | ✅ | ✅ | `page`, `pageSize`, `totalCount` |
| Cursor-based Pagination | ✅ | ✅ | ✅ | `GET /cursor` with `cursor`, `limit`, `nextCursor` |
| Filtering (equality) | ✅ | ✅ | ✅ | `status`, `authorId` |
| Filtering (operators) | ✅ | ✅ | ✅ | `statusNe`, `statusIn`, `titleContains` |
| Search | ✅ | ✅ | ✅ | `search` param on list endpoints |
| Date Range Filters | ✅ | ✅ | ✅ | `createdAfter`, `createdBefore` |
| Sorting | ✅ | ✅ | ✅ | `orderBy=-createdAt,title` |
| Field Selection | ✅ | ✅ | ✅ | `fields=id,title,status` for sparse fieldsets |

## 3. Security

| Feature | API Guide | Contracts | API | Notes |
|---------|-----------|-----------|-----|-------|
| Authentication | ✅ | 📋 | ✅ | `packages/auth` with better-auth |
| Authorization (RBAC) | ✅ | ✅ | ✅ | Multi-app RBAC with deny-override, conditions |
| Global Roles | ✅ | ✅ | ✅ | App-scoped roles (no tenant) |
| Tenant Roles | ✅ | ✅ | ✅ | Org-scoped roles |
| Context Switching | ✅ | ✅ | ✅ | `/users/me/context`, `/users/me/switch-context` |
| Rate Limiting | ✅ | ➖ | ✅ | Tier-based (Free/Basic/Pro/Enterprise) with Redis |
| CORS | ✅ | ➖ | ✅ | Configured in app.ts |
| Security Headers | ✅ | ➖ | ✅ | @fastify/helmet with CSP, HSTS, etc. |

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
| Batch Restore | ✅ | ✅ | ✅ | `POST /batch/restore` |
| Soft Delete | ✅ | ✅ | ✅ | 200 + metadata |
| Hard Delete | ✅ | ✅ | ✅ | 204 No Content |
| Restore | ✅ | ✅ | ✅ | `POST /{id}/restore` |
| List Deleted | ✅ | ✅ | ✅ | `GET /deleted` with pagination |
| Async Operations | ✅ | ✅ | ✅ | Jobs module with presigned uploads |
| File Handling | ✅ | ✅ | ✅ | Files module with S3/local storage |

## 6. Quality & Reliability

| Feature | API Guide | Contracts | API | Notes |
|---------|-----------|-----------|-----|-------|
| Audit Logging | ✅ | 📋 | ✅ | `packages/authorization` audit service with hash chaining |
| Idempotency | ✅ | ➖ | ✅ | `Idempotency-Key` header, 24h cache, `X-Idempotent-Replayed` |
| Caching | ✅ | ➖ | ✅ | `packages/cache` with memory/Redis providers |
| Monitoring | ✅ | ➖ | 🟡 | `packages/metrics` for authorization; API metrics plugin |
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
| Testing | ✅ | ❌ | 🟡 | Vitest configs added; authorization tests |
| Deprecation | ✅ | ❌ | ❌ | Sunset headers, warnings |
| Migration | ✅ | ❌ | ❌ | |

---

## Resources Status

| Resource | Model | Routes | DB Schema | Service | API Routes |
|----------|-------|--------|-----------|---------|------------|
| ExamplePost | ✅ | ✅ | ✅ | ✅ | ✅ |
| ExampleComment | ✅ | ✅ | ✅ | ✅ | ✅ |
| User | ✅ | 📋 | ✅ | ❌ | 🟡 | better-auth handles /auth/* routes |
| Session | ➖ | ➖ | ✅ | ➖ | 🟡 | better-auth managed |
| Account | ➖ | ➖ | ✅ | ➖ | 🟡 | better-auth managed |
| Organization | ✅ | 📋 | ✅ | ❌ | 🟡 | better-auth org plugin |
| Application | ✅ | ✅ | ✅ | ❌ | 🟡 | Multi-app support, seed `app_default` |
| Role | ✅ | ✅ | ✅ | ✅ | ✅ | RoleService, global + tenant roles |
| UserRoleAssignment | ✅ | ✅ | ✅ | ✅ | ✅ | UserRoleService |
| UserActiveContext | ✅ | ✅ | ✅ | ❌ | ✅ | Context switching routes |
| ApiKey | ✅ | 📋 | ✅ | ❌ | 🟡 | better-auth apiKey plugin |
| Notification | ➖ | ➖ | ✅ | ✅ | ❌ | `packages/notifications` |
| File | ✅ | ✅ | ✅ | ✅ | ✅ | Presigned URLs, MIME validation |
| Job | ✅ | ✅ | ✅ | ✅ | ✅ | Status polling, cancellation |
| Webhook | ✅ | 📋 | ❌ | ❌ | ❌ |
| AuditLog | ✅ | 📋 | ✅ | ✅ | ❌ | `packages/authorization` audit service |

---

## Priority Backlog

### Completed
- [x] Authentication (better-auth integration) - `packages/auth`
- [x] Notifications system - `packages/notifications`
- [x] Database schema for auth tables - CLI-generated `packages/db/src/schema/auth.ts`
- [x] Authorization (Casbin integration) - `packages/authorization`
  - Drizzle adapter for policy persistence
  - RBAC model with domains (organizations)
  - Default role policies (owner, admin, member, viewer)
  - Policy sync with better-auth membership
  - Violations tracking system
- [x] Authorization API routes - policy management, role assignment
- [x] Authorization audit logging - `packages/db/src/schema/authorization-audit.ts`
  - Hash chaining for tamper detection
  - Event logging (policy changes, permission denials, role assignments)
- [x] Caching system - `packages/cache`
  - Memory provider for development
  - Redis provider for production
  - Authorization cache with invalidation
- [x] Metrics system - `packages/metrics`
  - Prometheus-compatible authorization metrics
  - API metrics plugin
- [x] **Multi-App RBAC** - Full multi-application authorization
  - Multi-application architecture with `applicationId`
  - Global roles (app-scoped, no tenant)
  - Tenant-scoped roles
  - Deny-override permission model
  - Dynamic conditions (owner, shared)
  - Context switching (app/tenant)
  - Updated TypeSpec contracts
  - Updated API documentation
- [x] **Rate Limiting** - Tier-based DDoS protection
  - @fastify/rate-limit with Redis support
  - Tier-based limits: Free (100/hr), Basic (1K/hr), Pro (10K/hr), Enterprise (100K/hr)
  - Standard headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
- [x] **Security Headers** - @fastify/helmet integration
  - CSP, HSTS, X-Frame-Options, X-Content-Type-Options
  - Configurable via environment
- [x] **Field Selection** - Sparse fieldsets implementation
  - `fields=id,title,status` query parameter
  - Dynamic SQL column selection for bandwidth optimization
  - Whitelisted field validation
- [x] **Cursor-Based Pagination** - Large dataset support
  - `GET /cursor` endpoint with `cursor`, `limit` params
  - Returns `nextCursor`, `previousCursor`, `hasNext`
  - Optimized for >100K records
- [x] **Idempotency Keys** - Duplicate request prevention
  - `Idempotency-Key` header for POST/PATCH
  - 24-hour cache (Redis or in-memory)
  - `X-Idempotent-Replayed: true` on duplicate requests
- [x] **Batch Restore** - Bulk restoration of soft-deleted records
  - `POST /batch/restore` endpoint
- [x] **List Deleted** - Query soft-deleted records
  - `GET /deleted` endpoint with pagination

### Immediate Next Steps

Before running the application, complete these setup tasks:

#### 1. Database Setup (Required)
- [ ] **Set up PostgreSQL** - The database is not currently running
  - Option A: Install PostgreSQL locally
  - Option B: Use Docker Compose (recommended - see instructions below)
- [ ] **Create .env file** - Copy `.env.example` to `.env` and configure database URL
- [ ] **Run database migration** - `cd packages/db && pnpm db:push`
- [ ] **Seed default application** - Create `app_default` and system roles

#### 2. High Priority Features
- [x] Rate limiting - Tier-based with Redis support
- [x] Field selection implementation in API - Sparse fieldsets
- [x] Security headers - @fastify/helmet with comprehensive headers
- [ ] Testing infrastructure setup

**Docker Compose Setup:**
```yaml
# docker-compose.yml (create in project root)
version: '3.8'
services:
  postgres:
    image: postgres:17
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: mydb
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Then run: `docker-compose up -d`

### Medium Priority
- [x] Batch restore endpoint - `POST /batch/restore`
- [x] List deleted resources endpoint - `GET /deleted`
- [x] Idempotency keys - `Idempotency-Key` header with cache
- [x] Cursor-based pagination - `GET /cursor` endpoint
- [ ] Full metrics coverage (beyond authorization)

### Low Priority
- [x] Async operations (Jobs) - `apps/api/src/modules/jobs`
- [x] File handling - `apps/api/src/modules/files` + `packages/storage`
- [ ] Webhooks
- [ ] Caching headers (ETag, Cache-Control)

### Future
- [ ] User routes implementation (full CRUD)
- [ ] API key routes implementation

---

## Multi-App RBAC Implementation (Completed ✅)

Authorization has been upgraded to a **Multi-Application RBAC** system supporting:

- Multiple applications with isolated tenants, users, and roles
- Global roles (app-scoped, no tenant) and tenant-scoped roles
- Multiple roles per user with deny-override permission model
- Dynamic conditions (ownership, sharing) for fine-grained access

### Architecture

```
Platform
├── Application A (app_default)
│   ├── Global Roles (super_user, app_admin, user)
│   ├── Tenant 1 (org_abc)
│   │   ├── Tenant Roles (owner, admin, member, viewer)
│   │   └── Members (users with roles)
│   └── Tenant 2 (org_xyz)
│       └── ...
│
└── Application B (app_mobile)
    └── ...
```

### Permission Model

```typescript
interface Permission {
  resource: string;           // "documents", "users"
  action: string;             // "read", "create", "update", "delete", "manage"
  effect: "allow" | "deny";   // Deny overrides allow
  condition?: "owner" | "shared";
}
```

### Package Structure

```
packages/authorization/
├── src/
│   ├── index.ts                    # Main exports, createAuthorization()
│   ├── model.conf                  # Multi-app RBAC model with conditions
│   ├── types.ts                    # Enforcer type
│   ├── adapter/
│   │   └── drizzle-adapter.ts      # Custom Drizzle adapter (v0-v6 columns)
│   ├── roles/
│   │   ├── role-service.ts         # RoleService - CRUD with Casbin sync
│   │   └── user-role-service.ts    # UserRoleService - Role assignments
│   ├── functions/
│   │   └── conditions.ts           # isOwner, isShared functions
│   ├── audit/
│   │   └── service.ts              # Audit logging with hash chaining
│   └── violations.ts               # Violation tracking
```

### Database Schemas

| Table | Purpose |
|-------|---------|
| `applications` | Multi-app support |
| `roles` | Role metadata (name, description, isSystemRole) |
| `user_role_assignments` | User ↔ Role mappings |
| `user_active_context` | UI state (active app/tenant) |
| `casbin_rules` | Policy storage (v0-v6 columns) |
| `authorization_audit` | Audit logs with hash chaining |

### API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/roles` | GET/POST | Global roles (app-scoped) |
| `/v1/roles/:roleId` | GET/PATCH/DELETE | Global role by ID |
| `/v1/orgs/:orgId/roles` | GET/POST | Tenant roles |
| `/v1/orgs/:orgId/roles/:roleId` | GET/PATCH/DELETE | Tenant role by ID |
| `/v1/orgs/:orgId/users/:userId/roles` | GET/POST | User role assignments |
| `/v1/orgs/:orgId/users/:userId/roles/:roleId` | DELETE | Remove role |
| `/v1/users/me/context` | GET | Get active context |
| `/v1/users/me/switch-context` | POST | Switch app/tenant |
| `/v1/users/me/available-contexts` | GET | List available contexts |

### Key Files

| Component | File |
|-----------|------|
| Casbin Model | `packages/authorization/src/model.conf` |
| Drizzle Adapter | `packages/authorization/src/adapter/drizzle-adapter.ts` |
| RoleService | `packages/authorization/src/roles/role-service.ts` |
| UserRoleService | `packages/authorization/src/roles/user-role-service.ts` |
| Condition Functions | `packages/authorization/src/functions/conditions.ts` |
| Role Routes | `apps/api/src/modules/authorization/role-routes.ts` |
| User Role Routes | `apps/api/src/modules/authorization/user-role-routes.ts` |
| Context Routes | `apps/api/src/modules/authorization/context-routes.ts` |
| TypeSpec Models | `packages/contracts/spec/models/role.tsp` |
| TypeSpec Routes | `packages/contracts/spec/routes/roles.tsp` |

### TypeSpec Contract Models

```
Application           # Multi-app support
Permission            # resource + action + effect + condition
PermissionEffect      # allow | deny
PermissionCondition   # owner | shared
Role                  # applicationId, tenantId?, permissions[]
UserRoleAssignment    # User ↔ Role mapping
UserEffectivePermissions # Combined permissions after deny-override
ActiveContext         # Current app/tenant selection
UserContext           # Available app/tenant for user
```

### Usage

```typescript
// Check permission with condition
const allowed = await enforcer.enforce(
  userId,
  applicationId,
  tenantId,
  resource,
  action,
  resourceOwnerId  // For ownership conditions
);

// Create role with permissions
await roleService.create({
  applicationId: "app_default",
  tenantId: "org_abc",  // null for global role
  name: "editor",
  permissions: [
    { resource: "documents", action: "read", effect: "allow" },
    { resource: "documents", action: "update", effect: "allow", condition: "owner" },
  ],
});

// Assign role to user
await userRoleService.assignRole({
  userId: "usr_123",
  roleId: "role_abc",
  applicationId: "app_default",
  tenantId: "org_abc",
  assignedBy: "usr_owner",
});
```

### Documentation

- [Authorization Guide](docs/api-guide/03-security/02-authorization.md) - Full RBAC documentation
- [Multitenancy Guide](docs/api-guide/01-core-concepts/05-multitenancy.md) - Multi-app architecture

---

## Async Operations & File Handling Implementation (Completed ✅)

### Jobs Module (`apps/api/src/modules/jobs`)

Background job management with status polling for long-running operations.

**API Routes:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/:orgId/jobs` | GET | List jobs with filtering |
| `/:orgId/jobs/:jobId` | GET | Get job status |
| `/:orgId/jobs/:jobId/cancel` | POST | Cancel pending/processing job |

**Job States:** `pending` → `processing` → `completed` / `failed` / `cancelled`

**Key Files:**
| Component | File |
|-----------|------|
| DB Schema | `packages/db/src/schema/jobs.ts` |
| Repository | `apps/api/src/modules/jobs/repositories/jobs.repository.ts` |
| Service | `apps/api/src/modules/jobs/services/jobs.service.ts` |
| Routes | `apps/api/src/modules/jobs/routes/jobs.ts` |

### Files Module (`apps/api/src/modules/files`)

Secure file uploads with presigned URLs and MIME type validation.

**API Routes:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/:orgId/files` | GET | List files with pagination |
| `/:orgId/files/:fileId` | GET | Get file metadata |
| `/:orgId/files/:fileId/download` | GET | Get download URL (302 redirect) |
| `/:orgId/files/uploads` | POST | Initiate presigned upload |
| `/:orgId/files/uploads/:uploadId/confirm` | POST | Confirm upload |
| `/:orgId/files` | POST | Direct upload (multipart, <10MB) |
| `/:orgId/files/:fileId` | PATCH | Update file access level |
| `/:orgId/files/:fileId` | DELETE | Soft delete |
| `/:orgId/files/:fileId/permanent` | DELETE | Hard delete |

**Security Features:**
- MIME type whitelist (images, PDFs, common docs)
- Filename sanitization (path traversal prevention)
- Size limits per MIME type
- Virus scan stub (auto-mark as "clean")
- Signed URLs (5 min download, 30 min upload)

**Key Files:**
| Component | File |
|-----------|------|
| DB Schema | `packages/db/src/schema/files.ts` |
| Repository | `apps/api/src/modules/files/repositories/files.repository.ts` |
| Service | `apps/api/src/modules/files/services/files.service.ts` |
| Routes | `apps/api/src/modules/files/routes/files.ts` |
| MIME Validator | `apps/api/src/modules/files/utils/mime-validator.ts` |
| Filename Sanitizer | `apps/api/src/modules/files/utils/filename-sanitizer.ts` |

### Storage Package (`packages/storage`)

Abstraction layer for file storage with local and S3-compatible backends.

**Providers:**
- **Local** - Development only, stores in `./uploads`
- **S3** - Production, supports AWS S3, Cloudflare R2, MinIO

**Environment Variables:**
```bash
STORAGE_PROVIDER=local       # Options: local, s3
STORAGE_LOCAL_PATH=./uploads # For local provider

# S3/R2 Configuration
S3_ENDPOINT=                 # Optional: Custom endpoint
S3_REGION=us-east-1
S3_BUCKET=my-bucket
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=

FILE_MAX_SIZE=52428800       # 50 MB default
```

**Key Files:**
| Component | File |
|-----------|------|
| Types | `packages/storage/src/types.ts` |
| Local Provider | `packages/storage/src/providers/local.ts` |
| S3 Provider | `packages/storage/src/providers/s3.ts` |
| Factory | `packages/storage/src/index.ts` |
