# Next Steps: Contract-Based Monorepo Architecture

This document outlines the recommended approach for evolving this repository into a **contract-based monorepo** containing multiple API, Web, and Mobile applications with shared contracts ensuring type safety across all platforms.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Why Contract-Based Development](#why-contract-based-development)
3. [Recommended Tech Stack](#recommended-tech-stack)
4. [Authentication Strategy](#authentication-strategy)
5. [Project Structure](#project-structure)
6. [Implementation Roadmap](#implementation-roadmap)
7. [AI Agent Compatibility Notes](#ai-agent-compatibility-notes)

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              MONOREPO                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                            APPLICATIONS                                 │ │
│  ├─────────────────────────────────────────────────────────────────────────┤ │
│  │                                                                         │ │
│  │  APIs                        Web Apps                Mobile Apps        │ │
│  │  ─────────────────────────   ─────────────────────   ────────────────── │ │
│  │  ┌──────────────────────┐    ┌──────────────────┐    ┌───────────────┐  │ │
│  │  │ apps/api-public      │    │ apps/web-main    │    │ apps/mobile-  │  │ │
│  │  │ (Public API)         │    │ (Main Website)   │    │ customer      │  │ │
│  │  │ - Fastify            │    │ - Next.js        │    │ - Expo        │  │ │
│  │  │ - OpenAPI docs       │    │                  │    │               │  │ │
│  │  └──────────────────────┘    └──────────────────┘    └───────────────┘  │ │
│  │  ┌──────────────────────┐    ┌──────────────────┐    ┌───────────────┐  │ │
│  │  │ apps/api-internal    │    │ apps/web-admin   │    │ apps/mobile-  │  │ │
│  │  │ (Internal Services)  │    │ (Admin Panel)    │    │ admin         │  │ │
│  │  │ - Fastify            │    │ - Next.js        │    │ - Expo        │  │ │
│  │  └──────────────────────┘    └──────────────────┘    └───────────────┘  │ │
│  │  ┌──────────────────────┐    ┌──────────────────┐                       │ │
│  │  │ apps/api-admin       │    │ apps/web-docs    │                       │ │
│  │  │ (Admin API)          │    │ (API Docs Portal)│                       │ │
│  │  │ - Fastify            │    │ - Next.js/Astro  │                       │ │
│  │  └──────────────────────┘    └──────────────────┘                       │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                     packages/contracts (TypeSpec)                       │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────────┐   │ │
│  │  │ public-api/ │  │internal-api/│  │  admin-api/ │  │    shared/    │   │ │
│  │  │   *.tsp     │  │    *.tsp    │  │    *.tsp    │  │ models, enums │   │ │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └───────────────┘   │ │
│  │         │                │                │                              │ │
│  │         ▼                ▼                ▼                              │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐    │ │
│  │  │                    Generated Outputs                            │    │ │
│  │  │  • OpenAPI specs (for docs & external clients)                  │    │ │
│  │  │  • TypeScript types (for internal apps)                         │    │ │
│  │  │  • Zod schemas (for runtime validation)                         │    │ │
│  │  │  • API clients (typed fetch wrappers)                           │    │ │
│  │  └─────────────────────────────────────────────────────────────────┘    │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                         │
│         ┌──────────────────────────┼──────────────────────────┐              │
│         ▼                          ▼                          ▼              │
│  ┌─────────────┐           ┌─────────────┐           ┌─────────────┐        │
│  │packages/db  │           │packages/ui  │           │packages/auth│        │
│  │ (Drizzle)   │           │ (shadcn/ui) │           │(Better Auth)│        │
│  └─────────────┘           └─────────────┘           └─────────────┘        │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Why Contract-Based Development

### Benefits for Multi-App Architecture

1. **Single Source of Truth**: TypeSpec definitions generate everything - docs, types, validators
2. **Public API Ready**: OpenAPI specs auto-generated for external developers
3. **Independent Scaling**: Each API can be deployed separately
4. **Cross-Platform Consistency**: Same contracts for web, mobile, and external consumers
5. **API Versioning**: TypeSpec has built-in versioning support

### Benefits for AI Coding Agents

1. **Explicit Contracts**: AI can read TypeSpec and understand exact API shape
2. **Generated Code**: Less hand-written boilerplate = fewer inconsistencies
3. **Compile-Time Safety**: TypeScript catches mismatches immediately
4. **Predictable Patterns**: Consistent structure across all apps

### Benefits for Teams

1. **Parallel Development**: Teams work against contracts, not implementations
2. **External Developer Experience**: Professional API documentation out of the box
3. **Breaking Change Detection**: TypeSpec compiler catches incompatibilities
4. **Language Agnostic**: Generate clients for any language your consumers need

---

## Recommended Tech Stack

### Decision Matrix: Honest Tradeoffs

| Choice | Selected | Alternative | Why Selected | When to Use Alternative |
|--------|----------|-------------|--------------|------------------------|
| **Contracts** | TypeSpec | Zod + ts-rest | Public APIs need OpenAPI, multi-app needs governance | Small team, single API, TypeScript-only consumers |
| **API Framework** | Fastify | Hono | More mature, better ecosystem, production-proven | Edge deployments, Cloudflare Workers, Bun |
| **Auth** | Better Auth | Clerk, Auth.js | Self-hosted, full control, TypeScript-native | Clerk for fastest setup, Auth.js for existing Next.js |

### Core Technologies

| Layer | Technology | Why |
|-------|------------|-----|
| **Package Manager** | pnpm | Workspace protocol, strict dependencies, fast |
| **Build System** | Turborepo | Task caching, dependency graph, parallel builds |
| **Language** | TypeScript (strict) | Type safety across all apps |
| **Runtime** | Node.js 20+ | LTS, stable, well-documented |

### Contracts: TypeSpec

**[TypeSpec](https://typespec.io)** - Microsoft's API description language

```typespec
// packages/contracts/public-api/main.tsp
import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

@service({
  title: "Public API",
  version: "1.0.0",
})
@server("https://api.example.com", "Production")
namespace PublicAPI;

// Shared model (can import from ../shared/)
model User {
  id: string;
  email: string;
  name: string;
  createdAt: utcDateTime;
}

model CreateUserRequest {
  email: string;
  name: string;
  password: string;
}

model ErrorResponse {
  error: string;
  code: string;
  details?: Record<string>;
}

@route("/users")
@tag("Users")
namespace Users {
  @post
  @summary("Create a new user")
  op create(@body body: CreateUserRequest): {
    @statusCode statusCode: 201;
    @body body: User;
  } | {
    @statusCode statusCode: 400;
    @body body: ErrorResponse;
  };

  @get
  @summary("List users")
  op list(
    @query limit?: int32 = 20,
    @query offset?: int32 = 0,
  ): {
    @statusCode statusCode: 200;
    @body body: {
      data: User[];
      total: int32;
    };
  };

  @get
  @route("/{id}")
  @summary("Get user by ID")
  op get(@path id: string): {
    @statusCode statusCode: 200;
    @body body: User;
  } | {
    @statusCode statusCode: 404;
    @body body: ErrorResponse;
  };
}
```

**Why TypeSpec over Zod + ts-rest:**

| Aspect | TypeSpec | Zod + ts-rest |
|--------|----------|---------------|
| OpenAPI generation | ✅ Native, automatic | ⚠️ Requires extra tooling |
| Multi-language clients | ✅ Generate for any language | ❌ TypeScript only |
| API governance | ✅ Linting, breaking change detection | ⚠️ Manual |
| Learning curve | ⚠️ New DSL to learn | ✅ Just TypeScript |
| AI training data | ⚠️ Less common | ✅ More examples |
| Runtime validation | ⚠️ Generate Zod from TypeSpec | ✅ Native |

**TypeSpec compilation outputs:**

```bash
# Compile TypeSpec to multiple outputs
tsp compile packages/contracts/public-api

# Generates:
# - openapi.yaml          → For Swagger UI, external docs
# - types.ts              → TypeScript interfaces
# - schemas.ts            → Zod schemas (via emitter)
# - client.ts             → Type-safe fetch client
```

### Backend: Fastify

**[Fastify](https://fastify.dev)** - Fast, low overhead web framework

```typescript
// apps/api-public/src/routes/users.ts
import { FastifyPluginAsync } from 'fastify'
import { Type } from '@sinclair/typebox'
import { db } from '@workspace/db'
import { users } from '@workspace/db/schema'
// Generated from TypeSpec
import { CreateUserRequest, User, ErrorResponse } from '@workspace/contracts/public-api'

const usersRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /users
  fastify.post<{
    Body: CreateUserRequest
    Reply: User | ErrorResponse
  }>('/users', {
    schema: {
      body: CreateUserRequestSchema,      // Generated from TypeSpec
      response: {
        201: UserSchema,
        400: ErrorResponseSchema,
      },
    },
  }, async (request, reply) => {
    const { email, name, password } = request.body

    // Check if user exists
    const existing = await db.query.users.findFirst({
      where: eq(users.email, email),
    })

    if (existing) {
      return reply.status(400).send({
        error: 'User already exists',
        code: 'USER_EXISTS',
      })
    }

    const [user] = await db.insert(users).values({
      email,
      name,
      passwordHash: await hash(password),
    }).returning()

    return reply.status(201).send(user)
  })

  // GET /users
  fastify.get<{
    Querystring: { limit?: number; offset?: number }
    Reply: { data: User[]; total: number }
  }>('/users', {
    schema: {
      querystring: Type.Object({
        limit: Type.Optional(Type.Integer({ default: 20, minimum: 1, maximum: 100 })),
        offset: Type.Optional(Type.Integer({ default: 0, minimum: 0 })),
      }),
      response: {
        200: Type.Object({
          data: Type.Array(UserSchema),
          total: Type.Integer(),
        }),
      },
    },
  }, async (request) => {
    const { limit = 20, offset = 0 } = request.query

    const [data, countResult] = await Promise.all([
      db.select().from(users).limit(limit).offset(offset),
      db.select({ count: count() }).from(users),
    ])

    return { data, total: countResult[0].count }
  })
}

export default usersRoutes
```

**Why Fastify over Hono:**

| Aspect | Fastify | Hono |
|--------|---------|------|
| **Production maturity** | ✅ 7+ years, Netflix/Microsoft use it | ⚠️ ~3 years, newer |
| **Plugin ecosystem** | ✅ Huge (auth, rate limit, cache) | ⚠️ Growing |
| **Logging** | ✅ Pino (best in class) | ⚠️ Basic |
| **Validation** | ✅ JSON Schema native | ⚠️ Via middleware |
| **Documentation** | ✅ Extensive | ✅ Good |
| **AI training data** | ✅ More examples | ⚠️ Less |
| **Edge runtime** | ❌ Node.js only | ✅ Cloudflare, Deno, Bun |
| **Bundle size** | ⚠️ Larger | ✅ Tiny |

**When to use Hono instead:**
- Deploying to Cloudflare Workers or Vercel Edge
- Using Bun or Deno runtime
- Need minimal bundle size
- Building serverless functions

### Database: Drizzle ORM

**[Drizzle ORM](https://orm.drizzle.team)** - TypeScript ORM with SQL-like syntax

```typescript
// packages/db/src/schema/users.ts
import { pgTable, uuid, varchar, timestamp, boolean } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }),
  emailVerified: boolean('email_verified').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts), // OAuth accounts
}))
```

**Why Drizzle over Prisma:**

| Aspect | Drizzle | Prisma |
|--------|---------|--------|
| **SQL visibility** | ✅ What you write = what runs | ❌ Abstracted |
| **Bundle size** | ✅ ~50kb | ❌ ~2MB+ engine |
| **Cold starts** | ✅ Fast | ❌ Slow (engine init) |
| **Migrations** | ✅ SQL files, reviewable | ⚠️ Prisma format |
| **Learning curve** | ✅ Know SQL = know Drizzle | ⚠️ Prisma DSL |
| **Edge compatible** | ✅ Yes | ⚠️ Limited |

### Frontend Web: Next.js 15

**[Next.js](https://nextjs.org)** with App Router

```typescript
// apps/web-main/app/users/page.tsx
import { Suspense } from 'react'
import { UserList } from './user-list'
import { UserListSkeleton } from './user-list-skeleton'

export default function UsersPage() {
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Users</h1>
      <Suspense fallback={<UserListSkeleton />}>
        <UserList />
      </Suspense>
    </div>
  )
}

// apps/web-main/app/users/user-list.tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@workspace/contracts/public-api/client'

export function UserList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiClient.users.list({ limit: 20 }),
  })

  if (error) return <div>Error loading users</div>
  if (isLoading) return <UserListSkeleton />

  return (
    <ul className="space-y-2">
      {data.data.map((user) => (
        <li key={user.id} className="p-4 border rounded">
          <p className="font-medium">{user.name}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </li>
      ))}
    </ul>
  )
}
```

### Frontend Mobile: Expo

**[Expo](https://expo.dev)** with Expo Router

```typescript
// apps/mobile-customer/app/(tabs)/users.tsx
import { View, FlatList, Text } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@workspace/contracts/public-api/client'

export default function UsersScreen() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiClient.users.list({ limit: 20 }),
  })

  return (
    <FlatList
      data={data?.data ?? []}
      refreshing={isLoading}
      onRefresh={refetch}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View className="p-4 border-b border-border">
          <Text className="font-medium">{item.name}</Text>
          <Text className="text-sm text-muted-foreground">{item.email}</Text>
        </View>
      )}
    />
  )
}
```

---

## Authentication Strategy

### Recommended: Better Auth

**[Better Auth](https://better-auth.com)** - TypeScript-native authentication

**Why Better Auth:**

| Aspect | Better Auth | Clerk | Auth.js | Lucia |
|--------|-------------|-------|---------|-------|
| **Self-hosted** | ✅ | ❌ Managed | ✅ | ✅ |
| **Cost** | Free | $$$$ at scale | Free | Free |
| **TypeScript** | ✅ Native | ✅ Good | ⚠️ Okay | ✅ Native |
| **Database control** | ✅ Full | ❌ Their DB | ✅ Full | ✅ Full |
| **Social OAuth** | ✅ | ✅ | ✅ | ⚠️ Manual |
| **Email/Password** | ✅ | ✅ | ⚠️ Limited | ✅ |
| **2FA/MFA** | ✅ | ✅ | ❌ | ⚠️ Manual |
| **API Keys** | ✅ | ✅ | ❌ | ❌ |
| **Organizations** | ✅ | ✅ | ❌ | ❌ |
| **Setup complexity** | Medium | Easy | Medium | Hard |

### Auth Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Authentication Flow                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │  Web Apps   │     │ Mobile Apps │     │ Public API  │       │
│  │  (Session)  │     │   (Token)   │     │ (API Keys)  │       │
│  └──────┬──────┘     └──────┬──────┘     └──────┬──────┘       │
│         │                   │                   │               │
│         └───────────────────┼───────────────────┘               │
│                             ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 packages/auth (Better Auth)              │   │
│  │                                                          │   │
│  │  • Email/Password     • OAuth (Google, GitHub, etc.)    │   │
│  │  • Magic Links        • API Key Management               │   │
│  │  • 2FA/TOTP          • Session Management                │   │
│  │  • Organizations     • Role-Based Access Control         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                             │                                   │
│                             ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              packages/db (Auth Tables)                   │   │
│  │                                                          │   │
│  │  • users            • sessions        • accounts        │   │
│  │  • api_keys         • organizations   • memberships     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Auth Implementation

```typescript
// packages/auth/src/index.ts
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@workspace/db'
import { users, sessions, accounts } from '@workspace/db/schema'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: { users, sessions, accounts },
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },

  // For public API
  apiKeys: {
    enabled: true,
    prefix: 'pk_', // public key prefix
  },

  // For multi-tenant apps
  organizations: {
    enabled: true,
    roles: ['owner', 'admin', 'member'],
  },

  // 2FA
  twoFactor: {
    enabled: true,
    issuer: 'YourApp',
  },
})

export type Auth = typeof auth
```

```typescript
// packages/auth/src/client.ts (for web/mobile)
import { createAuthClient } from 'better-auth/client'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
})
```

```typescript
// apps/api-public/src/middleware/auth.ts
import { FastifyPluginAsync } from 'fastify'
import { auth } from '@workspace/auth'

export const authMiddleware: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest('user', null)
  fastify.decorateRequest('session', null)

  fastify.addHook('onRequest', async (request, reply) => {
    // Check for API key first (public API)
    const apiKey = request.headers['x-api-key']
    if (apiKey) {
      const result = await auth.api.validateApiKey(apiKey)
      if (result) {
        request.user = result.user
        request.apiKey = result.apiKey
        return
      }
    }

    // Check for session (web apps)
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (session) {
      request.user = session.user
      request.session = session.session
    }
  })
}

// Protected route example
fastify.get('/me', {
  preHandler: [requireAuth], // Custom guard
}, async (request) => {
  return request.user
})
```

```typescript
// apps/web-main/app/auth/login/page.tsx
'use client'

import { useState } from 'react'
import { authClient } from '@workspace/auth/client'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await authClient.signIn.email({
      email,
      password,
    })

    if (error) {
      // Handle error
    } else {
      // Redirect to dashboard
    }

    setLoading(false)
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <Input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button type="submit" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign In'}
      </Button>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => authClient.signIn.social({ provider: 'google' })}
        >
          Google
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => authClient.signIn.social({ provider: 'github' })}
        >
          GitHub
        </Button>
      </div>
    </form>
  )
}
```

### Public API Authentication

For external developers consuming your public API:

```typescript
// API Key management endpoint
// apps/api-public/src/routes/api-keys.ts

fastify.post('/api-keys', {
  preHandler: [requireAuth],
}, async (request) => {
  const apiKey = await auth.api.createApiKey({
    userId: request.user.id,
    name: request.body.name,
    expiresAt: request.body.expiresAt, // Optional
    scopes: request.body.scopes, // ['read:users', 'write:users']
  })

  // Only show the full key once!
  return {
    id: apiKey.id,
    key: apiKey.key, // pk_live_xxxxx - only shown once
    name: apiKey.name,
    createdAt: apiKey.createdAt,
  }
})
```

External developers use:
```bash
curl -H "X-API-Key: pk_live_xxxxx" https://api.example.com/users
```

### When to Use Alternatives

| Scenario | Recommendation |
|----------|----------------|
| **Fastest time to market** | Clerk - managed, works out of box |
| **Existing Next.js app** | Auth.js - tight integration |
| **Just need sessions** | Lucia - lightweight, flexible |
| **Enterprise SSO (SAML)** | WorkOS or Clerk |
| **Full control, self-hosted** | Better Auth ✅ |

---

## Project Structure

```
project-template/
├── apps/
│   │
│   │  # ===== API APPLICATIONS =====
│   ├── api-public/                 # Public API (external developers)
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── users.ts
│   │   │   │   ├── products.ts
│   │   │   │   └── webhooks.ts
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts         # API key + session auth
│   │   │   │   ├── rate-limit.ts
│   │   │   │   └── logging.ts
│   │   │   ├── plugins/
│   │   │   │   └── swagger.ts      # OpenAPI UI
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── api-internal/               # Internal services API
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── middleware/
│   │   │   ├── jobs/               # Background jobs
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── api-admin/                  # Admin-only API
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── middleware/
│   │   │   │   └── admin-only.ts   # Role check
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   │  # ===== WEB APPLICATIONS =====
│   ├── web-main/                   # Main customer website
│   │   ├── app/
│   │   │   ├── (marketing)/        # Public pages
│   │   │   ├── (dashboard)/        # Authenticated pages
│   │   │   ├── auth/               # Auth pages
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   ├── lib/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── web-admin/                  # Admin dashboard
│   │   ├── app/
│   │   ├── components/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── web-docs/                   # API documentation portal
│   │   ├── app/                    # Or use Astro/Mintlify
│   │   ├── content/                # MDX documentation
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   │  # ===== MOBILE APPLICATIONS =====
│   ├── mobile-customer/            # Customer mobile app
│   │   ├── app/                    # Expo Router
│   │   │   ├── (tabs)/
│   │   │   ├── auth/
│   │   │   └── _layout.tsx
│   │   ├── components/
│   │   ├── lib/
│   │   ├── app.json
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── mobile-admin/               # Admin mobile app (if needed)
│       ├── app/
│       ├── components/
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   │
│   │  # ===== CONTRACTS (TypeSpec) =====
│   ├── contracts/
│   │   ├── public-api/             # Public API contracts
│   │   │   ├── main.tsp
│   │   │   ├── users.tsp
│   │   │   ├── products.tsp
│   │   │   └── tspconfig.yaml
│   │   ├── internal-api/           # Internal API contracts
│   │   │   ├── main.tsp
│   │   │   └── tspconfig.yaml
│   │   ├── admin-api/              # Admin API contracts
│   │   │   ├── main.tsp
│   │   │   └── tspconfig.yaml
│   │   ├── shared/                 # Shared models across APIs
│   │   │   ├── models.tsp
│   │   │   └── enums.tsp
│   │   ├── generated/              # Generated outputs
│   │   │   ├── public-api/
│   │   │   │   ├── openapi.yaml
│   │   │   │   ├── types.ts
│   │   │   │   ├── schemas.ts      # Zod schemas
│   │   │   │   └── client.ts       # API client
│   │   │   ├── internal-api/
│   │   │   └── admin-api/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   │  # ===== DATABASE =====
│   ├── db/
│   │   ├── src/
│   │   │   ├── schema/
│   │   │   │   ├── users.ts
│   │   │   │   ├── products.ts
│   │   │   │   ├── auth.ts         # Auth tables
│   │   │   │   └── index.ts
│   │   │   ├── migrations/
│   │   │   ├── seed.ts
│   │   │   └── index.ts            # DB client
│   │   ├── drizzle.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   │  # ===== AUTHENTICATION =====
│   ├── auth/
│   │   ├── src/
│   │   │   ├── index.ts            # Better Auth config
│   │   │   ├── client.ts           # Client for web/mobile
│   │   │   └── middleware.ts       # Fastify middleware
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   │  # ===== UI COMPONENTS =====
│   ├── ui/                         # Web UI (shadcn/ui)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── button.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   └── ...
│   │   │   ├── hooks/
│   │   │   └── lib/
│   │   │       └── utils.ts        # cn() helper
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── ui-native/                  # Mobile UI (NativeWind)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── button.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   └── ...
│   │   │   └── lib/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   │  # ===== SHARED UTILITIES =====
│   ├── utils/
│   │   ├── src/
│   │   │   ├── date.ts
│   │   │   ├── string.ts
│   │   │   ├── validation.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   │  # ===== CONFIG PACKAGES =====
│   ├── eslint-config/
│   │   ├── base.js
│   │   ├── next.js
│   │   ├── react-native.js
│   │   └── package.json
│   │
│   └── typescript-config/
│       ├── base.json
│       ├── nextjs.json
│       ├── react-native.json
│       └── package.json
│
├── tooling/
│   └── scripts/
│       ├── generate-contracts.ts   # TypeSpec compilation
│       └── db-migrate.ts
│
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── .github/
    └── workflows/
        ├── ci.yml                  # Test, lint, typecheck
        ├── deploy-api.yml          # Deploy APIs
        ├── deploy-web.yml          # Deploy web apps
        └── eas-build.yml           # Mobile builds
```

---

## Implementation Roadmap

### Phase 1: Foundation

1. **Set up TypeSpec contracts**
   - Install TypeSpec CLI and VS Code extension
   - Define shared models in `packages/contracts/shared/`
   - Create public API contract in `packages/contracts/public-api/`
   - Configure TypeSpec to generate TypeScript + Zod + OpenAPI

2. **Set up database**
   - Configure Drizzle with PostgreSQL
   - Define core schemas (users, etc.)
   - Set up migrations workflow

3. **Set up authentication**
   - Install Better Auth
   - Configure email/password + OAuth providers
   - Set up API key management for public API
   - Create auth middleware for Fastify

4. **Create first API**
   - Set up `apps/api-public` with Fastify
   - Implement routes using generated types from TypeSpec
   - Add Swagger UI for API documentation
   - Deploy to staging

### Phase 2: Web Applications

5. **Update main web app**
   - Configure TanStack Query
   - Integrate generated API client from TypeSpec
   - Implement auth flows (login, register, OAuth)
   - Build core pages

6. **Create admin web app**
   - Set up `apps/web-admin`
   - Implement admin-only routes
   - Role-based access control

7. **Create docs portal**
   - Set up `apps/web-docs` (or use Mintlify/ReadMe)
   - Import OpenAPI spec from TypeSpec
   - Add getting started guides

### Phase 3: Mobile Applications

8. **Create customer mobile app**
   - Initialize Expo project
   - Set up Expo Router
   - Configure NativeWind
   - Implement auth flows
   - Share TanStack Query setup with web

9. **Create admin mobile app** (if needed)
   - Similar setup to customer app
   - Admin-specific features

### Phase 4: Additional APIs & Polish

10. **Create internal API**
    - Set up `apps/api-internal`
    - Background jobs, webhooks, etc.

11. **Create admin API**
    - Set up `apps/api-admin`
    - Admin-only endpoints

12. **Testing & CI/CD**
    - Vitest for unit tests
    - Playwright for E2E
    - GitHub Actions workflows
    - EAS Build for mobile

---

## AI Agent Compatibility Notes

### TypeSpec vs Zod: AI Perspective

**TypeSpec advantages for AI:**
- Declarative, high-level API design
- Clear structure for complex APIs
- Generates multiple outputs from single source

**TypeSpec challenges for AI:**
- Less training data (newer)
- DSL syntax differs from TypeScript
- Compilation step adds indirection

**Mitigation:**
- Keep TypeSpec files simple and well-commented
- Generated TypeScript is what AI will work with most
- AI can still understand TypeSpec after seeing examples

### Fastify Patterns AI Understands Well

```typescript
// Pattern: Route with full type safety
// AI can trace: schema → handler → response

fastify.post<{
  Body: CreateUserRequest    // Input type
  Reply: User | ErrorResponse // Output type
}>('/users', {
  schema: {
    body: CreateUserRequestSchema,
    response: {
      201: UserSchema,
      400: ErrorResponseSchema,
    },
  },
}, async (request, reply) => {
  // request.body is fully typed
  // return type is enforced
})
```

### File Organization for AI Navigation

```
Good: Flat, explicit files
├── routes/
│   ├── users.ts        # All user routes
│   ├── products.ts     # All product routes
│   └── orders.ts       # All order routes

Bad: Deep nesting
├── routes/
│   ├── users/
│   │   ├── index.ts
│   │   ├── create.ts
│   │   ├── update.ts
│   │   └── delete.ts
```

### Anti-Patterns to Avoid

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `any` types | AI loses context | Proper types from contracts |
| Barrel files (`index.ts` re-exports) | Circular deps, hard to trace | Direct imports |
| Magic strings | No autocomplete | Generated enums from TypeSpec |
| Runtime type checking only | Errors too late | TypeSpec + generated Zod |
| Shared mutable state | Race conditions | Request-scoped data |

---

## Quick Reference: Package Versions

```json
{
  "dependencies": {
    "@typespec/compiler": "^0.62.x",
    "@typespec/http": "^0.62.x",
    "@typespec/openapi3": "^0.62.x",
    "fastify": "^5.x",
    "@fastify/swagger": "^9.x",
    "@fastify/swagger-ui": "^5.x",
    "drizzle-orm": "^0.36.x",
    "better-auth": "^1.x",
    "zod": "^3.24.x",
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

1. **Public API Ready**: TypeSpec generates OpenAPI for external developers
2. **Multi-App Scale**: Clear separation of APIs, web apps, and mobile apps
3. **Type Safety**: Contracts flow from TypeSpec → TypeScript → all apps
4. **Authentication**: Better Auth provides full control with modern features
5. **AI Readability**: Explicit patterns, strong types, predictable structure

**Key decisions:**
- **TypeSpec** over Zod+ts-rest for public API documentation needs
- **Fastify** over Hono for production maturity and ecosystem
- **Better Auth** over Clerk for self-hosted control and cost
- **Drizzle** over Prisma for SQL transparency and edge compatibility

The architecture is designed to scale from startup to enterprise while remaining maintainable and AI-agent friendly.
