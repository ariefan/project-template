# Next Steps: Contract-Based Monorepo Architecture

This document outlines the recommended approach for evolving this repository into a **contract-based monorepo** containing multiple API, Web, and Mobile applications.

## Table of Contents

1. [AI-Friendliness Criteria](#ai-friendliness-criteria)
2. [Architecture Overview](#architecture-overview)
3. [Tech Stack Options](#tech-stack-options)
4. [UI Components](#ui-components)
5. [Authentication Strategy](#authentication-strategy)
6. [Project Structure](#project-structure)
7. [Implementation Roadmap](#implementation-roadmap)

---

## AI-Friendliness Criteria

Before diving into tech choices, here's what makes a technology **AI-agent friendly**:

### The 7 Principles

| Principle | Description | Example |
|-----------|-------------|---------|
| **1. Explicit over Implicit** | Code that shows what it does, no hidden behavior | Drizzle SQL vs Prisma abstraction |
| **2. Types Everywhere** | Strong TypeScript types AI can inspect | Zod schemas with inference |
| **3. Predictable Patterns** | Consistent file structure and conventions | File-based routing |
| **4. Minimal Abstraction** | Few layers between code and execution | Direct SQL vs ORM magic |
| **5. Copy-Paste over Config** | Code you own vs opaque dependencies | shadcn/ui vs Chakra UI |
| **6. Composition over Inheritance** | Small pieces that combine | React hooks vs class components |
| **7. Good Documentation** | More docs = more AI training data | Popular libraries win |

### How This Affects Choices

```
AI-Friendly Spectrum:

MORE AI-FRIENDLY                                    LESS AI-FRIENDLY
←───────────────────────────────────────────────────────────────────→

Drizzle (SQL-like)                                  Prisma (DSL)
Fastify (explicit)                                  NestJS (decorators)
Zod (TypeScript)                                    JSON Schema (separate)
shadcn/ui (copy-paste)                              MUI (opaque library)
Tailwind (utilities)                                CSS-in-JS (runtime)
Expo Router (file-based)                            React Navigation (config)
```

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
│  │  ───────────────────────     ───────────────────     ────────────────── │ │
│  │  ┌────────────────────┐      ┌─────────────────┐     ┌───────────────┐  │ │
│  │  │ apps/api-public    │      │ apps/web-main   │     │ apps/mobile-  │  │ │
│  │  │ (Public API)       │      │ (Main Website)  │     │ customer      │  │ │
│  │  └────────────────────┘      └─────────────────┘     └───────────────┘  │ │
│  │  ┌────────────────────┐      ┌─────────────────┐     ┌───────────────┐  │ │
│  │  │ apps/api-internal  │      │ apps/web-admin  │     │ apps/mobile-  │  │ │
│  │  │ (Internal API)     │      │ (Admin Panel)   │     │ admin         │  │ │
│  │  └────────────────────┘      └─────────────────┘     └───────────────┘  │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                       │
│                                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                       SHARED PACKAGES                                   │ │
│  │                                                                         │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │ │
│  │  │ contracts   │ │     db      │ │     ui      │ │  ui-native  │       │ │
│  │  │ (API specs) │ │  (Drizzle)  │ │ (shadcn/ui) │ │ (RN comps)  │       │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                       │ │
│  │  │    auth     │ │    utils    │ │   config    │                       │ │
│  │  │(Better Auth)│ │  (shared)   │ │ (ts/eslint) │                       │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘                       │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack Options

I'm presenting **two valid paths**. Neither is wrong—choose based on your constraints.

### Option A: Conservative Stack (Battle-Tested)

Best for: Risk-averse teams, enterprise, proven production needs

| Layer | Technology | AI-Friendly? | Notes |
|-------|------------|--------------|-------|
| **Contracts** | TypeSpec | ⭐⭐⭐ | DSL to learn, but generates everything |
| **API** | Fastify | ⭐⭐⭐⭐ | 7+ years, huge ecosystem, more examples |
| **Database** | Drizzle | ⭐⭐⭐⭐⭐ | SQL-like, explicit, no magic |
| **Web** | Next.js 16 | ⭐⭐⭐⭐⭐ | Massive training data, predictable |
| **Mobile** | Expo SDK 54 | ⭐⭐⭐⭐ | Managed RN, file-based routing |
| **Web UI** | shadcn/ui | ⭐⭐⭐⭐⭐ | Copy-paste, fully visible code |
| **Mobile UI** | Gluestack UI v2 | ⭐⭐⭐⭐ | Accessible, well-documented |
| **Styling** | Tailwind CSS | ⭐⭐⭐⭐⭐ | Explicit utilities, no runtime |
| **Auth** | Better Auth | ⭐⭐⭐⭐ | TypeScript-native, self-hosted |
| **Data Fetching** | TanStack Query | ⭐⭐⭐⭐⭐ | Explicit cache keys, typed |

### Option B: Modern Stack (Cutting-Edge)

Best for: Smaller teams, edge deployment, latest DX

| Layer | Technology | AI-Friendly? | Notes |
|-------|------------|--------------|-------|
| **Contracts** | Zod + ts-rest | ⭐⭐⭐⭐⭐ | Pure TypeScript, more examples |
| **API** | Hono | ⭐⭐⭐⭐ | Newer but clean, edge-native |
| **Database** | Drizzle | ⭐⭐⭐⭐⭐ | Same as Option A |
| **Web** | Next.js 16 | ⭐⭐⭐⭐⭐ | Same as Option A |
| **Mobile** | Expo SDK 54 | ⭐⭐⭐⭐ | Same as Option A |
| **Web UI** | shadcn/ui | ⭐⭐⭐⭐⭐ | Same as Option A |
| **Mobile UI** | React Native Reusables | ⭐⭐⭐⭐ | shadcn/ui patterns for RN |
| **Styling** | Tailwind + NativeWind | ⭐⭐⭐⭐⭐ | Same classes web & mobile |
| **Auth** | Better Auth | ⭐⭐⭐⭐ | Same as Option A |
| **Data Fetching** | TanStack Query | ⭐⭐⭐⭐⭐ | Same as Option A |

### Decision Guide

| Your Situation | Recommendation |
|----------------|----------------|
| Need public API with OpenAPI docs | **Option A** (TypeSpec) |
| External devs need Python/Go/Java SDKs | **Option A** (TypeSpec) |
| Deploying to Cloudflare Workers/Edge | **Option B** (Hono) |
| Small team, move fast | **Option B** (simpler) |
| Enterprise, risk-averse | **Option A** (proven) |
| Only TypeScript consumers | **Option B** (Zod) |
| Want maximum AI training data | **Option B** (more examples) |

### Detailed Comparison

#### Contracts: TypeSpec vs Zod + ts-rest

**TypeSpec** (Option A):
```typespec
// packages/contracts/public-api/users.tsp
import "@typespec/http";

using TypeSpec.Http;

model User {
  id: string;
  email: string;
  name: string;
  createdAt: utcDateTime;
}

@route("/users")
namespace Users {
  @post op create(@body body: CreateUserRequest): User;
  @get op list(@query limit?: int32 = 20): User[];
  @get @route("/{id}") op get(@path id: string): User | NotFoundError;
}
```

Pros:
- Generates OpenAPI automatically
- Multi-language client generation
- API versioning built-in
- Breaking change detection

Cons:
- New DSL to learn
- Compilation step
- Less AI training data

**Zod + ts-rest** (Option B):
```typescript
// packages/contracts/src/users.ts
import { z } from 'zod'
import { initContract } from '@ts-rest/core'

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  createdAt: z.coerce.date(),
})

export type User = z.infer<typeof userSchema>

const c = initContract()

export const usersContract = c.router({
  create: {
    method: 'POST',
    path: '/users',
    body: z.object({ email: z.string().email(), name: z.string() }),
    responses: { 201: userSchema },
  },
  list: {
    method: 'GET',
    path: '/users',
    query: z.object({ limit: z.number().default(20) }),
    responses: { 200: z.array(userSchema) },
  },
})
```

Pros:
- Pure TypeScript (no new syntax)
- More AI training data
- Runtime validation included
- Simpler mental model

Cons:
- OpenAPI requires extra tooling
- TypeScript-only clients
- Manual versioning

#### API Framework: Fastify vs Hono

**Fastify** (Option A):
```typescript
// apps/api-public/src/routes/users.ts
import { FastifyPluginAsync } from 'fastify'
import { UserSchema, CreateUserSchema } from '@workspace/contracts'

const usersRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: CreateUser; Reply: User }>(
    '/users',
    {
      schema: {
        body: CreateUserSchema,
        response: { 201: UserSchema },
      },
    },
    async (request, reply) => {
      const user = await createUser(request.body)
      return reply.status(201).send(user)
    }
  )
}
```

Pros:
- 7+ years production use
- Netflix, Microsoft use it
- Huge plugin ecosystem
- Pino logging (best in class)

Cons:
- Node.js only
- Larger bundle
- More boilerplate

**Hono** (Option B):
```typescript
// apps/api-public/src/routes/users.ts
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { createUserSchema, userSchema } from '@workspace/contracts'

const app = new Hono()

app.post('/users', zValidator('json', createUserSchema), async (c) => {
  const data = c.req.valid('json')
  const user = await createUser(data)
  return c.json(user, 201)
})
```

Pros:
- Works on edge (Cloudflare, Vercel, Deno, Bun)
- Tiny bundle (~14kb)
- Clean, minimal API
- Web-standard Request/Response

Cons:
- ~3 years old (newer)
- Smaller ecosystem
- Less production data
- Basic logging

---

## UI Components

### Why UI Choice Matters for AI

| Factor | AI Impact |
|--------|-----------|
| **Copy-paste components** | AI can read and modify the actual code |
| **Opaque library components** | AI must guess internals, can't customize easily |
| **Utility CSS (Tailwind)** | AI sees styles inline, no file jumping |
| **CSS-in-JS / CSS Modules** | AI must trace across files |
| **Typed props** | AI knows exactly what's accepted |
| **Good docs/examples** | More training data = better suggestions |

### Web UI: shadcn/ui (Recommended)

**[shadcn/ui](https://ui.shadcn.com)** is the most AI-friendly choice:

```bash
# Add components to your project (copies code, not npm install)
pnpm dlx shadcn@latest add button card input form
```

```typescript
// packages/ui/src/components/button.tsx
// This is YOUR code - you own it, AI can read/modify it
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

**Why AI loves shadcn/ui:**
- Code is in YOUR repo (not node_modules)
- Tailwind classes visible inline
- TypeScript props fully typed
- Small, focused components
- Built on accessible Radix primitives

**Key components to add:**
```bash
# Essential components
pnpm dlx shadcn@latest add button input label card
pnpm dlx shadcn@latest add form select checkbox radio-group
pnpm dlx shadcn@latest add dialog sheet dropdown-menu
pnpm dlx shadcn@latest add table tabs avatar badge
pnpm dlx shadcn@latest add toast sonner
pnpm dlx shadcn@latest add skeleton spinner
```

### Web UI Alternatives Comparison

| Library | AI-Friendly | Customizable | Bundle | Verdict |
|---------|-------------|--------------|--------|---------|
| **shadcn/ui** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 0kb (your code) | **Best choice** |
| **Radix UI** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Small | Good (shadcn uses this) |
| **Headless UI** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Small | Good alternative |
| **Ark UI** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Small | Good, from Chakra team |
| **Chakra UI** | ⭐⭐⭐ | ⭐⭐⭐ | Medium | Opaque, runtime styles |
| **MUI** | ⭐⭐ | ⭐⭐ | Large | Complex, Material-locked |
| **Ant Design** | ⭐⭐ | ⭐⭐ | Large | Heavy, enterprise-focused |

### Mobile UI: Two Options

#### Option A: Gluestack UI v2 (More Complete)

**[Gluestack UI](https://gluestack.io)** - Accessible, production-ready

```bash
npx gluestack-ui init
npx gluestack-ui add button input card
```

```typescript
// apps/mobile-customer/components/login-form.tsx
import { VStack, Button, Input, Text } from '@gluestack-ui/themed'

export function LoginForm() {
  return (
    <VStack space="md" className="p-4">
      <Input>
        <InputField placeholder="Email" keyboardType="email-address" />
      </Input>
      <Input>
        <InputField placeholder="Password" secureTextEntry />
      </Input>
      <Button onPress={handleLogin}>
        <ButtonText>Sign In</ButtonText>
      </Button>
    </VStack>
  )
}
```

Pros:
- More complete component set
- Good accessibility
- Well-documented
- NativeWind v4 compatible

Cons:
- More opinionated
- Slightly larger bundle

#### Option B: React Native Reusables (shadcn-like)

**[React Native Reusables](https://rnr-docs.vercel.app)** - shadcn/ui philosophy for RN

```bash
npx @react-native-reusables/cli add button input card
```

```typescript
// apps/mobile-customer/components/login-form.tsx
import { View } from 'react-native'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Text } from '~/components/ui/text'

export function LoginForm() {
  return (
    <View className="p-4 gap-4">
      <Input placeholder="Email" keyboardType="email-address" />
      <Input placeholder="Password" secureTextEntry />
      <Button onPress={handleLogin}>
        <Text>Sign In</Text>
      </Button>
    </View>
  )
}
```

Pros:
- Same philosophy as shadcn/ui (copy-paste)
- Full code ownership
- NativeWind styling
- Familiar patterns from web

Cons:
- Newer project
- Smaller component set
- You build more yourself

### Mobile UI Comparison

| Library | AI-Friendly | Copy-Paste | Components | NativeWind |
|---------|-------------|------------|------------|------------|
| **RN Reusables** | ⭐⭐⭐⭐⭐ | ✅ | Growing | ✅ Native |
| **Gluestack v2** | ⭐⭐⭐⭐ | ❌ | Complete | ✅ Compatible |
| **Tamagui** | ⭐⭐⭐ | ❌ | Complete | ❌ Own system |
| **RN Paper** | ⭐⭐⭐ | ❌ | Complete | ❌ Material |
| **NativeBase** | ⭐⭐ | ❌ | Complete | ❌ Own system |

### Styling: Tailwind CSS + NativeWind

**Same classes on web and mobile:**

```typescript
// Web (Next.js)
<button className="bg-blue-500 text-white px-4 py-2 rounded-lg">
  Click me
</button>

// Mobile (Expo + NativeWind)
<Pressable className="bg-blue-500 px-4 py-2 rounded-lg">
  <Text className="text-white">Click me</Text>
</Pressable>
```

**Why Tailwind is AI-friendly:**
1. Styles are visible in the same file
2. No CSS file jumping
3. Predictable utility names
4. Excellent documentation
5. AI has massive training data

**Configuration:**
```javascript
// tailwind.config.js (shared)
module.exports = {
  content: [
    './apps/web-*/**/*.{ts,tsx}',
    './apps/mobile-*/**/*.{ts,tsx}',
    './packages/ui/**/*.{ts,tsx}',
    './packages/ui-native/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Your design tokens
        brand: {
          50: '#f0f9ff',
          500: '#3b82f6',
          900: '#1e3a8a',
        },
      },
    },
  },
}
```

### Forms: React Hook Form + Zod

**Shared validation between web and mobile:**

```typescript
// packages/contracts/src/schemas/auth.ts
import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type LoginInput = z.infer<typeof loginSchema>
```

```typescript
// apps/web-main/app/auth/login/page.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, LoginInput } from '@workspace/contracts'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@workspace/ui/components/form'

export default function LoginPage() {
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (data: LoginInput) => {
    // Type-safe data
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="email@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Sign In</Button>
      </form>
    </Form>
  )
}
```

---

## Authentication Strategy

### Recommended: Better Auth

**[Better Auth](https://better-auth.com)** - Self-hosted, TypeScript-native

**Why Better Auth:**

| Feature | Better Auth | Clerk | Auth.js | Lucia |
|---------|-------------|-------|---------|-------|
| Self-hosted | ✅ | ❌ | ✅ | ✅ |
| Cost | Free | $$$$ | Free | Free |
| TypeScript | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Email/Password | ✅ | ✅ | ⚠️ | ✅ |
| OAuth | ✅ | ✅ | ✅ | Manual |
| API Keys | ✅ | ✅ | ❌ | ❌ |
| Organizations | ✅ | ✅ | ❌ | ❌ |
| 2FA/MFA | ✅ | ✅ | ❌ | Manual |
| AI-Friendly | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |

### Auth Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    Authentication Flow                          │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Web Apps ──────► Session (Cookie)                             │
│                                                                 │
│  Mobile Apps ───► Bearer Token                                 │
│                                                                 │
│  Public API ────► API Key (X-API-Key header)                   │
│                                                                 │
│         All routes through: packages/auth (Better Auth)        │
│                              ↓                                  │
│                        packages/db                              │
│                   (users, sessions, api_keys)                   │
└────────────────────────────────────────────────────────────────┘
```

### Implementation

```typescript
// packages/auth/src/index.ts
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@workspace/db'

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),

  emailAndPassword: { enabled: true },

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
  apiKeys: { enabled: true },

  // For multi-tenant
  organizations: { enabled: true },
})
```

```typescript
// packages/auth/src/client.ts
import { createAuthClient } from 'better-auth/client'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
})
```

### When to Use Alternatives

| Situation | Recommendation |
|-----------|----------------|
| Fastest launch | **Clerk** - managed, works immediately |
| Existing Next.js | **Auth.js** - tight integration |
| Maximum control | **Better Auth** - own your data |
| Just sessions | **Lucia** - lightweight |
| Enterprise SSO | **WorkOS** or **Clerk** |

---

## Project Structure

```
project-template/
├── apps/
│   ├── api-public/                 # Public API
│   │   ├── src/
│   │   │   ├── routes/             # Route handlers
│   │   │   ├── middleware/         # Auth, rate-limit, logging
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── api-internal/               # Internal API
│   │   └── ...
│   │
│   ├── web-main/                   # Main website
│   │   ├── app/                    # Next.js App Router
│   │   │   ├── (marketing)/        # Public pages
│   │   │   ├── (dashboard)/        # Auth-required pages
│   │   │   └── auth/               # Login, register, etc.
│   │   ├── components/             # App-specific components
│   │   └── package.json
│   │
│   ├── web-admin/                  # Admin dashboard
│   │   └── ...
│   │
│   ├── mobile-customer/            # Customer mobile app
│   │   ├── app/                    # Expo Router
│   │   ├── components/
│   │   └── package.json
│   │
│   └── mobile-admin/               # Admin mobile app
│       └── ...
│
├── packages/
│   ├── contracts/                  # API contracts
│   │   ├── src/
│   │   │   ├── schemas/            # Zod schemas (shared)
│   │   │   ├── api/                # API route contracts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── db/                         # Database
│   │   ├── src/
│   │   │   ├── schema/             # Drizzle tables
│   │   │   ├── migrations/
│   │   │   └── index.ts            # DB client
│   │   └── package.json
│   │
│   ├── auth/                       # Authentication
│   │   ├── src/
│   │   │   ├── index.ts            # Server config
│   │   │   └── client.ts           # Client for web/mobile
│   │   └── package.json
│   │
│   ├── ui/                         # Web UI (shadcn/ui)
│   │   ├── src/
│   │   │   ├── components/         # Button, Input, Card, etc.
│   │   │   ├── hooks/
│   │   │   └── lib/utils.ts        # cn() helper
│   │   └── package.json
│   │
│   ├── ui-native/                  # Mobile UI
│   │   ├── src/
│   │   │   ├── components/         # RN components
│   │   │   └── lib/
│   │   └── package.json
│   │
│   ├── utils/                      # Shared utilities
│   │   └── ...
│   │
│   ├── eslint-config/              # Shared ESLint (or remove if using Biome)
│   └── typescript-config/          # Shared TSConfig
│
├── templates/                      # PlopJS templates
│   ├── api/                        # API app template
│   ├── web/                        # Web app template
│   ├── mobile/                     # Mobile app template
│   ├── component.tsx.hbs           # Component template
│   └── route.ts.hbs                # API route template
│
├── turbo.json                      # Turborepo config
├── pnpm-workspace.yaml             # Workspace definition
├── plopfile.js                     # Code generators
├── biome.json                      # Linting & formatting
├── lefthook.yml                    # Git hooks
├── Caddyfile                       # Reverse proxy (optional)
└── package.json
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

1. **Set up contracts package**
   - Choose TypeSpec (Option A) or Zod+ts-rest (Option B)
   - Define core schemas (User, etc.)
   - Set up code generation if using TypeSpec

2. **Set up database**
   - Configure Drizzle + PostgreSQL
   - Define schemas
   - Set up migrations

3. **Set up authentication**
   - Install Better Auth
   - Configure providers
   - Set up API key management

4. **Create first API**
   - Set up Fastify (Option A) or Hono (Option B)
   - Implement auth routes
   - Add OpenAPI docs

### Phase 2: Web (Week 3-4)

5. **Set up UI package**
   - Install shadcn/ui components
   - Configure Tailwind
   - Create shared components

6. **Build web-main**
   - Auth pages (login, register)
   - Dashboard layout
   - Core features

7. **Build web-admin** (if needed)
   - Admin-only features
   - Role-based access

### Phase 3: Mobile (Week 5-6)

8. **Set up mobile UI package**
   - Choose Gluestack or RN Reusables
   - Configure NativeWind
   - Port shared components

9. **Build mobile-customer**
   - Auth flows
   - Core features
   - Push notifications

### Phase 4: Polish (Week 7-8)

10. **Testing**
    - Unit tests (Vitest)
    - E2E tests (Playwright)
    - Mobile tests

11. **CI/CD**
    - GitHub Actions
    - Preview deployments
    - EAS Build for mobile

---

## Developer Tooling

### Code Generation: PlopJS

**[PlopJS](https://plopjs.com)** - Micro-generator for consistent scaffolding

```bash
pnpm add -Dw plop
```

```javascript
// plopfile.js
export default function (plop) {
  // Generate new API app
  plop.setGenerator('api', {
    description: 'Create a new API app',
    prompts: [
      { type: 'input', name: 'name', message: 'API name (e.g., "public", "admin")?' },
    ],
    actions: [
      {
        type: 'addMany',
        destination: 'apps/api-{{dashCase name}}',
        templateFiles: 'templates/api/**/*',
        base: 'templates/api',
      },
    ],
  })

  // Generate new web app
  plop.setGenerator('web', {
    description: 'Create a new Next.js web app',
    prompts: [
      { type: 'input', name: 'name', message: 'Web app name (e.g., "main", "admin")?' },
    ],
    actions: [
      {
        type: 'addMany',
        destination: 'apps/web-{{dashCase name}}',
        templateFiles: 'templates/web/**/*',
        base: 'templates/web',
      },
    ],
  })

  // Generate new mobile app
  plop.setGenerator('mobile', {
    description: 'Create a new Expo mobile app',
    prompts: [
      { type: 'input', name: 'name', message: 'Mobile app name (e.g., "customer", "driver")?' },
    ],
    actions: [
      {
        type: 'addMany',
        destination: 'apps/mobile-{{dashCase name}}',
        templateFiles: 'templates/mobile/**/*',
        base: 'templates/mobile',
      },
    ],
  })

  // Generate UI component
  plop.setGenerator('component', {
    description: 'Create a new UI component',
    prompts: [
      { type: 'list', name: 'package', choices: ['ui', 'ui-native'], message: 'Which package?' },
      { type: 'input', name: 'name', message: 'Component name?' },
    ],
    actions: [
      {
        type: 'add',
        path: 'packages/{{package}}/src/components/{{dashCase name}}.tsx',
        templateFile: 'templates/component.tsx.hbs',
      },
    ],
  })

  // Generate API route
  plop.setGenerator('route', {
    description: 'Create a new API route',
    prompts: [
      { type: 'input', name: 'app', message: 'Which API app (e.g., "public", "admin")?' },
      { type: 'input', name: 'name', message: 'Route name (e.g., "users", "products")?' },
    ],
    actions: [
      {
        type: 'add',
        path: 'apps/api-{{dashCase app}}/src/routes/{{dashCase name}}.ts',
        templateFile: 'templates/route.ts.hbs',
      },
    ],
  })
}
```

**Usage:**
```bash
pnpm plop api          # Create new API app
pnpm plop web          # Create new web app
pnpm plop mobile       # Create new mobile app
pnpm plop component    # Create new UI component
pnpm plop route        # Create new API route
```

**Why AI-friendly:**
- Templates are explicit Handlebars (AI understands)
- Enforces consistent patterns across apps
- AI can modify templates to change generated code

### Linting & Formatting: Biome

**[Biome](https://biomejs.dev)** - Fast linter + formatter (replaces ESLint + Prettier)

```bash
pnpm add -Dw @biomejs/biome
```

```json
// biome.json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": {
        "noUnusedImports": "error",
        "noUnusedVariables": "error"
      },
      "style": {
        "noNonNullAssertion": "warn",
        "useConst": "error"
      },
      "suspicious": {
        "noExplicitAny": "warn"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "asNeeded",
      "trailingCommas": "es5"
    }
  },
  "files": {
    "ignore": [
      "node_modules",
      ".next",
      ".expo",
      "dist",
      "build",
      "*.gen.ts"
    ]
  }
}
```

**Scripts:**
```json
// package.json
{
  "scripts": {
    "lint": "biome lint .",
    "format": "biome format --write .",
    "check": "biome check --write .",
    "typecheck": "turbo typecheck"
  }
}
```

**Why Biome over ESLint + Prettier:**

| Aspect | ESLint + Prettier | Biome |
|--------|-------------------|-------|
| Speed | ~10s on large projects | ~100ms |
| Config | 2-5 config files | 1 file |
| Plugins | Need many plugins | Built-in rules |
| AI-friendly | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

### Type Checking: TypeScript Strict

```json
// packages/typescript-config/base.json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "forceConsistentCasingInFileNames": true,
    "exactOptionalPropertyTypes": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "module": "ESNext",
    "target": "ES2022",
    "lib": ["ES2022"]
  }
}
```

**Turbo typecheck:**
```json
// turbo.json
{
  "tasks": {
    "typecheck": {
      "dependsOn": ["^typecheck"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    },
    "build": {
      "dependsOn": ["^build", "typecheck"],
      "outputs": [".next/**", "dist/**"]
    }
  }
}
```

### Reverse Proxy: Caddy

**[Caddy](https://caddyserver.com)** - Modern web server with auto HTTPS

**Required for features needing HTTPS:**

| Feature | Needs Secure Context | Works on localhost? |
|---------|---------------------|---------------------|
| WebRTC (video calls) | ✅ Yes | ✅ Yes |
| Clipboard API | ✅ Yes | ✅ Yes |
| OAuth/SSO | ⚠️ Often | ⚠️ Some providers |
| Mobile testing | ✅ Yes | ❌ No (need real HTTPS) |
| Service Workers | ✅ Yes | ✅ Yes |

**When Caddy is REQUIRED:**
- Video/audio calls (WebRTC)
- Copy to clipboard functionality
- Testing on mobile devices (phone → dev machine)
- OAuth providers that require HTTPS
- Custom local domains (`dev.app.local`)

**For local development (recommended):**
```caddyfile
# Caddyfile.dev
{
  # Generate local certificates automatically
  local_certs
}

# Single domain with path routing
localhost {
  # API routes
  handle_path /api/* {
    reverse_proxy localhost:3001
  }

  # Admin routes
  handle_path /admin/* {
    reverse_proxy localhost:3002
  }

  # Main app (catch-all)
  handle {
    reverse_proxy localhost:3000
  }
}

# Or use subdomains (requires /etc/hosts entries)
# api.localhost {
#   reverse_proxy localhost:3001
# }
```

**For mobile device testing:**
```caddyfile
# Caddyfile.dev
{
  local_certs
}

# Use your machine's local IP
# Add to phone: Settings → Wi-Fi → HTTP Proxy → your-ip:443
192.168.1.100 {
  handle_path /api/* {
    reverse_proxy localhost:3001
  }
  handle {
    reverse_proxy localhost:3000
  }
}
```

**Setup:**
```bash
# Install Caddy
brew install caddy  # macOS
# or: https://caddyserver.com/docs/install

# Trust local certificates (one-time)
caddy trust

# Run in development
caddy run --config Caddyfile.dev
```

**For production:**
```caddyfile
# Caddyfile
{
  email admin@example.com
}

api.example.com {
  reverse_proxy api-public:3001
}

app.example.com {
  reverse_proxy web-main:3000
}

admin.example.com {
  reverse_proxy web-admin:3002
}

# WebSocket support for video calls
meet.example.com {
  reverse_proxy web-meet:3003

  # WebSocket upgrade
  @websockets {
    header Connection *Upgrade*
    header Upgrade websocket
  }
  reverse_proxy @websockets web-meet:3003
}
```

**When NOT to use Caddy:**
- Deploying to Vercel/Cloudflare (they handle SSL)
- Simple apps without HTTPS-required features
- CI/CD testing (use localhost)

### Git Hooks: Lefthook

**[Lefthook](https://github.com/evilmartians/lefthook)** - Fast Git hooks manager

```bash
pnpm add -Dw lefthook
```

```yaml
# lefthook.yml
pre-commit:
  parallel: true
  commands:
    typecheck:
      glob: "*.{ts,tsx}"
      run: pnpm typecheck
    lint:
      glob: "*.{ts,tsx,js,jsx,json}"
      run: pnpm biome check --write {staged_files}
      stage_fixed: true

pre-push:
  commands:
    test:
      run: pnpm test
```

**Why Lefthook over Husky:**
- Faster (written in Go)
- Parallel execution
- Simpler config (YAML)
- No need for lint-staged (built-in)

---

## Quick Reference

### Package Versions

```json
{
  "dependencies": {
    "fastify": "^5.x",
    "hono": "^4.x",
    "drizzle-orm": "^0.45.x",
    "zod": "^4.x",
    "@ts-rest/core": "^3.x",
    "better-auth": "^1.x",
    "@tanstack/react-query": "^5.x",
    "next": "^16.x",
    "expo": "~54.x",
    "nativewind": "^4.x",
    "react-hook-form": "^7.x",
    "@hookform/resolvers": "^3.x"
  },
  "devDependencies": {
    "@biomejs/biome": "^2.x",
    "plop": "^4.x",
    "lefthook": "^2.x",
    "turbo": "^2.x",
    "typescript": "^5.9.x",
    "vitest": "^2.x"
  }
}
```

### AI-Friendly Checklist

Before adding any dependency, ask:

- [ ] Can AI read the source code? (copy-paste > npm install)
- [ ] Are types explicit? (TypeScript > JavaScript)
- [ ] Is behavior predictable? (explicit > magic)
- [ ] Is it well-documented? (more docs = better AI)
- [ ] Does it have examples? (more examples = better AI)
- [ ] Is it composable? (small pieces > monolith)

---

## Final Recommendation

After presenting both options, here's my actual recommendation for your use case (multi-app, public API, AI-friendly):

### The Stack

| Layer | Choice | Why |
|-------|--------|-----|
| **Contracts** | TypeSpec | You need public API → need OpenAPI docs. TypeSpec generates them natively. |
| **API** | Fastify | Multi-app at scale needs mature ecosystem. 7+ years battle-tested. |
| **Database** | Drizzle | Unanimous. SQL-like, no magic, AI understands it perfectly. |
| **Web** | Next.js 16 | App Router, RSC, massive AI training data, best DX. |
| **Mobile** | Expo SDK 54 | Managed RN, file-based routing, OTA updates, best mobile DX. |
| **Web UI** | shadcn/ui | Unanimous. Copy-paste, code in your repo, AI can read/modify. |
| **Mobile UI** | React Native Reusables | Same philosophy as shadcn/ui. AI can read the code. Build what's missing. |
| **Styling** | Tailwind + NativeWind | Same classes on web and mobile. Explicit, no CSS file jumping. |
| **Auth** | Better Auth | Self-hosted, API keys for public API, full control. |
| **Data Fetching** | TanStack Query | Explicit cache keys, typed, works on web and mobile. |
| **Forms** | React Hook Form + Zod | Shared validation schemas across all platforms. |
| **Linting/Formatting** | Biome | Single tool, 100x faster than ESLint+Prettier, simple config. |
| **Type Checking** | TypeScript strict | Maximum type safety, AI understands types. |
| **Code Generation** | PlopJS | Consistent scaffolding, templates AI can read/modify. |
| **Git Hooks** | Lefthook | Fast, parallel, simple YAML config. |
| **Reverse Proxy** | Caddy | Required for WebRTC/clipboard. Auto HTTPS in dev & prod. |

### Why These Choices

```
Your Requirements          →  My Choice
─────────────────────────────────────────────────────
Public API needed          →  TypeSpec (native OpenAPI)
Multiple apps at scale     →  Fastify (proven ecosystem)
AI agent friendly          →  Copy-paste UI (shadcn + RN Reusables)
Self-hosted auth           →  Better Auth
Cross-platform validation  →  Zod schemas in contracts package
```

### The Hard Call: Mobile UI

I chose **React Native Reusables** over Gluestack because:

1. **AI Principle #5**: Copy-paste > npm install
2. **Consistency**: Same pattern as shadcn/ui on web
3. **Visibility**: Code lives in `packages/ui-native/`, AI can read it
4. **Flexibility**: Build missing components with AI assistance

**Tradeoff acknowledged**: Gluestack has more components out of the box. But with AI, you can build what's missing faster than you can fight opaque libraries.

### When to Deviate

| If you... | Then consider... |
|-----------|------------------|
| Deploy to Cloudflare/Edge | Switch API to Hono |
| Only have TypeScript consumers | Switch contracts to Zod + ts-rest |
| Need fastest launch | Switch auth to Clerk |
| Need complete mobile UI NOW | Switch to Gluestack v2 |

---

## Summary

**Final stack:**

```
┌─────────────────────────────────────────────────────────────┐
│                     RECOMMENDED STACK                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Contracts:    TypeSpec → OpenAPI + TypeScript + Zod        │
│  API:          Fastify (Node.js)                            │
│  Database:     Drizzle + PostgreSQL                         │
│  Auth:         Better Auth (self-hosted)                    │
│                                                              │
│  Web:          Next.js 16 + shadcn/ui + Tailwind            │
│  Mobile:       Expo SDK 54 + RN Reusables + NativeWind      │
│                                                              │
│  Data:         TanStack Query (web + mobile)                │
│  Forms:        React Hook Form + Zod                        │
│  Validation:   Zod (shared across all platforms)            │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  Tooling:      Biome (lint/format) + TypeScript strict      │
│  Scaffolding:  PlopJS (code generation)                     │
│  Git Hooks:    Lefthook (pre-commit, pre-push)              │
│  Proxy:        Caddy (dev + prod, required for WebRTC)      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**The key insight:** What makes code AI-friendly also makes it human-friendly—explicit code, strong types, predictable patterns, and minimal magic.

This is my genuine recommendation, not a hedge.
