# Implementation Status

This document tracks the implementation status of features documented in `docs/api-guide` across `packages/contracts` (TypeSpec) and `apps/api` (Fastify).

## 🔴 Critical Issues Requiring Attention

1. **Database Not Running** - PostgreSQL and Redis need to be started before the API can run. Docker Compose setup provided below.

---

## Table of Contents

1. [Current Project State](#current-project-state)
2. [Consistency Matrix](#consistency-matrix-api-guide--contracts--api)
3. [Resource Implementation Status](#resource-implementation-status)
4. [User & Member Management (Better-Auth)](#user--member-management-better-auth)
5. [API Key Management (Better-Auth)](#api-key-management-better-auth)
6. [Priority Backlog](#priority-backlog)
7. [Architecture Overview](#architecture-overview)
8. [Quick Commands](#quick-commands)

---

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
- Webhooks - Full CRUD + delivery system with HMAC signatures and retry logic

**Pending Setup:**
- PostgreSQL database needs to be started
- Database migrations need to be run
- Default application (`app_default`) needs to be seeded
- Environment variables need to be configured (`.env` file)

**User & Member Management:**
- ✅ User management handled by better-auth admin plugin (`/api/auth/admin/*`)
- ✅ Member management handled by better-auth organization plugin (`/api/auth/organization/*`)

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
| Webhooks | ✅ | ✅ | ✅ | Full CRUD + delivery with HMAC |
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
| User | ➖ | ✅ | ✅ | Handled by better-auth admin plugin |
| OrgMember | ➖ | ✅ | ✅ | Handled by better-auth organization plugin |
| ApiKey | ➖ | ✅ | ✅ | Handled by better-auth api-key plugin |
| AuditLog | ✅ | ✅ | ✅ | Query, get, export endpoints |
| Webhook | ✅ | ✅ | ✅ | 11 endpoints + delivery system |
| Role | ✅ | ✅ | ✅ | Global + tenant roles |
| UserRoleAssignment | ✅ | ✅ | ✅ | Role assignment |
| UserActiveContext | ✅ | ✅ | ✅ | Context switching |
| File | ✅ | ✅ | ✅ | Full CRUD with presigned URLs |
| Job | ✅ | ✅ | ✅ | Status polling |
| Notification | ➖ | ✅ | 🟡 | Service only, minimal routes |
| Application | ✅ | ✅ | 🟡 | Multi-app support |

---

## User & Member Management (Better-Auth)

User and member management is handled by better-auth's built-in plugins. No custom TypeSpec contracts are needed.

### Admin Plugin (`/api/auth/admin/*`)

Platform-level user management:

| Operation | Endpoint |
|-----------|----------|
| List users | `POST /api/auth/admin/list-users` |
| Create user | `POST /api/auth/admin/create-user` |
| Update user | `POST /api/auth/admin/update-user` |
| Delete user | `POST /api/auth/admin/remove-user` |
| Ban/unban user | `POST /api/auth/admin/ban-user` |
| Set role | `POST /api/auth/admin/set-role` |
| Change password | `POST /api/auth/admin/set-user-password` |
| Impersonate user | `POST /api/auth/admin/impersonate-user` |
| List sessions | `POST /api/auth/admin/list-user-sessions` |
| Revoke session | `POST /api/auth/admin/revoke-user-session` |

### Organization Plugin (`/api/auth/organization/*`)

Org-scoped member management:

| Operation | Endpoint |
|-----------|----------|
| List members | `GET /api/auth/organization/list-members` |
| Add member | `POST /api/auth/admin/add-member` |
| Remove member | `POST /api/auth/organization/remove-member` |
| Update role | `POST /api/auth/organization/update-member-role` |
| Invite member | `POST /api/auth/organization/invite-member` |
| List invitations | `GET /api/auth/organization/list-invitations` |
| Accept invitation | `POST /api/auth/organization/accept-invitation` |
| Create organization | `POST /api/auth/organization/create` |
| Update organization | `POST /api/auth/organization/update` |
| Delete organization | `POST /api/auth/organization/delete` |

### Extending Better-Auth

If custom fields are needed on users or members, use better-auth's `additionalFields`:

```typescript
// packages/auth/src/index.ts
export const auth = betterAuth({
  user: {
    additionalFields: {
      department: { type: "string", input: true },
      employeeId: { type: "string", input: false },
    },
  },
  plugins: [
    organization({
      schema: {
        member: {
          fields: {
            title: { type: "string", required: false },
            startDate: { type: "date", required: false },
          },
        },
      },
    }),
  ],
});
```

After changes, regenerate the schema: `cd packages/db && pnpm auth:generate`

---

## API Key Management (Better-Auth)

API key management is handled by better-auth's built-in API Key plugin. No custom TypeSpec contracts are needed.

### API Key Plugin (`/api/auth/api-key/*`)

User-scoped API key management:

| Operation | Endpoint |
|-----------|----------|
| Create key | `POST /api/auth/api-key/create` |
| List keys | `GET /api/auth/api-key/list` |
| Get key | `GET /api/auth/api-key/get` |
| Update key | `POST /api/auth/api-key/update` |
| Delete key | `POST /api/auth/api-key/delete` |
| Verify key | `POST /api/auth/api-key/verify` |

### Features

- **Rate limiting** - Built-in sliding window rate limiting per key
- **Expiration** - Configurable key expiration times
- **Usage tracking** - Remaining count with automatic refill
- **Permissions** - Granular resource-based access control
- **Metadata** - Attach custom data to keys
- **Custom prefixes** - Add identifiable prefixes to generated keys

### Usage

API keys are user-scoped. When a request is made with an API key:
1. Key authenticates the **user**
2. User specifies which org they're acting on (via header/path)
3. Authorization checks user's permissions in **that org**

This is the standard pattern used by GitHub, Stripe, and most modern APIs.

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
- [ ] **Testing** - Expand test coverage (258+ tests done, need more integration tests)

### Medium Priority
- [ ] **API Guide Documentation Updates** - Update examples to use better-auth endpoints
  - [ ] Replace `/v1/orgs/{orgId}/users/*` examples with `/api/auth/admin/*` or `/api/auth/organization/*`
  - [ ] Files to review:
    - `docs/api-guide/01-core-concepts/02-http-methods.md`
    - `docs/api-guide/03-security/01-authentication.md`
    - `docs/api-guide/03-security/02-authorization.md`
  - [ ] Add better-auth endpoint reference documentation
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
