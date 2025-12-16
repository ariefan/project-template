# Shared Auth UI Components

## 1. Create Shared Components in `packages/ui`

### Login Form Component

```typescript
// packages/ui/src/components/auth/login-form.tsx
'use client'

import { useState } from 'react'
import { signIn } from '@workspace/auth/react'
import { Button } from '../button'
import { Input } from '../input'
import { Label } from '../label'

interface LoginFormProps {
  callbackURL?: string
  onSuccess?: () => void
  onError?: (error: string) => void
}

export function LoginForm({
  callbackURL = '/dashboard',
  onSuccess,
  onError
}: LoginFormProps) {
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
        callbackURL,
      })

      onSuccess?.()
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to sign in'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
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
          placeholder="you@example.com"
          required
          autoComplete="email"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          autoComplete="current-password"
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign in'}
      </Button>
    </form>
  )
}
```

### Signup Form Component

```typescript
// packages/ui/src/components/auth/signup-form.tsx
'use client'

import { useState } from 'react'
import { signUp } from '@workspace/auth/react'
import { Button } from '../button'
import { Input } from '../input'
import { Label } from '../label'

interface SignupFormProps {
  callbackURL?: string
  onSuccess?: () => void
  onError?: (error: string) => void
}

export function SignupForm({
  callbackURL = '/dashboard',
  onSuccess,
  onError
}: SignupFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    try {
      await signUp.email({
        email,
        password,
        name,
        callbackURL,
      })

      onSuccess?.()
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create account'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="John Doe"
          required
          autoComplete="name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          autoComplete="email"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          autoComplete="new-password"
          minLength={8}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          required
          autoComplete="new-password"
          minLength={8}
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Creating account...' : 'Create account'}
      </Button>
    </form>
  )
}
```

### OAuth Buttons Component

```typescript
// packages/ui/src/components/auth/oauth-buttons.tsx
'use client'

import { signIn } from '@workspace/auth/react'
import { Button } from '../button'

interface OAuthButtonsProps {
  callbackURL?: string
}

export function OAuthButtons({ callbackURL = '/dashboard' }: OAuthButtonsProps) {
  const handleGoogleSignIn = async () => {
    await signIn.social({
      provider: 'google',
      callbackURL,
    })
  }

  const handleGitHubSignIn = async () => {
    await signIn.social({
      provider: 'github',
      callbackURL,
    })
  }

  return (
    <div className="space-y-3">
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
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogleSignIn}
      >
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Sign in with Google
      </Button>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGitHubSignIn}
      >
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
        </svg>
        Sign in with GitHub
      </Button>
    </div>
  )
}
```

### Auth Layout Component

```typescript
// packages/ui/src/components/auth/auth-layout.tsx
import { ReactNode } from 'react'

interface AuthLayoutProps {
  children: ReactNode
  title: string
  subtitle?: string
  logo?: ReactNode
}

export function AuthLayout({ children, title, subtitle, logo }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        {logo && (
          <div className="flex justify-center">
            {logo}
          </div>
        )}

        {/* Header */}
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-2 text-sm text-gray-600">
              {subtitle}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="rounded-lg border bg-white p-8 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  )
}
```

### Export Everything

```typescript
// packages/ui/src/components/auth/index.ts
export { LoginForm } from './login-form'
export { SignupForm } from './signup-form'
export { OAuthButtons } from './oauth-buttons'
export { AuthLayout } from './auth-layout'
```

```typescript
// packages/ui/src/index.ts
// ... other exports
export * from './components/auth'
```

## 2. Use Shared Components in Next.js Apps

### In `apps/web-main`

```typescript
// apps/web-main/app/auth/login/page.tsx
'use client'

import { LoginForm, OAuthButtons, AuthLayout } from '@workspace/ui'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()

  return (
    <AuthLayout
      title="Sign in to Main App"
      subtitle="Welcome back!"
    >
      <LoginForm
        callbackURL="/dashboard"
        onSuccess={() => router.push('/dashboard')}
      />

      <OAuthButtons callbackURL="/dashboard" />

      <p className="mt-4 text-center text-sm text-gray-600">
        Don't have an account?{' '}
        <Link href="/auth/signup" className="font-medium text-blue-600 hover:text-blue-500">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  )
}
```

```typescript
// apps/web-main/app/auth/signup/page.tsx
'use client'

import { SignupForm, OAuthButtons, AuthLayout } from '@workspace/ui'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const router = useRouter()

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Get started with Main App"
    >
      <SignupForm
        callbackURL="/dashboard"
        onSuccess={() => router.push('/dashboard')}
      />

      <OAuthButtons callbackURL="/dashboard" />

      <p className="mt-4 text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
```

### In `apps/web-admin`

```typescript
// apps/web-admin/app/auth/login/page.tsx
'use client'

import { LoginForm, AuthLayout } from '@workspace/ui'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()

  return (
    <AuthLayout
      title="Admin Portal"
      subtitle="Sign in to access the admin dashboard"
    >
      <LoginForm
        callbackURL="/admin/dashboard"
        onSuccess={() => router.push('/admin/dashboard')}
      />

      {/* Admin might not have OAuth, or different providers */}
      <p className="mt-4 text-center text-xs text-gray-500">
        Admin accounts only
      </p>
    </AuthLayout>
  )
}
```

## 3. Optional: Per-App Customization

### Custom Branding

```typescript
// apps/web-main/components/logo.tsx
export function Logo() {
  return (
    <svg className="h-12 w-12 text-blue-600" viewBox="0 0 24 24">
      {/* Your main app logo */}
    </svg>
  )
}
```

```typescript
// apps/web-main/app/auth/login/page.tsx
import { Logo } from '@/components/logo'

<AuthLayout
  title="Sign in"
  logo={<Logo />}
>
  <LoginForm />
</AuthLayout>
```

### Custom Styles/Theme

```typescript
// apps/web-admin/app/auth/login/page.tsx
<AuthLayout
  title="Admin Portal"
  subtitle="Sign in to access the admin dashboard"
>
  <div className="border-l-4 border-red-600 p-4 mb-4 bg-red-50">
    <p className="text-sm text-red-800">
      This is a restricted admin area.
    </p>
  </div>

  <LoginForm callbackURL="/admin/dashboard" />
</AuthLayout>
```

## Summary

### ✅ What's Shared:
- **LoginForm** component - used everywhere
- **SignupForm** component - used everywhere
- **OAuthButtons** component - used where needed
- **AuthLayout** component - consistent structure
- All shadcn/ui components (Button, Input, etc.)

### 🎨 What's Different Per App:
- **Page routes** - `/auth/login` in each app
- **Callback URLs** - `/dashboard` vs `/admin/dashboard`
- **Branding** - Logo, colors (via props)
- **Features** - Some apps might not have signup/OAuth
- **Text/Copy** - "Main App" vs "Admin Portal"

### Benefits:
1. **Write once, use everywhere** - DRY principle
2. **Consistent UX** - Same auth experience
3. **Easy updates** - Fix a bug in one place
4. **Type-safe** - Shared TypeScript components
5. **AI-friendly** - Code is in `packages/ui`, visible to AI

This is the **monorepo advantage**! You build components once and reuse them across all apps with customization via props.
