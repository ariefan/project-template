# Project Template

**AI-friendly monorepo template for full-stack applications**

A production-ready template featuring authentication, authorization, notifications, file storage, and more. Designed with AI coding agents in mind, following the 7 Principles of AI-friendly code.

## Quick Start

```bash
# Install dependencies
pnpm install

# Start all apps
pnpm dev

# Run tests
pnpm test

# Format code
pnpm dlx ultracite fix
```

## Stack Overview

| Layer | Technology |
|-------|------------|
| **API** | Fastify + Drizzle ORM |
| **Web** | Next.js + shadcn/ui |
| **Mobile** | Expo + React Native |
| **Database** | PostgreSQL |
| **Auth** | Better Auth |
| **Authorization** | Casbin RBAC |
| **Cache** | Redis / Memory |
| **Queue** | PgBoss |

## Project Structure

```
├── apps/
│   ├── api/                 # Fastify API server
│   ├── web/                 # Next.js web app
│   └── mobile/              # Expo mobile app
│
├── packages/
│   ├── auth/                # Better Auth integration
│   ├── authorization/       # Casbin RBAC system
│   ├── cache/               # Redis/Memory caching
│   ├── contracts/           # TypeSpec API contracts
│   ├── db/                  # Drizzle ORM + PostgreSQL
│   ├── notifications/       # Email, SMS, WhatsApp, Telegram
│   ├── storage/             # S3/Local file storage
│   ├── ui/                  # shadcn/ui components
│   └── utils/               # Shared utilities
│
├── docs/                    # Documentation guides
└── templates/               # PlopJS code generators
```

## Documentation

- [Documentation Index](docs/README.md)
- [Development Workflow](docs/development-workflow.md)
- [Error Handling](docs/error-handling.md)
- [Security Guide](docs/security.md)
- [Performance Guide](docs/performance.md)

## AI-Friendliness

This template is optimized for AI coding agents. Key design principles:

1. **Explicit over Implicit** - Code shows what it does, no hidden behavior
2. **Types Everywhere** - Strong TypeScript with Zod validation
3. **Predictable Patterns** - Consistent file structure and conventions
4. **Minimal Abstraction** - Few layers between code and execution
5. **Copy-Paste over Config** - Code you own (shadcn/ui pattern)
6. **Composition over Inheritance** - Small pieces that combine
7. **Good Documentation** - Per-package READMEs, architectural guides

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed architectural decisions.

## Code Standards

This project uses [Ultracite](https://github.com/haydenbleasel/ultracite), a zero-config Biome preset:

```bash
# Check issues
pnpm dlx ultracite check

# Fix issues
pnpm dlx ultracite fix
```

See [.claude/CLAUDE.md](.claude/CLAUDE.md) for full code standards.

## Package Documentation

| Package | Description | README |
|---------|-------------|--------|
| @workspace/auth | Authentication (Better Auth) | [README](packages/auth/README.md) |
| @workspace/authorization | RBAC (Casbin) | [README](packages/authorization/README.md) |
| @workspace/cache | Caching (Redis/Memory) | [README](packages/cache/README.md) |
| @workspace/contracts | API Contracts (TypeSpec) | [README](packages/contracts/README.md) |
| @workspace/db | Database (Drizzle) | [README](packages/db/README.md) |
| @workspace/notifications | Multi-channel Notifications | [README](packages/notifications/README.md) |
| @workspace/storage | File Storage (S3/Local) | [README](packages/storage/README.md) |
| @workspace/utils | Shared Utilities | [README](packages/utils/README.md) |

## Adding UI Components

```bash
# Add shadcn/ui components
pnpm dlx shadcn@latest add button -c apps/web

# Components are placed in packages/ui/src/components
```

## Using Components

```tsx
import { Button } from "@workspace/ui/components/button"

<Button variant="default">Click me</Button>
```

## Environment Setup

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `BETTER_AUTH_SECRET` - Authentication secret
- `BETTER_AUTH_URL` - Auth server URL

See `.env.example` for all available options.

## License

MIT
