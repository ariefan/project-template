# Web Application

**Next.js web application with shadcn/ui**

This is the main web application built with [Next.js](https://nextjs.org/) App Router and [@workspace/ui](../../packages/ui/README.md) components.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           apps/web                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Next.js App Router                                                  │
│  ├── app/                    (pages and layouts)                    │
│  ├── components/             (app-specific components)              │
│  └── lib/                    (utilities and API client)             │
│                                                                      │
│  Shared Packages                                                     │
│  ├── @workspace/ui           (shadcn/ui components)                │
│  ├── @workspace/contracts    (API types)                           │
│  └── @workspace/utils        (shared utilities)                    │
│                                                                      │
│  Data Fetching                                                       │
│  ├── TanStack Query          (client-side)                         │
│  └── Server Components       (server-side)                         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# From monorepo root
pnpm dev --filter=web

# Or directly
cd apps/web
pnpm dev
```

App starts at `http://localhost:3000`

## Development Modes

The web app supports two development modes:

### Direct Mode (Default)
Accessible at `http://localhost:3000` with the API at `http://localhost:3001`.

### Caddy Mode (Recommended)
All apps accessible through reverse proxy at `https://localhost`.

**Benefits:**
- Single origin (no CORS issues)
- HTTPS locally (production-like environment)
- Better Auth cookies work seamlessly
- Test service workers and PWA features

**Configuration:**
Update `.env.local` for Caddy mode:
```bash
NEXT_PUBLIC_API_URL=https://localhost
```

See [Local Development Guide](../../docs/local-development.md) for details.

## Project Structure

```
apps/web/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page
│   ├── (auth)/             # Auth pages (login, register)
│   ├── (dashboard)/        # Protected pages
│   └── api/                # API routes (if needed)
│
├── components/
│   ├── providers/          # Context providers
│   ├── layouts/            # Layout components
│   └── [feature]/          # Feature-specific components
│
├── lib/
│   ├── api/                # API client and hooks
│   ├── auth/               # Auth utilities
│   └── utils.ts            # App utilities
│
├── public/                 # Static assets
│
├── next.config.js
├── tailwind.config.ts
├── postcss.config.js
└── package.json
```

## Using UI Components

Import from `@workspace/ui`:

```tsx
import { Button } from "@workspace/ui/components/button";
import { Card, CardHeader, CardContent } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";

export default function Page() {
  return (
    <Card>
      <CardHeader>
        <h1>Welcome</h1>
      </CardHeader>
      <CardContent>
        <Input placeholder="Search..." />
        <Button>Submit</Button>
      </CardContent>
    </Card>
  );
}
```

## Data Fetching

### Server Components (Recommended)

```tsx
// app/posts/page.tsx
import { db, posts } from "@workspace/db";

export default async function PostsPage() {
  const allPosts = await db.select().from(posts);

  return (
    <ul>
      {allPosts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

### Client Components with TanStack Query

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";

export function PostsList() {
  const { data, isLoading } = useQuery({
    queryKey: ["posts"],
    queryFn: () => apiFetch<Post[]>("/api/posts"),
  });

  if (isLoading) return <Skeleton />;

  return (
    <ul>
      {data?.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

## Authentication

Use Better Auth client:

```tsx
"use client";

import { authClient } from "@/lib/auth/client";

export function LoginForm() {
  const handleLogin = async (email: string, password: string) => {
    await authClient.signIn.email({ email, password });
  };

  return (
    <form onSubmit={handleSubmit(handleLogin)}>
      {/* form fields */}
    </form>
  );
}
```

## Port Configuration

Port `3000` is centrally defined in [packages/utils/src/config.ts](../../packages/utils/src/config.ts). To change the web port:
1. Update `PORTS.WEB` in the config file
2. Update `.env.example` files across apps
3. Update `Caddyfile` reverse proxy target

## Environment Variables

See [src/env.ts](src/env.ts) for environment validation schema.

### Direct Mode Configuration

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Caddy Mode Configuration

```bash
# .env.local
NEXT_PUBLIC_API_URL=https://localhost
```

**Key Difference:**
- `NEXT_PUBLIC_API_URL` changes from `http://localhost:3001` to `https://localhost`
- All API requests go through Caddy reverse proxy at `/api/*`

## Adding shadcn/ui Components

```bash
# Add new components
pnpm dlx shadcn@latest add [component] -c apps/web

# Components go to packages/ui/src/components
```

## Scripts

```bash
pnpm dev        # Start development server
pnpm build      # Build for production
pnpm start      # Start production server
pnpm lint       # Lint code
pnpm typecheck  # Type check
```

## Styling

Tailwind CSS with CSS variables for theming:

```tsx
// Use Tailwind classes
<div className="bg-background text-foreground p-4 rounded-lg shadow">
  Content
</div>

// Dark mode (automatic with next-themes)
<div className="bg-white dark:bg-slate-900">
  Themed content
</div>
```

## Dependencies

- `next` - React framework
- `@tanstack/react-query` - Data fetching
- `@workspace/ui` - UI components
- `@workspace/contracts` - API types
- `tailwindcss` - Styling
