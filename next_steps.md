# Next Steps: Contract-Based Monorepo Architecture

This document outlines the recommended approach for evolving this repository into a **contract-based monorepo** containing API, Web, and Mobile applications with shared contracts ensuring type safety across all platforms.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Why Contract-Based Development](#why-contract-based-development)
3. [Recommended Tech Stack](#recommended-tech-stack)
4. [Project Structure](#project-structure)
5. [Implementation Roadmap](#implementation-roadmap)
6. [AI Agent Compatibility Notes](#ai-agent-compatibility-notes)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         MONOREPO                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   apps/api  │  │  apps/web   │  │ apps/mobile │              │
│  │   (Hono)    │  │  (Next.js)  │  │(React Native│              │
│  │             │  │             │  │   Expo)     │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                     │
│         └────────────────┼────────────────┘                     │
│                          │                                      │
│                          ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  packages/contracts                       │   │
│  │    (Shared Types, Validators, API Contracts via Zod)     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          │                                      │
│         ┌────────────────┼────────────────┐                     │
│         ▼                ▼                ▼                     │
│  ┌────────────┐  ┌─────────────┐  ┌─────────────────┐          │
│  │packages/db │  │packages/ui  │  │packages/utils   │          │
│  │ (Drizzle)  │  │ (shadcn/ui) │  │(shared helpers) │          │
│  └────────────┘  └─────────────┘  └─────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Why Contract-Based Development

### Benefits for AI Coding Agents

1. **Single Source of Truth**: Contracts define the exact shape of data, eliminating guesswork
2. **Compile-Time Safety**: TypeScript catches mismatches immediately
3. **Self-Documenting**: Zod schemas serve as living documentation
4. **Predictable Patterns**: Consistent structure makes AI code generation more accurate
5. **Validation Built-In**: Runtime validation prevents invalid data across boundaries

### Benefits for Development Teams

1. **Parallel Development**: Frontend and backend teams can work independently against contracts
2. **Reduced Integration Bugs**: Type mismatches are caught at compile time
3. **Easier Refactoring**: Change the contract, and TypeScript shows all affected code
4. **API Versioning**: Contracts make it clear what changes are breaking

---

## Recommended Tech Stack

### Core Technologies (AI-Optimized)

| Layer | Technology | Why AI-Friendly |
|-------|------------|-----------------|
| **Package Manager** | pnpm | Workspace protocol is explicit, deterministic lockfile |
| **Build System** | Turborepo | Clear dependency graph, cached builds, straightforward config |
| **Language** | TypeScript (strict) | Strong types give AI agents precise context |
| **Runtime** | Node.js 20+ | Stable APIs, excellent documentation |

### Backend (API)

| Technology | Why AI-Friendly |
|------------|-----------------|
| **[Hono](https://hono.dev)** | Lightweight, typed routes, works everywhere (Node, Bun, Edge). Simple middleware pattern. AI can easily understand route definitions. |
| **[Drizzle ORM](https://orm.drizzle.team)** | SQL-like syntax that AI understands intuitively. Type-safe queries derived from schema. No magic - what you write is what runs. |
| **[Zod](https://zod.dev)** | Schema-first validation. AI can read/write Zod schemas easily. Direct TypeScript type inference. |
| **PostgreSQL** | Well-documented, SQL is universally understood by AI models |

#### Why Hono over Express/Fastify/NestJS?

```typescript
// Hono: Explicit, typed, minimal abstraction
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { createUserSchema, userResponseSchema } from '@workspace/contracts'

const app = new Hono()

app.post('/users', zValidator('json', createUserSchema), async (c) => {
  const data = c.req.valid('json') // Fully typed!
  const user = await createUser(data)
  return c.json(userResponseSchema.parse(user))
})
```

- **Express**: Requires separate type definitions, middleware is stringly-typed
- **Fastify**: Good, but more complex plugin system
- **NestJS**: Heavy decorators, DI container adds indirection AI must navigate

#### Why Drizzle over Prisma/TypeORM?

```typescript
// Drizzle: SQL you can read, fully typed
import { eq } from 'drizzle-orm'
import { users } from '@workspace/db/schema'

// AI understands this immediately - it's just SQL
const result = await db
  .select()
  .from(users)
  .where(eq(users.email, email))
```

- **Prisma**: DSL abstraction, generated client adds complexity
- **TypeORM**: Decorators, Active Record patterns obscure actual queries
- **Drizzle**: What you write = what runs. AI can reason about SQL directly.

### Frontend (Web)

| Technology | Why AI-Friendly |
|------------|-----------------|
| **[Next.js 15](https://nextjs.org)** (App Router) | File-based routing is predictable. Server/Client components have clear boundaries. Massive training data for AI. |
| **[TanStack Query](https://tanstack.com/query)** | Declarative data fetching. Clear cache/mutation patterns. Type-safe with contracts. |
| **[shadcn/ui](https://ui.shadcn.com)** | Copy-paste components (not a library). AI can read and modify components directly. No hidden abstractions. |
| **[Tailwind CSS](https://tailwindcss.com)** | Utility classes are explicit. AI can reason about styles without jumping to CSS files. |
| **[nuqs](https://nuqs.47ng.com)** | Type-safe URL search params. Simple hook-based API. |

#### Why TanStack Query over SWR/RTK Query?

```typescript
// TanStack Query: Explicit, typed, powerful
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@workspace/contracts/client'

function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => api.users.get(id), // Typed from contracts
  })
}
```

- Explicit query keys (AI can trace cache invalidation)
- Built-in devtools for debugging
- Clear separation of queries vs mutations

### Mobile

| Technology | Why AI-Friendly |
|------------|-----------------|
| **[Expo](https://expo.dev)** (React Native) | Managed workflow reduces native complexity. Same React patterns as web. AI can share knowledge between web/mobile. |
| **[Expo Router](https://docs.expo.dev/router)** | File-based routing (same as Next.js). Predictable navigation patterns. |
| **[TanStack Query](https://tanstack.com/query)** | Same data layer as web. AI doesn't need to learn new patterns. |
| **[NativeWind](https://nativewind.dev)** | Tailwind for React Native. Same utility classes as web. |
| **[React Native Reusables](https://rnr-docs.vercel.app/)** | shadcn/ui-inspired components for React Native. Familiar patterns. |

#### Why Expo over bare React Native?

- **Managed Complexity**: No Xcode/Android Studio for most tasks
- **EAS Build**: Cloud builds without local toolchain setup
- **Over-the-Air Updates**: Fix bugs without app store review
- **Universal Apps**: Web support built-in if needed

### Contracts & Validation

| Technology | Why AI-Friendly |
|------------|-----------------|
| **[Zod](https://zod.dev)** | Schema = Type = Validator in one. AI writes schema, gets everything. |
| **[@ts-rest/core](https://ts-rest.com)** | Contract-first API definitions. Full type inference for client/server. |

#### Contract Example

```typescript
// packages/contracts/src/users.ts
import { z } from 'zod'
import { initContract } from '@ts-rest/core'

// Schema definitions (single source of truth)
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(100),
  createdAt: z.coerce.date(),
})

export const createUserSchema = userSchema.omit({ id: true, createdAt: true })

// Type inference (no duplication!)
export type User = z.infer<typeof userSchema>
export type CreateUser = z.infer<typeof createUserSchema>

// API Contract
const c = initContract()

export const usersContract = c.router({
  create: {
    method: 'POST',
    path: '/users',
    body: createUserSchema,
    responses: {
      201: userSchema,
      400: z.object({ error: z.string() }),
    },
  },
  get: {
    method: 'GET',
    path: '/users/:id',
    pathParams: z.object({ id: z.string().uuid() }),
    responses: {
      200: userSchema,
      404: z.object({ error: z.string() }),
    },
  },
  list: {
    method: 'GET',
    path: '/users',
    query: z.object({
      limit: z.coerce.number().min(1).max(100).default(20),
      offset: z.coerce.number().min(0).default(0),
    }),
    responses: {
      200: z.object({
        data: z.array(userSchema),
        total: z.number(),
      }),
    },
  },
})
```

### Database

| Technology | Why AI-Friendly |
|------------|-----------------|
| **[Drizzle ORM](https://orm.drizzle.team)** | Schema-as-code, SQL-like API, type inference |
| **[Drizzle Kit](https://orm.drizzle.team/kit-docs)** | Migration generation from schema diffs |
| **PostgreSQL** | Reliable, well-documented, AI knows SQL |

#### Schema Example

```typescript
// packages/db/src/schema/users.ts
import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Type inference for insert/select
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
```

### Testing

| Technology | Why AI-Friendly |
|------------|-----------------|
| **[Vitest](https://vitest.dev)** | Jest-compatible API (familiar), fast, native ESM. AI can write tests without config knowledge. |
| **[Testing Library](https://testing-library.com)** | User-centric queries. AI writes tests that match how users interact. |
| **[MSW](https://mswjs.io)** | Mock at network level. Tests work with real fetch calls. No mocking implementation details. |
| **[Playwright](https://playwright.dev)** | E2E with auto-waiting. AI writes selectors, Playwright handles timing. |

### Development Tools

| Technology | Purpose |
|------------|---------|
| **[Biome](https://biomejs.dev)** | Fast linter + formatter (can replace ESLint + Prettier). Single config. |
| **[Changesets](https://github.com/changesets/changesets)** | Version management for monorepo packages |
| **[GitHub Actions](https://github.com/features/actions)** | CI/CD with excellent monorepo support |

---

## Project Structure

```
project-template/
├── apps/
│   ├── api/                    # Hono API server
│   │   ├── src/
│   │   │   ├── routes/         # Route handlers
│   │   │   ├── middleware/     # Auth, logging, etc.
│   │   │   ├── services/       # Business logic
│   │   │   └── index.ts        # App entry
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── web/                    # Next.js web app
│   │   ├── app/                # App router pages
│   │   ├── components/         # App-specific components
│   │   ├── hooks/              # App-specific hooks
│   │   ├── lib/                # App utilities
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── mobile/                 # Expo React Native app
│       ├── app/                # Expo Router pages
│       ├── components/         # App-specific components
│       ├── hooks/              # App-specific hooks
│       ├── lib/                # App utilities
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── contracts/              # Shared API contracts
│   │   ├── src/
│   │   │   ├── schemas/        # Zod schemas
│   │   │   ├── api/            # ts-rest contracts
│   │   │   ├── client.ts       # Type-safe API client
│   │   │   └── index.ts        # Public exports
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── db/                     # Database package
│   │   ├── src/
│   │   │   ├── schema/         # Drizzle schema files
│   │   │   ├── migrations/     # Generated migrations
│   │   │   ├── seed.ts         # Seed data
│   │   │   └── index.ts        # DB client export
│   │   ├── drizzle.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── ui/                     # Shared UI components (web)
│   │   ├── src/
│   │   │   ├── components/     # shadcn/ui components
│   │   │   ├── hooks/          # Shared hooks
│   │   │   └── lib/            # Utilities (cn, etc.)
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── ui-native/              # Shared UI components (mobile)
│   │   ├── src/
│   │   │   ├── components/     # React Native components
│   │   │   └── lib/            # Native utilities
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── utils/                  # Shared utilities
│   │   ├── src/
│   │   │   ├── date.ts         # Date formatting
│   │   │   ├── string.ts       # String helpers
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── eslint-config/          # Shared ESLint config
│   └── typescript-config/      # Shared TS configs
│
├── tooling/                    # Build/dev tooling
│   └── scripts/                # Utility scripts
│
├── turbo.json                  # Turborepo config
├── pnpm-workspace.yaml         # Workspace definition
├── package.json                # Root package.json
└── .github/
    └── workflows/              # CI/CD pipelines
```

---

## Implementation Roadmap

### Phase 1: Foundation

1. **Create `packages/contracts`**
   - Set up Zod schemas for core entities
   - Define ts-rest API contracts
   - Export TypeScript types

2. **Create `packages/db`**
   - Set up Drizzle with PostgreSQL
   - Define schema matching contracts
   - Generate initial migrations

3. **Create `apps/api`**
   - Set up Hono server
   - Implement routes using contracts
   - Add authentication middleware

### Phase 2: Web Integration

4. **Update `apps/web`**
   - Install TanStack Query
   - Create API client from contracts
   - Build initial pages with type-safe data fetching

5. **Enhance `packages/ui`**
   - Add more shadcn/ui components as needed
   - Create form components integrated with Zod

### Phase 3: Mobile

6. **Create `apps/mobile`**
   - Initialize Expo project
   - Set up Expo Router
   - Configure NativeWind

7. **Create `packages/ui-native`**
   - Port essential components from ui package
   - Use React Native Reusables for base components

8. **Integrate mobile with API**
   - Reuse TanStack Query setup
   - Share contracts for type safety

### Phase 4: Polish

9. **Testing**
   - Add Vitest for unit tests
   - Set up MSW for API mocking
   - Add Playwright for E2E

10. **CI/CD**
    - GitHub Actions for PR checks
    - Automated deployments
    - Version management with Changesets

---

## AI Agent Compatibility Notes

### Why These Choices Help AI

1. **Explicit over Implicit**
   - Drizzle shows actual SQL (vs Prisma's abstraction)
   - Hono routes are plain functions (vs NestJS decorators)
   - Zod schemas are readable code (vs JSON Schema)

2. **Colocation**
   - Types live with validation (Zod)
   - Routes live with their handlers (Hono)
   - Components live with their styles (Tailwind)

3. **Minimal Abstraction**
   - No ORMs that generate code (Prisma Client)
   - No decorator magic (NestJS, TypeORM)
   - No CSS-in-JS runtime (styled-components)

4. **Strong Type Inference**
   - AI can hover/inspect types
   - Errors appear at compile time
   - Refactoring is safe

5. **Predictable Patterns**
   - File-based routing (Next.js, Expo Router)
   - Query/Mutation split (TanStack Query)
   - Schema-first validation (Zod)

### Patterns AI Agents Understand Well

```typescript
// Pattern: Contract-driven endpoint
// AI can trace: schema → route → service → db

// 1. Contract (packages/contracts)
export const createPostSchema = z.object({
  title: z.string().min(1),
  content: z.string(),
})

// 2. Route (apps/api)
app.post('/posts', zValidator('json', createPostSchema), async (c) => {
  const data = c.req.valid('json')
  const post = await postService.create(data)
  return c.json(post, 201)
})

// 3. Service (apps/api)
export const postService = {
  create: async (data: CreatePost) => {
    const [post] = await db.insert(posts).values(data).returning()
    return post
  }
}

// 4. Client usage (apps/web, apps/mobile)
const { mutate } = useMutation({
  mutationFn: (data: CreatePost) => api.posts.create(data),
  onSuccess: () => queryClient.invalidateQueries(['posts'])
})
```

### Anti-Patterns to Avoid

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `any` types | AI loses context | Proper types or `unknown` |
| Barrel files | Circular deps, slow builds | Direct imports |
| Global state | Hard to trace data flow | React Query, Zustand |
| Magic strings | No autocomplete | Enums, const objects |
| Inheritance | Complex to reason about | Composition |
| Dynamic imports everywhere | Hard to trace | Explicit imports |

---

## Quick Reference: Package Versions

```json
{
  "dependencies": {
    "hono": "^4.x",
    "@hono/zod-validator": "^0.4.x",
    "drizzle-orm": "^0.36.x",
    "zod": "^3.24.x",
    "@ts-rest/core": "^3.x",
    "@tanstack/react-query": "^5.x",
    "next": "^15.x",
    "expo": "~52.x",
    "expo-router": "~4.x",
    "nativewind": "^4.x"
  },
  "devDependencies": {
    "drizzle-kit": "^0.30.x",
    "turbo": "^2.x",
    "vitest": "^2.x",
    "typescript": "^5.7.x"
  }
}
```

---

## Summary

This architecture prioritizes:

1. **Type Safety**: Contracts flow from API → Frontend → Mobile
2. **AI Readability**: Explicit code over magical abstractions
3. **Developer Experience**: Fast builds, hot reload, great tooling
4. **Scalability**: Clean package boundaries, easy to add features
5. **Maintainability**: Single source of truth for all data shapes

The key insight is that **what's good for AI is good for humans**: explicit code, strong types, predictable patterns, and minimal magic make codebases easier for everyone to understand and modify.
