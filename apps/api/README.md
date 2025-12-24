# API Application

**Fastify API server with modular architecture**

This is the main backend API built with [Fastify](https://fastify.dev/), featuring authentication, authorization, file uploads, notifications, and comprehensive API documentation.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           apps/api                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Plugins (global middleware)                                        │
│  ├── security-headers    (helmet, CSP)                              │
│  ├── rate-limit          (request throttling)                       │
│  ├── authorization       (Casbin RBAC)                              │
│  ├── idempotency         (duplicate request handling)               │
│  └── metrics             (Prometheus)                               │
│                                                                      │
│  Modules (feature routes)                                           │
│  ├── auth                (Better Auth integration)                  │
│  ├── authorization       (roles, permissions, violations)           │
│  ├── example-posts       (CRUD demo with comments)                  │
│  ├── files               (file upload/download)                     │
│  ├── jobs                (background job management)                │
│  ├── notifications       (notification preferences)                 │
│  └── health              (health check endpoint)                    │
│                                                                      │
│  Services                                                            │
│  ├── @workspace/auth         (authentication)                       │
│  ├── @workspace/authorization (RBAC)                                │
│  ├── @workspace/notifications (multi-channel)                       │
│  ├── @workspace/storage      (file storage)                         │
│  └── @workspace/db           (database)                             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# From monorepo root
pnpm dev --filter=api

# Or directly
cd apps/api
pnpm dev
```

Server starts at `http://localhost:3001`

## API Documentation

- **Scalar UI**: http://localhost:3001/docs
- **OpenAPI JSON**: http://localhost:3001/openapi.json

## Project Structure

```
apps/api/
├── src/
│   ├── app.ts              # App configuration, plugins, routes
│   ├── env.ts              # Environment validation (Zod)
│   ├── index.ts            # Server entry point
│   │
│   ├── lib/
│   │   ├── errors.ts       # Error classes
│   │   └── response.ts     # Response helpers
│   │
│   ├── plugins/
│   │   ├── authorization.ts    # Casbin middleware
│   │   ├── idempotency.ts      # Duplicate request handling
│   │   ├── metrics.ts          # Prometheus metrics
│   │   ├── rate-limit.ts       # Rate limiting
│   │   └── security-headers.ts # Security headers
│   │
│   └── modules/
│       ├── auth/               # Authentication
│       │   ├── routes.ts
│       │   ├── middleware.ts
│       │   └── authorization-middleware.ts
│       │
│       ├── authorization/      # RBAC management
│       │   ├── role-routes.ts
│       │   ├── user-role-routes.ts
│       │   ├── context-routes.ts
│       │   └── violation-routes.ts
│       │
│       ├── example-posts/      # Demo CRUD module
│       │   ├── routes/
│       │   ├── services/
│       │   └── repositories/
│       │
│       ├── files/              # File management
│       │   ├── routes/
│       │   ├── services/
│       │   └── utils/
│       │
│       ├── jobs/               # Background jobs
│       │   ├── routes/
│       │   └── services/
│       │
│       ├── notifications/      # Notification preferences
│       │   └── routes/
│       │
│       └── health/             # Health checks
│           └── routes.ts
│
├── package.json
└── tsconfig.json
```

## Modules

### Auth (`/api/auth/*`)
Better Auth integration with session management.

```
POST   /api/auth/sign-in/email     # Email/password login
POST   /api/auth/sign-up/email     # Email registration
POST   /api/auth/sign-out          # Logout
GET    /api/auth/session           # Get current session
```

### Authorization (`/v1/orgs/:orgId/...`)
Role and permission management.

```
# Roles
GET    /v1/orgs/:orgId/roles           # List roles
POST   /v1/orgs/:orgId/roles           # Create role
PATCH  /v1/orgs/:orgId/roles/:id       # Update role
DELETE /v1/orgs/:orgId/roles/:id       # Delete role

# User Roles
GET    /v1/orgs/:orgId/users/:userId/roles    # Get user roles
POST   /v1/orgs/:orgId/users/:userId/roles    # Assign role
DELETE /v1/orgs/:orgId/users/:userId/roles/:id # Remove role

# Context
GET    /v1/users/:userId/context       # Get active context
PUT    /v1/users/:userId/context       # Set active context

# Violations
GET    /v1/orgs/:orgId/violations      # List violations
```

### Example Posts (`/v1/orgs/:orgId/posts`)
Demo CRUD with soft delete, batch operations, and comments.

```
GET    /v1/orgs/:orgId/posts           # List posts
POST   /v1/orgs/:orgId/posts           # Create post
GET    /v1/orgs/:orgId/posts/:id       # Get post
PATCH  /v1/orgs/:orgId/posts/:id       # Update post
DELETE /v1/orgs/:orgId/posts/:id       # Soft delete
POST   /v1/orgs/:orgId/posts/:id/restore # Restore deleted

# Comments
GET    /v1/orgs/:orgId/posts/:id/comments     # List comments
POST   /v1/orgs/:orgId/posts/:id/comments     # Create comment
```

### Files (`/v1/orgs/:orgId/files`)
File upload with presigned URLs.

```
POST   /v1/orgs/:orgId/files/upload-url    # Get upload URL
GET    /v1/orgs/:orgId/files/:id           # Get file info
GET    /v1/orgs/:orgId/files/:id/download  # Get download URL
DELETE /v1/orgs/:orgId/files/:id           # Delete file
```

### Jobs (`/v1/orgs/:orgId/jobs`)
Background job management.

```
GET    /v1/orgs/:orgId/jobs           # List jobs
POST   /v1/orgs/:orgId/jobs           # Create job
GET    /v1/orgs/:orgId/jobs/:id       # Get job status
DELETE /v1/orgs/:orgId/jobs/:id       # Cancel job
```

### Notifications (`/v1/notifications`)
User notification preferences.

```
GET    /v1/notifications/preferences      # Get preferences
PUT    /v1/notifications/preferences      # Update preferences
```

### Health (`/health`)
Health check for load balancers.

```
GET    /health                        # Returns { status: "ok" }
```

## Environment Variables

See `src/env.ts` for full schema. Key variables:

```bash
# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL=postgres://user:pass@localhost:5432/db

# Auth
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3001

# CORS
CORS_ORIGIN=http://localhost:3000

# Storage
STORAGE_PROVIDER=local  # or "s3"
STORAGE_LOCAL_PATH=./uploads

# Cache
CACHE_PROVIDER=memory   # or "redis"
REDIS_URL=redis://localhost:6379

# Notifications (optional)
RESEND_API_KEY=...
TWILIO_ACCOUNT_SID=...
```

## Adding a New Module

1. Create module folder:
```bash
mkdir -p src/modules/products/{routes,services,repositories}
```

2. Create route file:
```typescript
// src/modules/products/routes/products.ts
import { FastifyPluginAsync } from "fastify";

export const productsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/:orgId/products", async (request) => {
    // List products
  });

  app.post("/:orgId/products", async (request) => {
    // Create product
  });
};
```

3. Create index:
```typescript
// src/modules/products/index.ts
import { FastifyPluginAsync } from "fastify";
import { productsRoutes } from "./routes/products";

export const productsModule: FastifyPluginAsync = async (app) => {
  await app.register(productsRoutes);
};
```

4. Register in `app.ts`:
```typescript
import { productsModule } from "./modules/products";

await app.register(productsModule, { prefix: "/v1/orgs" });
```

## Testing

```bash
# Run tests
pnpm test

# Watch mode
pnpm test:watch
```

## Scripts

```bash
pnpm dev        # Start development server
pnpm build      # Build for production
pnpm start      # Start production server
pnpm test       # Run tests
pnpm typecheck  # Type check
pnpm lint       # Lint code
```

## Dependencies

- `fastify` - Web framework
- `@fastify/cors` - CORS support
- `@fastify/cookie` - Cookie parsing
- `@fastify/multipart` - File uploads
- `@fastify/rate-limit` - Rate limiting
- `@scalar/fastify-api-reference` - API docs UI
- `@workspace/auth` - Authentication
- `@workspace/authorization` - RBAC
- `@workspace/db` - Database
- `@workspace/notifications` - Notifications
- `@workspace/storage` - File storage
