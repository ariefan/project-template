# SSO Implementation Patterns

## Decision Matrix: Which Approach?

| Factor | Centralized API | Dedicated SSO App |
|--------|----------------|-------------------|
| **Number of apps** | 2-5 | 5+ |
| **Domain structure** | Same domain (*.example.com) | Different domains |
| **Complexity** | Low | Medium |
| **Mobile support** | Native | Via web views |
| **Setup time** | 1-2 days | 3-5 days |
| **Use case** | Standard monorepo | Enterprise/SaaS |
| **Session sharing** | Easy (cookies) | Complex (tokens/redirects) |
| **Branded login** | Embedded | Dedicated portal |
| **Admin features** | API endpoints | Full admin UI |

## Option 1: Centralized Auth API (Current Recommendation)

This is what we've already covered. Perfect for most monorepo setups.

### Structure:
```
apps/
├── api-public/         # Hosts /api/auth/*
├── web-main/          # Uses shared auth components
└── web-admin/         # Uses shared auth components
```

### Session Flow:
```
1. User visits app1.example.com/dashboard
2. Not logged in → redirect to app1.example.com/auth/login
3. Login form calls api.example.com/api/auth/sign-in
4. API sets cookie: .example.com (shared across subdomains)
5. User redirected to app1.example.com/dashboard
6. Session works on app2.example.com automatically!
```

## Option 2: Dedicated SSO Next.js App

Create a dedicated authentication portal.

### Structure:
```
apps/
├── sso/                    # NEW: Dedicated SSO app
│   ├── app/
│   │   ├── login/
│   │   ├── signup/
│   │   ├── profile/
│   │   ├── mfa/
│   │   └── admin/
│   └── package.json
├── api-public/            # Backend for SSO
├── web-main/             # Client app 1
└── web-admin/            # Client app 2
```

### Implementation

#### 1. Create SSO App

```bash
cd apps
pnpm create next-app@latest sso --typescript --tailwind --app --use-pnpm
cd sso
pnpm add @workspace/auth @workspace/ui better-auth
```

#### 2. SSO Login Page

```typescript
// apps/sso/app/login/page.tsx
'use client'

import { LoginForm, OAuthButtons, AuthLayout } from '@workspace/ui'
import { useRouter, useSearchParams } from 'next/navigation'

export default function SSOLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get return URL from query params
  const returnTo = searchParams.get('return_to') || '/'
  const appName = searchParams.get('app_name') || 'our platform'

  const handleSuccess = async () => {
    // Create session token
    const session = await createSSOSession()

    // Redirect back to app with token
    const redirectUrl = new URL(returnTo)
    redirectUrl.searchParams.set('sso_token', session.token)
    window.location.href = redirectUrl.toString()
  }

  return (
    <AuthLayout
      title={`Sign in to ${appName}`}
      subtitle="One account for all your apps"
    >
      <LoginForm onSuccess={handleSuccess} />
      <OAuthButtons />
    </AuthLayout>
  )
}
```

#### 3. Client Apps Redirect to SSO

```typescript
// apps/web-main/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get('session_token')

  // Protected routes
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!sessionToken) {
      // Redirect to SSO app
      const ssoUrl = new URL(process.env.NEXT_PUBLIC_SSO_URL!)
      ssoUrl.pathname = '/login'
      ssoUrl.searchParams.set('return_to', request.url)
      ssoUrl.searchParams.set('app_name', 'Main App')

      return NextResponse.redirect(ssoUrl)
    }
  }

  // Handle SSO callback
  if (request.nextUrl.pathname === '/auth/callback') {
    const ssoToken = request.nextUrl.searchParams.get('sso_token')

    if (ssoToken) {
      // Exchange SSO token for session
      const response = NextResponse.redirect(new URL('/dashboard', request.url))
      response.cookies.set('session_token', ssoToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })
      return response
    }
  }

  return NextResponse.next()
}
```

#### 4. Session Sharing Strategy

**Problem**: Different domains can't share cookies directly.

**Solution**: Token-based session exchange

```typescript
// apps/sso/app/api/session/create/route.ts
import { NextRequest } from 'next/server'
import { auth } from '@workspace/auth'

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })

  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Create a short-lived SSO token
  const ssoToken = await createSSOToken({
    userId: session.user.id,
    expiresIn: 60, // 60 seconds
  })

  return Response.json({ token: ssoToken })
}
```

```typescript
// apps/web-main/app/auth/callback/route.ts
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const ssoToken = req.nextUrl.searchParams.get('sso_token')

  if (!ssoToken) {
    return Response.json({ error: 'Missing token' }, { status: 400 })
  }

  // Exchange SSO token for app session
  const response = await fetch(`${process.env.API_URL}/api/auth/exchange-sso`, {
    method: 'POST',
    body: JSON.stringify({ ssoToken }),
  })

  const { sessionToken } = await response.json()

  // Set session cookie for this app
  const redirect = new Response(null, {
    status: 302,
    headers: {
      Location: '/dashboard',
      'Set-Cookie': `session_token=${sessionToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`,
    },
  })

  return redirect
}
```

#### 5. User Profile Management (SSO App)

```typescript
// apps/sso/app/profile/page.tsx
'use client'

import { useSession } from '@workspace/auth/react'
import { Button } from '@workspace/ui'

export default function ProfilePage() {
  const { data: session } = useSession()

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">Your Profile</h1>

      <div className="mt-8 space-y-4">
        <div>
          <label className="text-sm font-medium">Name</label>
          <p className="text-lg">{session?.user.name}</p>
        </div>

        <div>
          <label className="text-sm font-medium">Email</label>
          <p className="text-lg">{session?.user.email}</p>
        </div>

        <div>
          <label className="text-sm font-medium">Connected Apps</label>
          <ul className="mt-2 space-y-2">
            <li className="flex items-center justify-between rounded border p-3">
              <span>Main App</span>
              <span className="text-sm text-green-600">Active</span>
            </li>
            <li className="flex items-center justify-between rounded border p-3">
              <span>Admin Portal</span>
              <span className="text-sm text-green-600">Active</span>
            </li>
          </ul>
        </div>

        <Button variant="destructive">Sign Out of All Apps</Button>
      </div>
    </div>
  )
}
```

## Option 3: Hybrid Approach (Best of Both)

Use Fastify for auth API + dedicated SSO UI portal.

```
┌─────────────────────────────────────────┐
│  Fastify API (api.example.com)          │
│  └── /api/auth/* (Better Auth backend)  │
└─────────────────────────────────────────┘
              ↑
              │
┌─────────────────────────────────────────┐
│  SSO App (auth.example.com)             │
│  └── Next.js UI portal (calls Fastify)  │
│      ├── Login/Signup pages             │
│      ├── Profile management             │
│      └── Admin features                 │
└─────────────────────────────────────────┘
         ↑              ↑              ↑
         │              │              │
    ┌────────┐    ┌────────┐    ┌────────┐
    │Web Main│    │Web Admin│   │ Mobile │
    └────────┘    └────────┘    └────────┘
```

### Benefits:
- ✅ Clean separation: API logic vs UI
- ✅ SSO app can be purely presentational
- ✅ Fastify handles all auth logic
- ✅ Works for mobile (calls Fastify directly)
- ✅ Web apps can embed auth OR redirect to SSO portal

### Implementation:

```typescript
// apps/sso/app/login/page.tsx
'use client'

import { LoginForm } from '@workspace/ui'

export default function SSOLoginPage() {
  const returnTo = new URLSearchParams(window.location.search).get('return_to')

  return (
    <LoginForm
      // Still calls Fastify API
      callbackURL={returnTo || '/apps'}
      onSuccess={async () => {
        // Session is set by Fastify
        if (returnTo) {
          window.location.href = returnTo
        } else {
          router.push('/apps')
        }
      }}
    />
  )
}
```

```typescript
// apps/sso/app/apps/page.tsx
export default function AppsPortalPage() {
  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="text-3xl font-bold">Your Apps</h1>

      <div className="mt-8 grid grid-cols-2 gap-4">
        <AppCard
          name="Main App"
          url="https://app.example.com"
          icon="🏠"
        />
        <AppCard
          name="Admin Portal"
          url="https://admin.example.com"
          icon="⚙️"
        />
        <AppCard
          name="Analytics"
          url="https://analytics.example.com"
          icon="📊"
        />
      </div>
    </div>
  )
}
```

## My Recommendation

### For Your Monorepo Setup:

**Start with Option 1** (Centralized Auth API):
- Simpler to implement
- Good enough for 2-5 apps
- Same domain cookies work great
- Less moving parts

**Upgrade to Option 3** (Hybrid) when:
- You have 5+ apps
- You want a branded login portal
- You need user management UI
- You want an "apps dashboard"
- Professional SSO experience matters

**Use Option 2** (Pure SSO App) when:
- Building enterprise SaaS
- Each app has different domain
- Need compliance features
- Building the next Okta/Auth0

## Example: When to Build SSO App

### Scenario 1: E-commerce Platform
```
Products:
- Main store (store.example.com)
- Seller dashboard (sellers.example.com)
- Analytics (analytics.example.com)
- Support portal (support.example.com)

Solution: Hybrid approach
- auth.example.com (SSO portal)
- All apps redirect there for login
- Shared session via Fastify API
```

### Scenario 2: Internal Tools (Your Case)
```
Apps:
- Customer app (app.example.com)
- Admin panel (admin.example.com)
- Maybe later: Analytics, CRM, etc.

Solution: Centralized API (current)
- api.example.com/api/auth/*
- Shared auth components
- Can upgrade to SSO portal later
```

## Migration Path

```
Phase 1: Centralized Auth API (Now)
  └── Good for 2-5 apps, same domain

Phase 2: Add SSO Portal (Later, if needed)
  └── Create apps/sso
  └── Redirect to auth.example.com
  └── Keep Fastify as backend
  └── Add app launcher dashboard

Phase 3: Enterprise SSO (Optional)
  └── Add SAML support
  └── Multi-tenant
  └── Advanced admin features
```

## Summary

**Your current approach (Centralized API) is correct for now.**

Consider building a dedicated SSO app when:
- ✅ You reach 5+ apps
- ✅ You want a branded auth experience
- ✅ You need user/admin management UI
- ✅ Apps are on different domains

The beauty of this architecture: **You can upgrade from Option 1 → 3 → 2 without rewriting auth logic**, because Better Auth in Fastify stays the same!
