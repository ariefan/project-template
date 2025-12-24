# Architecture

This document describes the architecture of the project template, including design principles, technology choices, and how the pieces fit together.

## Table of Contents

1. [AI-Friendliness Principles](#ai-friendliness-principles)
2. [System Overview](#system-overview)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Data Flow](#data-flow)
6. [Design Decisions](#design-decisions)

---

## AI-Friendliness Principles

This template is designed to be optimal for AI coding agents. Every technology choice follows these principles:

### The 7 Principles

| Principle | Description | How We Apply It |
|-----------|-------------|-----------------|
| **1. Explicit over Implicit** | Code shows what it does, no hidden behavior | Drizzle (SQL-like) over Prisma, Fastify over NestJS |
| **2. Types Everywhere** | Strong TypeScript types AI can inspect | Zod schemas, strict TypeScript, typed API contracts |
| **3. Predictable Patterns** | Consistent file structure and conventions | Modular API structure, file-based routing |
| **4. Minimal Abstraction** | Few layers between code and execution | Direct database queries, explicit middleware |
| **5. Copy-Paste over Config** | Code you own vs opaque dependencies | shadcn/ui components live in your repo |
| **6. Composition over Inheritance** | Small pieces that combine | React hooks, composable services |
| **7. Good Documentation** | Every package has a README | Per-package docs with usage examples |

### AI-Friendly Spectrum

```
MORE AI-FRIENDLY                                    LESS AI-FRIENDLY
←───────────────────────────────────────────────────────────────────→

Drizzle (SQL-like)                                  Prisma (DSL)
Fastify (explicit plugins)                          NestJS (decorators)
Zod (TypeScript-native)                             JSON Schema (separate)
shadcn/ui (copy-paste)                              MUI (opaque library)
Tailwind (utilities)                                CSS-in-JS (runtime)
Expo Router (file-based)                            React Navigation (config)
Casbin (explicit policies)                          Magic RBAC libraries
```

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MONOREPO                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                           APPLICATIONS                                  │ │
│  ├────────────────────────────────────────────────────────────────────────┤ │
│  │                                                                         │ │
│  │  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐      │ │
│  │  │    apps/api     │   │    apps/web     │   │   apps/mobile   │      │ │
│  │  │    (Fastify)    │   │    (Next.js)    │   │     (Expo)      │      │ │
│  │  └────────┬────────┘   └────────┬────────┘   └────────┬────────┘      │ │
│  │           │                     │                     │                │ │
│  └───────────┼─────────────────────┼─────────────────────┼────────────────┘ │
│              │                     │                     │                  │
│              ▼                     ▼                     ▼                  │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         SHARED PACKAGES                                 │ │
│  ├────────────────────────────────────────────────────────────────────────┤ │
│  │                                                                         │ │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐              │ │
│  │  │ contracts │ │    db     │ │   auth    │ │authoriz-  │              │ │
│  │  │(TypeSpec) │ │ (Drizzle) │ │(BetterAuth│ │  ation    │              │ │
│  │  └───────────┘ └───────────┘ └───────────┘ │ (Casbin)  │              │ │
│  │                                            └───────────┘              │ │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐                            │ │
│  │  │   cache   │ │  storage  │ │  notifi-  │                            │ │
│  │  │(Redis/Mem)│ │ (S3/Local)│ │  cations  │                            │ │
│  │  └───────────┘ └───────────┘ └───────────┘                            │ │
│  │                                                                         │ │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐                            │ │
│  │  │    ui     │ │ ui-mobile │ │   utils   │                            │ │
│  │  │(shadcn/ui)│ │(NativeWind│ │ (shared)  │                            │ │
│  │  └───────────┘ └───────────┘ └───────────┘                            │ │
│  │                                                                         │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                       │
│                                      ▼                                       │
│                            ┌─────────────────┐                              │
│                            │   PostgreSQL    │                              │
│                            └─────────────────┘                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Layer | Technology | Why This Choice |
|-------|------------|-----------------|
| **API Framework** | Fastify | Explicit plugins, mature ecosystem, excellent TypeScript |
| **Web Framework** | Next.js 16 | App Router, Server Components, massive ecosystem |
| **Mobile Framework** | Expo SDK 54 | Managed React Native, file-based routing |
| **Database ORM** | Drizzle | SQL-like syntax, no magic, explicit queries |
| **Database** | PostgreSQL | Reliable, feature-rich, great with Drizzle |
| **API Contracts** | TypeSpec | Generates OpenAPI, Zod schemas, and TypeScript types |
| **Authentication** | Better Auth | Self-hosted, TypeScript-native, full-featured |
| **Authorization** | Casbin | Explicit policies, multi-tenant RBAC, deny-override |
| **Caching** | Redis / Memory | Pluggable providers, explicit cache keys |
| **File Storage** | S3 / Local | Presigned URLs, provider abstraction |
| **Notifications** | Multi-channel | Email, SMS, WhatsApp, Telegram with templates |
| **Web UI** | shadcn/ui | Copy-paste components, Radix primitives |
| **Mobile UI** | NativeWind | Tailwind for React Native |
| **Styling** | Tailwind CSS | Utility classes, explicit, no CSS files |
| **Forms** | React Hook Form + Zod | Type-safe validation, shared schemas |
| **Data Fetching** | TanStack Query | Explicit cache keys, typed queries |
| **Linting** | Biome (Ultracite) | Fast, single config, replaces ESLint + Prettier |
| **Monorepo** | Turborepo + pnpm | Fast builds, workspace dependencies |
| **Git Hooks** | Lefthook | Pre-commit formatting, parallel execution |

---

## Project Structure

```
project-template/
├── apps/
│   ├── api/                      # Fastify API server
│   │   ├── src/
│   │   │   ├── modules/          # Feature modules (auth, posts, files, etc.)
│   │   │   ├── plugins/          # Fastify plugins (rate-limit, auth, etc.)
│   │   │   ├── lib/              # Shared utilities
│   │   │   ├── app.ts            # App configuration
│   │   │   ├── env.ts            # Environment validation (Zod)
│   │   │   └── index.ts          # Entry point
│   │   └── package.json
│   │
│   ├── web/                      # Next.js web application
│   │   ├── app/                  # App Router pages
│   │   ├── components/           # App-specific components
│   │   ├── lib/                  # Utilities, API client
│   │   └── package.json
│   │
│   └── mobile/                   # Expo mobile application
│       ├── app/                  # Expo Router screens
│       ├── components/           # App-specific components
│       └── package.json
│
├── packages/
│   ├── auth/                     # Better Auth configuration
│   ├── authorization/            # Casbin RBAC system
│   ├── cache/                    # Redis/Memory cache providers
│   ├── contracts/                # TypeSpec API definitions
│   ├── db/                       # Drizzle ORM + schemas
│   ├── notifications/            # Multi-channel notifications
│   ├── storage/                  # S3/Local file storage
│   ├── ui/                       # shadcn/ui components (web)
│   ├── ui-mobile/                # NativeWind components (mobile)
│   ├── utils/                    # Shared utilities
│   └── typescript-config/        # Shared TypeScript config
│
├── docs/                         # Documentation guides
├── templates/                    # PlopJS code generators
│
├── ARCHITECTURE.md               # This file
├── AGENTS.md                     # AI agent instructions
├── README.md                     # Project overview
├── TODO.md                       # Implementation status
│
├── biome.jsonc                   # Linting/formatting config
├── turbo.json                    # Turborepo config
├── pnpm-workspace.yaml           # Workspace definition
└── lefthook.yml                  # Git hooks
```

---

## Data Flow

### API Request Flow

```
Client Request
      │
      ▼
┌─────────────────┐
│   Rate Limit    │  ← @fastify/rate-limit
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Auth Middleware │  ← @workspace/auth (Better Auth)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Authorization  │  ← @workspace/authorization (Casbin)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Route Handler  │  ← Business logic
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Database     │  ← @workspace/db (Drizzle)
└────────┬────────┘
         │
         ▼
    JSON Response
```

### Authorization Flow

```
Permission Check: enforce(userId, appId, orgId, resource, action, resourceOwnerId)
                                          │
                                          ▼
                            ┌─────────────────────────┐
                            │   Load User's Roles     │
                            │   (from user_role_      │
                            │    assignments table)   │
                            └────────────┬────────────┘
                                         │
                                         ▼
                            ┌─────────────────────────┐
                            │   Get Role Permissions  │
                            │   (from casbin_rules)   │
                            └────────────┬────────────┘
                                         │
                                         ▼
                            ┌─────────────────────────┐
                            │   Apply Deny-Override   │
                            │   1. Any deny? → DENY   │
                            │   2. Any allow? → ALLOW │
                            │   3. Default → DENY     │
                            └────────────┬────────────┘
                                         │
                                         ▼
                            ┌─────────────────────────┐
                            │  Evaluate Conditions    │
                            │  (isOwner, isShared)    │
                            └────────────┬────────────┘
                                         │
                                         ▼
                                 ALLOW or DENY
```

### Contract-First Development

```
TypeSpec Definition
       │
       ▼
┌──────────────────┐
│  tsp compile     │
└────────┬─────────┘
         │
    ┌────┴────┬──────────────┐
    ▼         ▼              ▼
OpenAPI    TypeScript    Zod Schemas
  Spec       Types
    │         │              │
    ▼         ▼              ▼
  Scalar   SDK Client    Validation
  Docs     Generation
```

---

## Design Decisions

### Why TypeSpec over Zod + ts-rest?

**TypeSpec generates everything from a single source:**
- OpenAPI 3.0 spec for documentation
- TypeScript types for type safety
- Zod schemas for runtime validation
- SDK client for frontend consumption

**Trade-off accepted:** TypeSpec has a learning curve, but eliminates contract drift between API and clients.

### Why Fastify over Hono?

**Fastify provides:**
- 7+ years of production use (Netflix, Microsoft)
- Mature plugin ecosystem
- Pino logging (best-in-class)
- Schema-based validation

**Trade-off accepted:** Larger bundle than Hono, but more ecosystem maturity for multi-app architecture.

### Why Casbin over simpler RBAC?

**Casbin provides:**
- Multi-tenant support (appId + tenantId)
- Deny-override (explicit denials trump allows)
- Dynamic conditions (isOwner, isShared)
- Policy persistence (Drizzle adapter)

**Trade-off accepted:** More complex than simple role checks, but scales to enterprise authorization needs.

### Why shadcn/ui over component libraries?

**shadcn/ui means:**
- Components live in YOUR repo (`packages/ui/src/components/`)
- AI can read and modify the actual code
- No fighting library opinions
- Built on accessible Radix primitives

**Trade-off accepted:** You maintain the components, but you have full control.

### Why Drizzle over Prisma?

**Drizzle provides:**
- SQL-like syntax (AI understands SQL)
- No build step (no `prisma generate`)
- Explicit queries (no hidden N+1s)
- Type inference from schema

**Trade-off accepted:** Less "magic" means more explicit code, which AI handles better.

### Why Better Auth over Clerk/Auth.js?

**Better Auth provides:**
- Self-hosted (own your data)
- Full TypeScript (no DSL)
- Built-in: API keys, organizations, 2FA, passkeys
- SSO/OIDC support

**Trade-off accepted:** More setup than Clerk, but no vendor lock-in or per-user pricing.

---

## Multi-Tenancy Model

```
Platform
├── Application (app_default)
│   ├── Global Roles (super_admin, system_user)
│   │
│   ├── Organization (org_abc)
│   │   ├── Tenant Roles (owner, admin, member, viewer)
│   │   └── Members (users with assigned roles)
│   │
│   └── Organization (org_xyz)
│       └── ...
│
└── Application (app_mobile)
    └── ...
```

**Key concepts:**
- **Application**: Top-level isolation (API, Admin, Mobile)
- **Organization**: Tenant within an application
- **Global Roles**: App-wide permissions (no tenant)
- **Tenant Roles**: Organization-specific permissions
- **Context Switching**: Users can switch active app/org

---

## Package Dependencies

```
                    ┌─────────────────┐
                    │  apps/api       │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ authorization │   │     auth      │   │ notifications │
└───────┬───────┘   └───────┬───────┘   └───────┬───────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │      db       │
                    └───────────────┘
```

**Dependency rules:**
- Apps depend on packages
- Packages can depend on other packages
- No circular dependencies
- `@workspace/db` is the foundation

---

## Extension Points

### Adding a New API Module

1. Create `apps/api/src/modules/[name]/`
2. Add routes, services, repositories
3. Register in `apps/api/src/app.ts`
4. Add TypeSpec contract in `packages/contracts/`

### Adding a New Package

1. Create `packages/[name]/`
2. Add `package.json` with `@workspace/[name]`
3. Export from `src/index.ts`
4. Add README.md with usage examples

### Adding a New App

1. Use plop: `pnpm plop api` or `pnpm plop web`
2. Configure in `turbo.json`
3. Add to workspace in `pnpm-workspace.yaml`

---

## Security Model

See [docs/security.md](docs/security.md) for full details.

**Key points:**
- Authentication via Better Auth (sessions, API keys)
- Authorization via Casbin (RBAC with deny-override)
- Rate limiting per tier (Free/Basic/Pro/Enterprise)
- Security headers via Helmet
- Input validation via Zod schemas
- Audit logging for authorization decisions

---

## Performance Considerations

See [docs/performance.md](docs/performance.md) for full details.

**Key points:**
- Cache authorization decisions (5 min TTL)
- Use cursor pagination for large datasets
- Batch operations for bulk updates
- Presigned URLs for file uploads (bypass server)
- Connection pooling for database

---

## The Key Insight

> What makes code AI-friendly also makes it human-friendly:
> explicit code, strong types, predictable patterns, and minimal magic.

This architecture prioritizes **clarity over cleverness**. Every choice asks: "Can an AI (or a new developer) understand this without hidden context?"
