# Documentation

This directory contains guides and documentation for the project template.

## Guides

| Document | Description |
|----------|-------------|
| [Development Workflow](development-workflow.md) | Daily development workflow, feature implementation, git practices |
| [Error Handling](error-handling.md) | Error response format, error classes, logging standards |
| [Security](security.md) | Authentication, authorization, secrets, input validation |
| [Performance](performance.md) | Caching strategies, database optimization, monitoring |
| [Testing](testing.md) | Unit tests, integration tests, mocking patterns |

## Architecture

| Document | Description |
|----------|-------------|
| [SSO Architecture](sso-architecture.md) | Cross-app single sign-on with OIDC |
| [Better Auth Implementation](better-auth-implementation.md) | Authentication system setup |
| [Shared Auth UI](shared-auth-ui.md) | Shared authentication components |

## Package Documentation

Each package has its own README with usage examples:

| Package | Description |
|---------|-------------|
| [@workspace/auth](../packages/auth/README.md) | Better Auth integration |
| [@workspace/authorization](../packages/authorization/README.md) | Casbin RBAC system |
| [@workspace/cache](../packages/cache/README.md) | Redis/Memory caching |
| [@workspace/contracts](../packages/contracts/README.md) | TypeSpec API contracts |
| [@workspace/db](../packages/db/README.md) | Drizzle ORM database |
| [@workspace/notifications](../packages/notifications/README.md) | Multi-channel notifications |
| [@workspace/storage](../packages/storage/README.md) | File storage (S3/Local) |
| [@workspace/ui](../packages/ui/README.md) | shadcn/ui web components |
| [@workspace/ui-mobile](../packages/ui-mobile/README.md) | React Native components |
| [@workspace/utils](../packages/utils/README.md) | Shared utilities |

## Application Documentation

| App | Description |
|-----|-------------|
| [apps/api](../apps/api/README.md) | Fastify API server |
| [apps/web](../apps/web/README.md) | Next.js web app |
| [apps/mobile](../apps/mobile/README.md) | Expo mobile app |

## AI-Friendliness

This project is optimized for AI coding agents. Key principles are documented in:

- [ARCHITECTURE.md](../ARCHITECTURE.md) - The 7 Principles of AI-friendly code
- [CLAUDE.md](../.claude/CLAUDE.md) - Ultracite code standards

## Quick Links

### Development

```bash
# Start all apps
pnpm dev

# Run tests
pnpm test

# Type check
pnpm typecheck

# Format code
pnpm dlx ultracite fix
```

### Common Tasks

- **Add a new feature**: See [Development Workflow](development-workflow.md#feature-development-flow)
- **Handle errors**: See [Error Handling](error-handling.md)
- **Add authentication**: See [Better Auth Implementation](better-auth-implementation.md)
- **Add authorization**: See [@workspace/authorization](../packages/authorization/README.md)
- **Add caching**: See [@workspace/cache](../packages/cache/README.md)
