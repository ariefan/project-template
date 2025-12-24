# Testing Guide

This guide documents the testing patterns, tools, and best practices used across the monorepo.

## Table of Contents

1. [Overview](#overview)
2. [Running Tests](#running-tests)
3. [Test Structure](#test-structure)
4. [Unit Tests](#unit-tests)
5. [Integration Tests](#integration-tests)
6. [API Testing](#api-testing)
7. [Mocking Patterns](#mocking-patterns)
8. [Test Coverage](#test-coverage)

---

## Overview

The project uses [Vitest](https://vitest.dev/) as the test runner, which provides:
- Fast execution (native ESM support)
- Jest-compatible API
- Built-in TypeScript support
- Watch mode for development

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests for specific package
pnpm test --filter=@workspace/authorization

# Run tests matching pattern
pnpm test -- --grep "should create role"

# Run with coverage
pnpm test -- --coverage
```

## Test Structure

```
packages/
├── authorization/
│   └── src/
│       ├── __tests__/               # Tests near source
│       │   ├── adapter/
│       │   │   └── drizzle-adapter.test.ts
│       │   ├── audit/
│       │   │   └── service.test.ts
│       │   └── violations.test.ts
│       ├── adapter/
│       │   └── drizzle-adapter.ts
│       └── violations.ts
│
apps/
├── api/
│   └── src/
│       ├── modules/
│       │   └── authorization/
│       │       └── __tests__/
│       │           └── violation-routes.test.ts
│       └── plugins/
│           └── __tests__/
│               └── authorization.test.ts
```

## Unit Tests

### Basic Structure

```typescript
// packages/cache/src/__tests__/providers/memory.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { createMemoryProvider } from "../../providers/memory";

describe("MemoryProvider", () => {
  let cache: ReturnType<typeof createMemoryProvider>;

  beforeEach(() => {
    cache = createMemoryProvider({ maxSize: 100 });
  });

  describe("get/set", () => {
    it("should store and retrieve values", async () => {
      await cache.set("key", { data: "value" });
      const result = await cache.get("key");
      expect(result).toEqual({ data: "value" });
    });

    it("should return null for missing keys", async () => {
      const result = await cache.get("nonexistent");
      expect(result).toBeNull();
    });

    it("should respect TTL", async () => {
      await cache.set("key", "value", 1); // 1 second TTL

      // Immediately available
      expect(await cache.get("key")).toBe("value");

      // Wait for expiration
      await new Promise((r) => setTimeout(r, 1100));
      expect(await cache.get("key")).toBeNull();
    });
  });

  describe("delete", () => {
    it("should delete existing keys", async () => {
      await cache.set("key", "value");
      await cache.delete("key");
      expect(await cache.get("key")).toBeNull();
    });
  });
});
```

### Testing Async Code

```typescript
describe("AsyncService", () => {
  it("should handle async operations", async () => {
    const result = await service.fetchData();
    expect(result).toBeDefined();
  });

  it("should reject on error", async () => {
    await expect(service.failingOperation()).rejects.toThrow("Expected error");
  });

  it("should timeout long operations", async () => {
    await expect(
      Promise.race([
        service.longOperation(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 1000)
        ),
      ])
    ).rejects.toThrow("Timeout");
  });
});
```

## Integration Tests

### Database Integration

```typescript
// packages/authorization/src/__tests__/adapter/drizzle-adapter.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { db } from "@workspace/db";
import { casbinRules } from "@workspace/db/schema";
import { CasbinDrizzleAdapter } from "../../adapter/drizzle-adapter";

describe("CasbinDrizzleAdapter", () => {
  let adapter: CasbinDrizzleAdapter;

  beforeAll(async () => {
    // Setup test database
    adapter = new CasbinDrizzleAdapter();
  });

  beforeEach(async () => {
    // Clean up before each test
    await db.delete(casbinRules);
  });

  afterAll(async () => {
    // Cleanup
    await db.delete(casbinRules);
  });

  it("should add and load policies", async () => {
    // Add policy
    await adapter.addPolicy("p", "p", ["user1", "app", "org1", "posts", "read", "allow"]);

    // Load and verify
    const model = createTestModel();
    await adapter.loadPolicy(model);

    expect(model.hasPolicy("p", "p", ["user1", "app", "org1", "posts", "read", "allow"])).toBe(true);
  });
});
```

## API Testing

### Fastify Route Testing

```typescript
// apps/api/src/modules/authorization/__tests__/violation-routes.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../../../app";
import type { FastifyInstance } from "fastify";

describe("Violation Routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /v1/orgs/:orgId/violations", () => {
    it("should return violations list", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v1/orgs/org_123/violations",
        headers: {
          authorization: "Bearer test-token",
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveProperty("data");
    });

    it("should require authentication", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v1/orgs/org_123/violations",
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
```

### Testing with Authentication

```typescript
describe("Protected Routes", () => {
  const mockUser = {
    id: "user_123",
    email: "test@example.com",
  };

  // Mock authentication
  beforeAll(() => {
    vi.mock("@workspace/auth", () => ({
      auth: {
        api: {
          getSession: vi.fn().mockResolvedValue({
            user: mockUser,
            session: { id: "session_123" },
          }),
        },
      },
    }));
  });

  it("should access protected resource", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/v1/protected-resource",
      headers: {
        cookie: "auth.session_token=valid-token",
      },
    });

    expect(response.statusCode).toBe(200);
  });
});
```

## Mocking Patterns

### Mocking Modules

```typescript
import { vi, describe, it, expect } from "vitest";

// Mock entire module
vi.mock("@workspace/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([{ id: "1", name: "Test" }]),
  },
}));

// Mock specific function
vi.mock("./utils", async () => {
  const actual = await vi.importActual("./utils");
  return {
    ...actual,
    expensiveOperation: vi.fn().mockReturnValue("mocked"),
  };
});
```

### Mocking Classes

```typescript
import { vi } from "vitest";

class MockCacheProvider {
  private store = new Map();

  async get(key: string) {
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: unknown) {
    this.store.set(key, value);
  }

  async delete(key: string) {
    this.store.delete(key);
  }

  async clear() {
    this.store.clear();
  }
}

describe("ServiceWithCache", () => {
  it("should use cache", async () => {
    const cache = new MockCacheProvider();
    const service = new ServiceWithCache(cache);

    await service.getData("key");
    expect(await cache.get("key")).toBeDefined();
  });
});
```

### Mocking External Services

```typescript
import { vi } from "vitest";

// Mock Redis
vi.mock("ioredis", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue("OK"),
      del: vi.fn().mockResolvedValue(1),
      quit: vi.fn().mockResolvedValue("OK"),
    })),
  };
});

// Mock HTTP requests
vi.mock("node-fetch", () => ({
  default: vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ data: "mocked" }),
  }),
}));
```

### Spy on Functions

```typescript
import { vi, describe, it, expect } from "vitest";

describe("Logger", () => {
  it("should log errors", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    logger.error("Test error");

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Test error")
    );

    consoleSpy.mockRestore();
  });
});
```

## Test Coverage

### Configuration

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      exclude: [
        "node_modules/",
        "**/*.test.ts",
        "**/__tests__/**",
        "**/types.ts",
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
});
```

### Viewing Coverage

```bash
# Generate coverage report
pnpm test -- --coverage

# Open HTML report
open coverage/index.html
```

## Best Practices

### Do's

- **Descriptive test names**: "should return 404 when post not found"
- **One assertion per test**: Test one behavior at a time
- **Use `beforeEach` for setup**: Reset state between tests
- **Mock external dependencies**: Database, HTTP, file system
- **Test edge cases**: Empty arrays, null values, errors

### Don'ts

- **Don't test implementation details**: Test behavior, not internals
- **Don't use `.only` or `.skip`**: Remove before committing
- **Don't share state between tests**: Each test should be independent
- **Don't test third-party code**: Trust your dependencies
- **Don't write flaky tests**: Avoid timing-dependent assertions

### Test Naming Convention

```typescript
describe("ModuleName", () => {
  describe("methodName", () => {
    it("should [expected behavior] when [condition]", () => {
      // ...
    });
  });
});
```

Examples:
- "should return empty array when no posts exist"
- "should throw UnauthorizedError when token is invalid"
- "should cache result for 5 minutes"
- "should retry 3 times on network failure"

## Debugging Tests

```bash
# Run single test file
pnpm test -- src/__tests__/specific.test.ts

# Run with verbose output
pnpm test -- --reporter=verbose

# Debug in VS Code
# Add breakpoint, then run "Debug Test" from VS Code
```

## CI/CD Integration

Tests run automatically on:
- Pull request creation
- Push to main branch

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test
      - run: pnpm test -- --coverage
```
