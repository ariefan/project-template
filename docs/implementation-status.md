# Project Implementation Status

This document tracks the alignment between documentation (`docs/api-guide`), contracts (`packages/contracts`), and implementation (`apps/api`).

---

## Quick Start

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL and REDIS_URL

# 2. Run database migrations
cd packages/db && pnpm drizzle-kit push

# 3. Start the API
cd apps/api && pnpm dev

# 4. View API docs
open http://localhost:3001/docs
```

---

## Current State: Feature Complete

The API template is fully implemented with all documented features working.

### Core Infrastructure
| Component | Status | Notes |
|-----------|--------|-------|
| Authentication | ✅ | better-auth with JWT, API keys, OAuth |
| Authorization | ✅ | Multi-app RBAC with Casbin, deny-override |
| Rate Limiting | ✅ | Tier-based (Free/Basic/Pro/Enterprise) |
| Security Headers | ✅ | @fastify/helmet integration |
| CORS | ✅ | Configurable origins |

### Data Operations
| Feature | Docs | Contracts | API | Notes |
|---------|------|-----------|-----|-------|
| Page-based Pagination | ✅ | ✅ | ✅ | `page`, `pageSize`, `totalCount` |
| Cursor-based Pagination | ✅ | ✅ | ✅ | `GET /cursor` endpoints |
| Filtering (equality) | ✅ | ✅ | ✅ | `status=draft` |
| Filtering (operators) | ✅ | ✅ | ✅ | `Ne`, `In`, `Contains`, `After`, `Before` |
| Sorting | ✅ | ✅ | ✅ | `orderBy=-createdAt,title` |
| Field Selection | ✅ | ✅ | ✅ | `fields=id,title` |
| Search | ✅ | ✅ | ✅ | `search` parameter |

### Advanced Operations
| Feature | Docs | Contracts | API | Notes |
|---------|------|-----------|-----|-------|
| Batch Create | ✅ | ✅ | ✅ | `POST /batch` with atomic option |
| Batch Update | ✅ | ✅ | ✅ | `PATCH /batch` |
| Batch Soft Delete | ✅ | ✅ | ✅ | `POST /batch/soft-delete` |
| Batch Restore | ✅ | ✅ | ✅ | `POST /batch/restore` |
| Soft Delete | ✅ | ✅ | ✅ | Returns deletion metadata |
| Hard Delete | ✅ | ✅ | ✅ | `DELETE /permanent`, 204 |
| Restore | ✅ | ✅ | ✅ | `POST /{id}/restore` |
| List Deleted | ✅ | ✅ | ✅ | `GET /deleted` |

### Quality & Reliability
| Feature | Docs | Contracts | API | Notes |
|---------|------|-----------|-----|-------|
| Idempotency Keys | ✅ | ➖ | ✅ | `Idempotency-Key` header for POST/PATCH |
| HTTP Caching | ✅ | ➖ | ✅ | ETag, Cache-Control, 304 responses |
| Prometheus Metrics | ✅ | ➖ | ✅ | `/metrics` endpoint |
| Audit Logging | ✅ | ✅ | ✅ | Query, export (CSV/JSON) |
| Deprecation Headers | ✅ | ➖ | ✅ | Sunset, Link rel="deprecation" |

### Integrations
| Feature | Docs | Contracts | API | Notes |
|---------|------|-----------|-----|-------|
| Webhooks CRUD | ✅ | ✅ | ✅ | 11 endpoints |
| Webhook Delivery | ✅ | ✅ | ✅ | pg-boss async, HMAC-SHA256 |
| Webhook Retries | ✅ | ✅ | ✅ | 1m, 5m, 30m, 2h, 6h, 24h |
| File Uploads | ✅ | ✅ | ✅ | Presigned URLs + direct upload |
| Async Jobs | ✅ | ✅ | ✅ | Status polling, cancellation |

---

## Resource Endpoints

### Fully Implemented (84+ endpoints)

| Resource | Endpoints | Location |
|----------|-----------|----------|
| Health | 1 | `GET /health` |
| Auth | * | `ALL /api/auth/*` (better-auth) |
| Applications | 5 | `GET/POST/PATCH/DELETE /v1/applications` |
| Global Roles | 5 | `GET/POST/PATCH/DELETE /v1/roles` |
| Tenant Roles | 5 | `GET/POST/PATCH/DELETE /v1/orgs/:orgId/roles` |
| User Roles | 3 | `/v1/orgs/:orgId/users/:userId/roles` |
| Context | 3 | `/v1/users/me/context`, `switch-context`, `available-contexts` |
| Violations | 5 | `suspend`, `restore`, `lockdown`, `unlock`, `list` |
| Audit Logs | 3 | `list`, `get`, `export` |
| Example Posts | 13 | Full CRUD + batch + cursor pagination |
| Example Comments | 9 | Full CRUD + batch (nested under posts) |
| Files | 9 | Upload, download, access control |
| Jobs | 3 | List, get status, cancel |
| Webhooks | 11 | Full CRUD + delivery management |
| Notifications | 3 | List, get, send |
| Notification Prefs | 2 | Get, update preferences |
| Migration | 1 | `GET /v1/migration/status` |

### User & Member Management

Handled by better-auth plugins (no custom contracts needed):

**Admin Plugin** (`/api/auth/admin/*`)
- List, create, update, delete users
- Ban/unban, set role, impersonate
- Session management

**Organization Plugin** (`/api/auth/organization/*`)
- List, add, remove, update members
- Invite system with accept/reject
- Organization CRUD

**API Key Plugin** (`/api/auth/api-key/*`)
- Create, list, update, delete keys
- Rate limiting per key
- Expiration and usage tracking

---

## Contracts vs Implementation Alignment

### Perfect Alignment ✅
- Health, Files, Roles, Audit Logs, Jobs, Webhooks
- Example Posts, Example Comments
- Migration Status

### API-Only (No Contracts Needed)
| Feature | Reason |
|---------|--------|
| Auth routes | better-auth handles internally |
| Applications | Admin-only, simple CRUD |
| Violations | Internal security feature |
| Notification preferences | User settings, simple model |
| Metrics endpoint | Infrastructure, not business API |
| Caching/Idempotency | Middleware, not resource |

### Contracts-Only (Not Exposed)
| Model | Status |
|-------|--------|
| OffsetPagination | Deprecated, cursor preferred |

---

## Test Coverage

```
Total: 170+ tests across all packages

apps/api           45 tests (webhooks, routes)
packages/cache     38 tests
packages/storage   17 tests
packages/db        Schema tests
packages/auth      Integration tests
```

Run tests:
```bash
pnpm test                    # All tests
pnpm test --filter=api       # API only
pnpm vitest run --reporter=verbose  # Detailed output
```

---

## Environment Configuration

### Required
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/db"
BETTER_AUTH_SECRET="your-secret-key"
BETTER_AUTH_URL="http://localhost:3001"
```

### Optional Features
```env
# Redis (for rate limiting, caching)
REDIS_URL="redis://localhost:6379"
CACHE_PROVIDER="redis"  # or "memory"

# Async queues (webhooks, notifications)
QUEUE_ENABLED=true
QUEUE_CONCURRENCY=10

# Metrics
METRICS_ENABLED=true

# HTTP Caching
CACHING_ENABLED=true

# Idempotency
IDEMPOTENCY_ENABLED=true
IDEMPOTENCY_TTL=86400

# Deprecation warnings
DEPRECATION_ENABLED=true

# Storage (for file uploads)
STORAGE_PROVIDER="local"  # or "s3"
STORAGE_LOCAL_PATH="./uploads"

# Email (for notifications)
EMAIL_PROVIDER="resend"
RESEND_API_KEY="re_xxx"
EMAIL_FROM="noreply@example.com"
```

---

## Architecture

```
packages/
├── auth/           # better-auth configuration
├── authorization/  # Casbin RBAC engine
├── cache/          # Memory + Redis providers
├── contracts/      # TypeSpec → OpenAPI → Zod → SDK
├── db/             # Drizzle ORM + PostgreSQL
├── metrics/        # Prometheus metrics
├── notifications/  # Email/SMS/Push via pg-boss
├── storage/        # Local + S3 file storage
├── test-utils/     # Factories and mocks
├── ui/             # React components (web)
├── ui-mobile/      # React Native components
└── utils/          # Shared utilities

apps/
├── api/            # Fastify server (this template)
├── web/            # Next.js frontend
└── mobile/         # Expo mobile app
```

### Module Pattern
```
apps/api/src/modules/{resource}/
├── routes/{resource}.ts      # HTTP handlers
├── services/{resource}.service.ts
├── repositories/{resource}.repository.ts
└── index.ts                  # Module registration
```

---

## Commands Reference

```bash
# Development
pnpm dev                      # Start all apps
pnpm build                    # Build all packages

# Contracts (TypeSpec → SDK)
cd packages/contracts
pnpm generate                 # Regenerate all

# Database
cd packages/db
pnpm drizzle-kit generate     # Create migration
pnpm drizzle-kit push         # Apply to database
pnpm drizzle-kit studio       # Visual editor

# Code Quality
pnpm typecheck                # TypeScript validation
pnpm dlx ultracite fix        # Format + lint

# Testing
pnpm test                     # Run all tests
pnpm vitest --ui              # Interactive test UI
```

---

## What's Next?

This template is production-ready. To build your application:

1. **Add your domain resources** - Copy the `example-posts` module pattern
2. **Define TypeSpec contracts** - Add to `packages/contracts/spec/`
3. **Generate SDK** - Run `pnpm generate` in contracts
4. **Implement routes** - Follow the established patterns
5. **Add tests** - Use `packages/test-utils` factories

### Optional Enhancements
- [ ] Add custom webhook event types for your domain
- [ ] Configure real email/SMS providers
- [ ] Set up Redis for production caching
- [ ] Add domain-specific audit events
- [ ] Implement custom authorization conditions
