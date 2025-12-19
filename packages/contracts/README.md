# @workspace/contracts

**API contracts defined using TypeSpec**

This package contains the single source of truth for your API contracts. It generates OpenAPI specifications that consuming applications use to generate their own type-safe clients.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  @workspace/contracts (This Package)                        │
│  - TypeSpec definitions (spec/)                             │
│  - Generated OpenAPI (tsp-output/openapi/)                  │
│  - Exports: OpenAPI YAML/JSON                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ imports @workspace/contracts/openapi
                            ↓
        ┌───────────────────────────────────────────┐
        │                                           │
        ↓                                           ↓
┌──────────────────┐                    ┌──────────────────┐
│  apps/web        │                    │  apps/api        │
│  - hey-api       │                    │  - hey-api       │
│  - React Query   │                    │  - Types only    │
│  - Hooks         │                    │  - Validators    │
└──────────────────┘                    └──────────────────┘
```

## Why This Architecture?

**Each app generates its own client** because:
- ✅ Web apps want React Query/Tanstack Query hooks
- ✅ Mobile apps want different client configs
- ✅ API apps only need types for validation
- ✅ Each app controls its own dependencies
- ✅ No coupling between apps

## Structure

```
packages/contracts/
├── spec/                    # TypeSpec source (edit these)
│   ├── main.tsp            # Entry point - import all modules here
│   ├── common/             # Shared models (responses, errors)
│   ├── models/             # Resource models
│   ├── routes/             # API endpoints
│   └── examples/           # Documented templates (copy for new resources)
│       ├── post.tsp        # Example model with all patterns
│       ├── posts.tsp       # Example routes (CRUD, batch, actions)
│       ├── comment.tsp     # Example nested resource model
│       └── comments.tsp    # Example nested resource routes
├── CONTRACTS-GUIDE.md      # Writing conventions and patterns
└── tsp-output/             # Generated OpenAPI (committed to git)
    └── openapi/
        ├── openapi.yaml    # OpenAPI 3.0 spec
        └── openapi.json
```

## Usage in This Package

### 1. Edit TypeSpec Contracts

```bash
# Edit contracts
vim spec/models/user.tsp

# Compile to OpenAPI
pnpm build

# Or watch mode
pnpm watch
```

### 2. Commit Generated OpenAPI

The `tsp-output/` directory **IS committed to git** so consuming apps can use it:

```bash
git add tsp-output/openapi/openapi.yaml
git commit -m "Update API contracts"
```

## Usage in Consuming Apps

### Example: Web App with React Query

```bash
cd apps/web

# Install hey-api
pnpm add -D @hey-api/openapi-ts

# Create config: openapi-ts.config.ts
```

```typescript
// apps/web/openapi-ts.config.ts
import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  client: '@hey-api/client-fetch',
  input: '@workspace/contracts/openapi', // Import from contracts!
  output: {
    path: './src/api/generated',
  },
  plugins: [
    '@tanstack/react-query',  // Generate React Query hooks!
  ],
});
```

```json
// apps/web/package.json
{
  "scripts": {
    "generate-api": "openapi-ts"
  },
  "dependencies": {
    "@workspace/contracts": "workspace:*"
  }
}
```

```bash
# Generate React Query hooks
pnpm generate-api
```

**Usage in React:**
```typescript
// apps/web/src/App.tsx
import { useUsersServiceList } from './api/generated';

function UsersList() {
  const { data, isLoading } = useUsersServiceList({
    path: { orgId: 'org_123' },
    query: { page: 1, pageSize: 50 },
  });

  // data is fully typed!
  return <div>{data?.data.map(user => user.name)}</div>;
}
```

### Example: API with Types Only

```bash
cd apps/api

# Install hey-api
pnpm add -D @hey-api/openapi-ts
```

```typescript
// apps/api/openapi-ts.config.ts
export default defineConfig({
  client: false,  // No client, just types!
  input: '@workspace/contracts/openapi',
  output: {
    path: './src/types/generated',
  },
});
```

**Usage in API:**
```typescript
// apps/api/src/routes/users.ts
import type { User, CreateUserRequest } from './types/generated';

export async function createUser(
  req: Request<unknown, unknown, CreateUserRequest>
) {
  const user: User = await db.users.create(req.body);
  return user;
}
```

## Key Features

### TypeSpec Contracts Include:

- ✅ **URL versioning** (`/v1`)
- ✅ **Multi-tenant architecture** (`/orgs/{orgId}`)
- ✅ **Complete pagination** with `hasNext`, `hasPrevious`, `links`
- ✅ **Structured error responses** with validation details
- ✅ **Soft delete + restore** operations
- ✅ **Batch operations**
- ✅ **Field selection** (`fields`, `include`)
- ✅ **Full-text search & filtering**

### Naming Convention: camelCase

All JSON fields use **camelCase** (modern API standard):
- `firstName`, `lastName`, `emailAddress`
- `createdAt`, `updatedAt`, `deletedAt`
- `pageSize`, `totalCount`, `hasNext`
- `isActive`, `isVerified`, `isDeleted`

## Development Workflow

### Adding New Resources

1. **Copy example templates:**
   ```bash
   # Copy the example model
   cp spec/examples/post.tsp spec/models/product.tsp

   # Copy the example routes
   cp spec/examples/posts.tsp spec/routes/products.tsp
   ```

2. **Rename and customize:**
   - Replace "Post/Posts" with "Product/Products"
   - Update properties and filters for your resource
   - See `CONTRACTS-GUIDE.md` for conventions

3. **Import in main.tsp:**
   ```typescript
   import "./models/product.tsp";
   import "./routes/products.tsp";
   ```

4. **Build and commit:**
   ```bash
   pnpm build
   git add tsp-output/
   git commit -m "Add Product API"
   ```

5. **Apps regenerate their clients:**
   ```bash
   cd apps/web
   pnpm generate-api  # Gets new Product types/hooks!
   ```

> **Tip:** The examples in `spec/examples/` demonstrate all patterns including CRUD, batch operations, custom actions, and nested resources.

## Scripts

```bash
pnpm build   # Compile TypeSpec → OpenAPI
pnpm watch   # Auto-compile on changes
pnpm lint    # Lint TypeSpec files
```

## Framework-Specific Plugins

Hey-api supports many frameworks:

- `@tanstack/react-query` - React Query hooks
- `@tanstack/svelte-query` - Svelte Query stores
- `@tanstack/vue-query` - Vue Query composables
- `swr` - SWR hooks
- `angular` - Angular services

**Each app chooses what it needs!**

## Resources

- [CONTRACTS-GUIDE.md](./CONTRACTS-GUIDE.md) - Writing conventions and patterns
- [spec/examples/](./spec/examples/) - Documented templates for new resources
- [TypeSpec Documentation](https://typespec.io/)
- [Hey API Documentation](https://heyapi.dev/)
- [API Guide (this project)](../../docs/api-guide/)

## Examples

**TypeSpec contract examples:**
- `spec/examples/post.tsp` - Complete model with all patterns
- `spec/examples/posts.tsp` - Full CRUD, batch ops, custom actions
- `spec/examples/comment.tsp` - Nested resource model
- `spec/examples/comments.tsp` - Nested resource routes

**Client generation examples:**
- `apps/web/openapi-ts.config.ts` (coming soon)
- `apps/api/openapi-ts.config.ts` (coming soon)
