# Better Auth Implementation Guide

## Installation

```bash
# In the root of your monorepo
pnpm add better-auth -w

# Add to packages/auth
cd packages/auth
pnpm add better-auth drizzle-orm

# Add to apps/api-public
cd apps/api-public
pnpm add better-auth

# Add to web apps
cd apps/web-main
pnpm add better-auth @better-auth/react
```

## 1. Database Setup (packages/db)

First, Better Auth needs database tables. It works seamlessly with Drizzle.

```typescript
// packages/db/src/schema/auth.ts
import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core'

// Better Auth automatically creates these tables, but you can define them
// for better type safety and migrations
export const users = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const sessions = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  userId: text('userId')
    .notNull()
    .references(() => users.id),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
})

export const accounts = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => users.id),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  expiresAt: timestamp('expiresAt'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const verifications = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
})
```

## 2. Auth Package Setup (packages/auth)

### Server Configuration

```typescript
// packages/auth/src/index.ts
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@workspace/db'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),

  // Email & Password authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },

  // Social providers
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

  // API keys for public API
  plugins: [
    {
      id: 'api-key',
      endpoints: {
        createApiKey: {
          method: 'POST',
          path: '/api-key/create',
        },
      },
    },
  ],

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },

  // Trusted origins (your web apps)
  trustedOrigins: [
    process.env.WEB_MAIN_URL || 'http://localhost:3000',
    process.env.WEB_ADMIN_URL || 'http://localhost:3001',
  ],
})

export type Auth = typeof auth
```

### Client Configuration

```typescript
// packages/auth/src/client.ts
import { createAuthClient } from 'better-auth/client'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
})

export type AuthClient = typeof authClient
```

### React Hooks (for Next.js)

```typescript
// packages/auth/src/react.tsx
'use client'

import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
})

export const {
  useSession,
  signIn,
  signOut,
  signUp,
  useActiveOrganization,
} = authClient
```

## 3. Fastify API Integration (apps/api-public)

```typescript
// apps/api-public/src/index.ts
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { auth } from '@workspace/auth'

const fastify = Fastify({
  logger: true,
})

// Enable CORS for your web apps
await fastify.register(cors, {
  origin: [
    'http://localhost:3000', // web-main
    'http://localhost:3002', // web-admin
    process.env.WEB_MAIN_URL,
    process.env.WEB_ADMIN_URL,
  ].filter(Boolean) as string[],
  credentials: true,
})

// Mount Better Auth routes
// This creates all auth endpoints: /api/auth/sign-in, /api/auth/sign-up, etc.
fastify.all('/api/auth/*', async (request, reply) => {
  return auth.handler(request.raw, {
    basePath: '/api/auth',
  })
})

// Protected route example
fastify.get('/api/protected', async (request, reply) => {
  const session = await auth.api.getSession({
    headers: request.headers as any,
  })

  if (!session) {
    return reply.code(401).send({ error: 'Unauthorized' })
  }

  return { message: 'Protected data', user: session.user }
})

// Fastify middleware for protected routes
fastify.decorateRequest('user', null)
fastify.decorateRequest('session', null)

fastify.addHook('preHandler', async (request, reply) => {
  // Skip auth for public routes
  if (request.url.startsWith('/api/auth')) {
    return
  }

  const session = await auth.api.getSession({
    headers: request.raw.headers,
  })

  if (session) {
    request.user = session.user
    request.session = session.session
  }
})

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3001, host: '0.0.0.0' })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
```

### Fastify Plugin Approach (Better Structure)

```typescript
// apps/api-public/src/plugins/auth.ts
import { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import { auth } from '@workspace/auth'

declare module 'fastify' {
  interface FastifyRequest {
    user?: any
    session?: any
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  // Mount Better Auth handler
  fastify.all('/api/auth/*', async (request, reply) => {
    return auth.handler(request.raw)
  })

  // Add session to request
  fastify.decorateRequest('user', null)
  fastify.decorateRequest('session', null)

  fastify.addHook('onRequest', async (request, reply) => {
    if (request.url.startsWith('/api/auth')) {
      return
    }

    try {
      const session = await auth.api.getSession({
        headers: request.headers as any,
      })

      if (session) {
        request.user = session.user
        request.session = session.session
      }
    } catch (error) {
      fastify.log.error(error, 'Session validation failed')
    }
  })
}

export default fp(authPlugin)
```

```typescript
// apps/api-public/src/index.ts
import Fastify from 'fastify'
import authPlugin from './plugins/auth'

const fastify = Fastify({ logger: true })

await fastify.register(authPlugin)

// Protected routes
fastify.get('/api/users/me', async (request, reply) => {
  if (!request.user) {
    return reply.code(401).send({ error: 'Unauthorized' })
  }

  return { user: request.user }
})
```

## 4. Next.js Integration (apps/web-main, apps/web-admin)

### App Router Setup

```typescript
// apps/web-main/app/api/auth/[...all]/route.ts
import { auth } from '@workspace/auth'
import { toNextJsHandler } from 'better-auth/next-js'

export const { GET, POST } = toNextJsHandler(auth)
```

**IMPORTANT**: If you're hosting auth on Fastify, you DON'T need the above route. The Next.js apps will make requests to the Fastify API.

### Client-Side Usage

```typescript
// apps/web-main/app/providers.tsx
'use client'

import { SessionProvider } from '@workspace/auth/react'

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
```

```typescript
// apps/web-main/app/layout.tsx
import { Providers } from './providers'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

### Login Page

```typescript
// apps/web-main/app/auth/login/page.tsx
'use client'

import { useState } from 'react'
import { signIn } from '@workspace/auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signIn.email({
        email,
        password,
        callbackURL: '/dashboard',
      })

      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    await signIn.social({
      provider: 'google',
      callbackURL: '/dashboard',
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 rounded-lg border p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Sign in to your account</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={handleGoogleSignIn}
        >
          Sign in with Google
        </Button>
      </div>
    </div>
  )
}
```

### Protected Pages

```typescript
// apps/web-main/app/dashboard/page.tsx
'use client'

import { useSession, signOut } from '@workspace/auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@workspace/ui/components/button'

export default function DashboardPage() {
  const { data: session, isPending } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (!isPending && !session) {
      router.push('/auth/login')
    }
  }, [session, isPending, router])

  if (isPending) {
    return <div>Loading...</div>
  }

  if (!session) {
    return null
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-4">Welcome, {session.user.name}!</p>
      <p className="text-sm text-muted-foreground">{session.user.email}</p>

      <Button onClick={() => signOut()} className="mt-4">
        Sign out
      </Button>
    </div>
  )
}
```

### Server Components (RSC)

```typescript
// apps/web-main/app/dashboard/server-page.tsx
import { auth } from '@workspace/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function ServerDashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    redirect('/auth/login')
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Server Dashboard</h1>
      <p className="mt-4">Welcome, {session.user.name}!</p>
    </div>
  )
}
```

## 5. Environment Variables

```bash
# .env (root)

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"

# Better Auth
BETTER_AUTH_SECRET="your-secret-key-min-32-chars"
BETTER_AUTH_URL="http://localhost:3001" # Your Fastify API URL

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# App URLs
WEB_MAIN_URL="http://localhost:3000"
WEB_ADMIN_URL="http://localhost:3002"
API_PUBLIC_URL="http://localhost:3001"

# For Next.js apps
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

## 6. Middleware for Route Protection (Next.js)

```typescript
// apps/web-main/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Check if user has session cookie
  const sessionToken = request.cookies.get('better-auth.session_token')

  // Protect /dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!sessionToken) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }

  // Redirect authenticated users away from auth pages
  if (request.nextUrl.pathname.startsWith('/auth')) {
    if (sessionToken) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth/:path*'],
}
```

## 7. API Key Authentication (for Public API)

```typescript
// apps/api-public/src/plugins/api-key-auth.ts
import { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import { db } from '@workspace/db'
import { apiKeys } from '@workspace/db/schema'
import { eq } from 'drizzle-orm'

const apiKeyPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest('apiKey', null)

  fastify.addHook('onRequest', async (request, reply) => {
    // Skip for auth routes
    if (request.url.startsWith('/api/auth')) {
      return
    }

    const apiKey = request.headers['x-api-key'] as string

    if (apiKey) {
      const [key] = await db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.key, apiKey))
        .limit(1)

      if (key && key.expiresAt > new Date()) {
        request.apiKey = key
        request.user = { id: key.userId }
        return
      }
    }
  })
}

export default fp(apiKeyPlugin)
```

## Architecture Decision: Centralized vs Distributed

### Option 1: Centralized Auth (Recommended)

Auth endpoints live in Fastify API, Next.js apps are pure clients:

✅ Single source of truth
✅ Easier to manage sessions
✅ Better for mobile apps (same API)
✅ Consistent auth across all apps

```
Fastify API (3001)
  └── /api/auth/* (Better Auth)

Next.js apps (3000, 3002)
  └── Call API for auth operations
```

### Option 2: Distributed Auth

Each Next.js app has its own auth endpoints:

⚠️ More complex session management
⚠️ Harder to share auth state
✅ Simpler deployment (each app is independent)

## Summary

1. **Database**: Drizzle schema in `packages/db`
2. **Auth Package**: Server + client in `packages/auth`
3. **Fastify API**: Mount Better Auth at `/api/auth/*`
4. **Next.js Apps**: Use React hooks from `@workspace/auth/react`
5. **Environment**: Configure OAuth providers
6. **Protection**: Middleware + useSession checks

The centralized approach with Fastify hosting the auth endpoints is the cleanest for a monorepo with multiple apps.
