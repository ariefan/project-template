# @workspace/test-utils

Shared testing utilities for the workspace. Provides mock factories, mock providers, and test helpers for consistent testing across all packages.

## Installation

This package is internal to the workspace. Add it as a dev dependency:

```json
{
  "devDependencies": {
    "@workspace/test-utils": "workspace:*"
  }
}
```

## Usage

### Mock Factories

Create realistic test data with sensible defaults:

```typescript
import { createUser, createOrganization, createPost } from "@workspace/test-utils";

// Create with defaults
const user = createUser();
// { id: "user_1", email: "user1@test.com", name: "Test User 1", ... }

// Override specific fields
const admin = createUser({ name: "Admin", email: "admin@test.com" });

// Create related data
const org = createOrganization({ ownerId: user.id });
const post = createPost({ authorId: user.id, organizationId: org.id });
```

### Mock Database

Chainable mock that mimics Drizzle ORM's query API:

```typescript
import { createMockDb } from "@workspace/test-utils";
import { vi } from "vitest";

const mockDb = createMockDb();

// Mock a select query result
mockDb.select.mockQueryResult([
  { id: "1", title: "Post 1" },
  { id: "2", title: "Post 2" },
]);

// Use in tests
vi.mock("@workspace/db", () => ({ db: mockDb }));

// The mock supports chainable queries
// db.select().from(posts).where(eq(posts.id, "1")).execute()
```

### Mock Cache

Mock cache provider with internal storage for realistic behavior:

```typescript
import { createMockCache } from "@workspace/test-utils";

const mockCache = createMockCache();

// Preset cached values for your test
mockCache._preset("user:1", { id: "1", name: "Cached User" });

// Use in tests
vi.mock("@workspace/cache", () => ({
  createCacheProvider: () => mockCache,
}));

// Cache operations work as expected
await mockCache.get("user:1"); // Returns preset value
await mockCache.set("key", "value"); // Stores in internal Map
```

### Test App Builder

Create a Fastify test app with mocked dependencies:

```typescript
import { createTestApp } from "@workspace/test-utils";

describe("Posts API", () => {
  let app: FastifyInstance;
  let ctx: TestAppContext;

  beforeAll(async () => {
    const result = await createTestApp({
      mockDb: true,    // Use mock database
      mockCache: true, // Use mock cache
      mockAuth: true,  // Mock authenticated user
    });
    app = result.app;
    ctx = result.context;
  });

  it("should return posts", async () => {
    // Set up mock data
    ctx.mockDb?.select.mockQueryResult([{ id: "1", title: "Test Post" }]);

    // Make request
    const response = await app.inject({
      method: "GET",
      url: "/posts",
    });

    expect(response.statusCode).toBe(200);
  });
});
```

## API Reference

### Factories

| Function | Description |
|----------|-------------|
| `createUser(overrides?)` | Create a mock user |
| `createOrganization(overrides?)` | Create a mock organization |
| `createPost(overrides?)` | Create a mock post |

### Mocks

| Function | Description |
|----------|-------------|
| `createMockDb()` | Create a chainable mock database |
| `createMockCache()` | Create a mock cache provider |

### Helpers

| Function | Description |
|----------|-------------|
| `createTestApp(options)` | Create a test Fastify app with mocks |
| `resetUserCounter()` | Reset user ID counter (for predictable IDs) |
| `resetMockCache(cache)` | Clear cache storage and mock history |
| `resetMockDb(db)` | Clear all mock function history |

## Best Practices

1. **Reset mocks between tests** - Use `vi.clearAllMocks()` in `beforeEach`
2. **Use factories for test data** - Avoid hardcoding test data
3. **Mock at module boundaries** - Mock `@workspace/db`, not internal functions
4. **Preset expected data** - Use `mockQueryResult()` and `_preset()` before assertions
