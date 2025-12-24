# Implementation Status

This table tracks the implementation status of features documented in `docs/api-guide` across `packages/contracts` (TypeSpec) and `apps/api` (Fastify).

## Current Project State

**Fully Implemented:**
- Multi-App RBAC authorization system with Casbin
- Authentication via better-auth
- Notifications system with email/SMS/push support
- Caching layer (memory + Redis)
- TypeSpec contracts with auto-generated SDK
- Comprehensive API documentation (Scalar UI)
- Rate limiting with tier-based limits (Free/Basic/Pro/Enterprise)
- Security headers via @fastify/helmet
- Field selection (sparse fieldsets) for bandwidth optimization
- Cursor-based pagination for large datasets
- Idempotency keys middleware for POST/PATCH operations
- Batch operations (create, update, soft-delete, restore)
- Async Operations (Jobs) - Background job management
- File Handling - Secure file uploads with presigned URLs + PATCH access level
- Audit Logging API - Query, get single, and export (CSV/JSON) endpoints

**Pending Setup:**
- PostgreSQL database needs to be started
- Database migrations need to be run
- Default application (`app_default`) needs to be seeded
- Environment variables need to be configured (`.env` file)

**In Progress:**
- Testing infrastructure (258+ tests across packages, expanding coverage)

---

## Consistency Matrix: API Guide / Contracts / API

This matrix shows whether each feature is documented, has TypeSpec contracts, and is implemented in the API.

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Fully implemented/documented |
| 🟡 | Partially implemented |
| ❌ | Not implemented |
| ➖ | Not applicable |

---

### 1. Core Concepts

| Feature | API Guide | Contracts | API | Notes |
|---------|-----------|-----------|-----|-------|
| Naming Conventions | ✅ | ✅ | ✅ | camelCase throughout |
| HTTP Methods (CRUD) | ✅ | ✅ | ✅ | Full CRUD on example resources |
| Request/Response Format | ✅ | ✅ | ✅ | `{ data, pagination?, meta }` |
| Versioning | ✅ | ✅ | ✅ | `/v1/orgs/{orgId}/...` |
| Multitenancy | ✅ | ✅ | ✅ | Multi-app with `applicationId` + `tenantId` |

### 2. Data Operations

| Feature | API Guide | Contracts | API | Notes |
|---------|-----------|-----------|-----|-------|
| Page-based Pagination | ✅ | ✅ | ✅ | `page`, `pageSize`, `totalCount` |
| Cursor-based Pagination | ✅ | ✅ | ✅ | `GET /cursor` with `nextCursor` |
| Filtering (equality) | ✅ | ✅ | ✅ | `status`, `authorId` |
| Filtering (operators) | ✅ | ✅ | ✅ | `statusNe`, `statusIn`, `titleContains` |
| Search | ✅ | ✅ | ✅ | `search` param |
| Date Range Filters | ✅ | ✅ | ✅ | `createdAfter`, `createdBefore` |
| Sorting | ✅ | ✅ | ✅ | `orderBy=-createdAt,title` |
| Field Selection | ✅ | ✅ | ✅ | `fields=id,title,status` |

### 3. Security

| Feature | API Guide | Contracts | API | Notes |
|---------|-----------|-----------|-----|-------|
| Authentication | ✅ | ➖ | ✅ | better-auth handles `/auth/*` |
| Authorization (RBAC) | ✅ | ✅ | ✅ | Multi-app with deny-override |
| Global Roles | ✅ | ✅ | ✅ | App-scoped roles |
| Tenant Roles | ✅ | ✅ | ✅ | Org-scoped roles |
| Context Switching | ✅ | ✅ | ✅ | `/users/me/context` |
| Rate Limiting | ✅ | ➖ | ✅ | Tier-based with Redis |
| CORS | ✅ | ➖ | ✅ | Configured in app.ts |
| Security Headers | ✅ | ➖ | ✅ | @fastify/helmet |

### 4. Error Handling

| Feature | API Guide | Contracts | API | Notes |
|---------|-----------|-----------|-----|-------|
| Error Structure | ✅ | ✅ | ✅ | `{ error: { code, message, details } }` |
| Error Codes | ✅ | ✅ | ✅ | Standardized codes |
| Validation | ✅ | ✅ | ✅ | Zod schemas from contracts |
| Request ID | ✅ | ✅ | ✅ | `meta.requestId` |

### 5. Advanced Operations

| Feature | API Guide | Contracts | API | Notes |
|---------|-----------|-----------|-----|-------|
| Batch Create | ✅ | ✅ | ✅ | `POST /batch` |
| Batch Update | ✅ | ✅ | ✅ | `PATCH /batch` |
| Batch Soft Delete | ✅ | ✅ | ✅ | `POST /batch/soft-delete` |
| Batch Restore | ✅ | ✅ | ✅ | `POST /batch/restore` |
| Soft Delete | ✅ | ✅ | ✅ | 200 + metadata |
| Hard Delete | ✅ | ✅ | ✅ | 204 No Content |
| Restore | ✅ | ✅ | ✅ | `POST /{id}/restore` |
| List Deleted | ✅ | ✅ | ✅ | `GET /deleted` |
| Async Operations | ✅ | ✅ | ✅ | Jobs module |
| File Handling | ✅ | ✅ | ✅ | Complete with PATCH endpoint |

### 6. Quality & Reliability

| Feature | API Guide | Contracts | API | Notes |
|---------|-----------|-----------|-----|-------|
| Audit Logging | ✅ | ✅ | ✅ | Full API with query/export |
| Idempotency | ✅ | ➖ | ✅ | `Idempotency-Key` header |
| Caching | ✅ | ➖ | ✅ | `packages/cache` |
| Monitoring | ✅ | ➖ | ❌ | Metrics package removed |
| Performance | ✅ | ➖ | ➖ | Guidelines only |

### 7. Integrations

| Feature | API Guide | Contracts | API | Notes |
|---------|-----------|-----------|-----|-------|
| Webhooks | ✅ | ✅ | ❌ | Contracts defined, not implemented |
| Client SDKs | ✅ | ✅ | ➖ | Auto-generated via @hey-api/openapi-ts |

### 8. Governance

| Feature | API Guide | Contracts | API | Notes |
|---------|-----------|-----------|-----|-------|
| OpenAPI Docs | ✅ | ✅ | ✅ | TypeSpec → OpenAPI → Scalar |
| Testing | ✅ | ➖ | 🟡 | Vitest configs, partial coverage |
| Deprecation | ✅ | ❌ | ❌ | Not implemented |
| Migration | ✅ | ❌ | ❌ | Not implemented |

---

## Resource Implementation Status

This table shows the implementation status of each resource across the stack.

| Resource | Contracts | DB Schema | API Routes | Notes |
|----------|-----------|-----------|------------|-------|
| Health | ✅ | ➖ | ✅ | `/health` |
| ExamplePost | ✅ | ✅ | ✅ | Full CRUD + batch |
| ExampleComment | ✅ | ✅ | ✅ | Nested under posts |
| **User** | ✅ | ✅ | ❌ | **11 endpoints not implemented** |
| **ApiKey** | ✅ | ✅ | ❌ | **6 endpoints not implemented** |
| AuditLog | ✅ | ✅ | ✅ | Query, get, export endpoints |
| **Webhook** | ✅ | ❌ | ❌ | **8 endpoints not implemented** |
| Role | ✅ | ✅ | ✅ | Global + tenant roles |
| UserRoleAssignment | ✅ | ✅ | ✅ | Role assignment |
| UserActiveContext | ✅ | ✅ | ✅ | Context switching |
| File | ✅ | ✅ | ✅ | Full CRUD with presigned URLs |
| Job | ✅ | ✅ | ✅ | Status polling |
| Notification | ➖ | ✅ | 🟡 | Service only, minimal routes |
| Application | ✅ | ✅ | 🟡 | Multi-app support |

---

## Implementation Gaps (Contracts Defined, Not Implemented)

These resources have TypeSpec contracts but no API route implementation:

### Critical: Users API (11 endpoints)
```
GET    /v1/orgs/{orgId}/users              # List users
POST   /v1/orgs/{orgId}/users              # Create user
GET    /v1/orgs/{orgId}/users/{id}         # Get user
PATCH  /v1/orgs/{orgId}/users/{id}         # Update user
DELETE /v1/orgs/{orgId}/users/{id}         # Soft delete
DELETE /v1/orgs/{orgId}/users/{id}/permanent  # Hard delete
POST   /v1/orgs/{orgId}/users/{id}/restore    # Restore
POST   /v1/orgs/{orgId}/users/batch           # Batch create
PATCH  /v1/orgs/{orgId}/users/batch           # Batch update
POST   /v1/orgs/{orgId}/users/batch/soft-delete  # Batch delete
POST   /v1/orgs/{orgId}/users/{id}/actions/reset-password
```

### Critical: API Keys (6 endpoints)
```
GET    /v1/orgs/{orgId}/api-keys           # List keys
POST   /v1/orgs/{orgId}/api-keys           # Create key
GET    /v1/orgs/{orgId}/api-keys/{keyId}   # Get key
PATCH  /v1/orgs/{orgId}/api-keys/{keyId}   # Update key
DELETE /v1/orgs/{orgId}/api-keys/{keyId}   # Revoke key
POST   /v1/orgs/{orgId}/api-keys/{keyId}/rotate  # Rotate secret
```

### Medium Priority: Webhooks (8 endpoints)
```
GET    /v1/orgs/{orgId}/webhooks           # List webhooks
POST   /v1/orgs/{orgId}/webhooks           # Create webhook
GET    /v1/orgs/{orgId}/webhooks/{id}      # Get webhook
PATCH  /v1/orgs/{orgId}/webhooks/{id}      # Update webhook
DELETE /v1/orgs/{orgId}/webhooks/{id}      # Delete webhook
POST   /v1/orgs/{orgId}/webhooks/{id}/rotate-secret
POST   /v1/orgs/{orgId}/webhooks/{id}/test
GET    /v1/orgs/{orgId}/webhooks/{id}/deliveries
```

---

## Priority Backlog

### Immediate Next Steps

#### 1. Database Setup (Required before running)
- [ ] Start PostgreSQL (Docker Compose recommended)
- [ ] Create `.env` from `.env.example`
- [ ] Run migrations: `cd packages/db && pnpm db:push`
- [ ] Seed default application `app_default`

**Docker Compose Setup:**
```yaml
# docker-compose.yml
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

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

Then run: `docker-compose up -d`

### High Priority
- [ ] **Users API** - Implement 11 endpoints (critical for user management)
- [ ] **API Keys** - Implement 6 endpoints (service authentication)
- [ ] **Testing** - Expand test coverage (258+ tests done, need more integration tests)

### Medium Priority
- [ ] **Webhooks** - Implement 8 endpoints + delivery system
- [ ] **Monitoring** - Re-implement metrics collection

### Low Priority
- [ ] **Caching headers** - ETag, Cache-Control
- [ ] **Deprecation system** - Sunset headers, version warnings

---

## Architecture Overview

### Package Structure
```
packages/
├── auth/           # better-auth integration
├── authorization/  # Casbin RBAC (multi-app)
├── cache/          # Memory + Redis providers
├── contracts/      # TypeSpec → OpenAPI → Zod
├── db/             # Drizzle ORM + schemas
├── notifications/  # Email/SMS/Push
├── storage/        # S3/Local file storage
├── test-utils/     # Test factories and mocks
├── ui/             # React components (web)
├── ui-mobile/      # React Native components
└── utils/          # Shared utilities

apps/
├── api/            # Fastify API server
├── web/            # Next.js web app
└── mobile/         # Expo mobile app
```

### API Module Pattern
```
apps/api/src/modules/{resource}/
├── routes/
│   └── {resource}.ts       # Route handlers
├── services/
│   └── {resource}.service.ts
├── repositories/
│   └── {resource}.repository.ts
└── index.ts
```

### Key Files
| Component | Location |
|-----------|----------|
| TypeSpec Contracts | `packages/contracts/spec/` |
| Generated Zod | `packages/contracts/zod/` |
| Generated OpenAPI | `packages/contracts/openapi/` |
| DB Schemas | `packages/db/src/schema/` |
| API Routes | `apps/api/src/modules/` |
| API Plugins | `apps/api/src/plugins/` |
| API Guide Docs | `docs/api-guide/` |

---

## Quick Commands

```bash
# Development
pnpm dev                    # Start all apps
pnpm build                  # Build all packages

# Contracts
cd packages/contracts
pnpm generate               # TypeSpec → OpenAPI → Zod

# Database
cd packages/db
pnpm db:push                # Push schema changes
pnpm db:generate            # Generate migrations

# Testing
pnpm test                   # Run all tests
pnpm test --filter=api      # Run API tests only

# Code Quality
pnpm dlx ultracite fix      # Format + lint fix
pnpm typecheck              # TypeScript check
```
