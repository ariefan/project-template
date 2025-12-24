# @workspace/cache

**Pluggable cache provider with in-memory and Redis implementations**

This package provides a unified caching interface with support for memory-based caching (development/testing) and Redis (production). It includes built-in key builders for common use cases.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         @workspace/cache                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                     CacheProvider Interface                   │  │
│  │  get() | set() | delete() | deletePattern() | mget() | mset() │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│              ┌───────────────┴───────────────┐                      │
│              ▼                               ▼                      │
│  ┌────────────────────────┐    ┌────────────────────────┐          │
│  │    Memory Provider     │    │     Redis Provider     │          │
│  │  - LRU eviction        │    │  - Persistent          │          │
│  │  - Development/Test    │    │  - Pattern delete      │          │
│  │  - No dependencies     │    │  - Production-ready    │          │
│  └────────────────────────┘    └────────────────────────┘          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Exports

```typescript
// Factory function (auto-selects based on config)
export { createCacheProvider } from "@workspace/cache";

// Individual providers
export { createMemoryProvider } from "@workspace/cache";
export { createRedisProvider } from "@workspace/cache";

// Types
export type { CacheProvider, CacheEntry, CacheProviderConfig } from "@workspace/cache";

// Key builders (for authorization caching)
export {
  buildAuthzKey,
  buildAuthzPatternForOrg,
  buildAuthzPatternForUser,
} from "@workspace/cache";
```

## Usage

### Factory Pattern (Recommended)

```typescript
import { createCacheProvider } from "@workspace/cache";

// Development: In-memory cache
const cache = createCacheProvider({
  type: "memory",
  maxSize: 1000, // Max entries before LRU eviction
});

// Production: Redis cache
const cache = createCacheProvider({
  type: "redis",
  url: process.env.REDIS_URL,
  keyPrefix: "myapp:", // Optional namespace
});
```

### Basic Operations

```typescript
// Set with TTL (60 seconds)
await cache.set("user:123", { name: "John" }, 60);

// Get (returns null if expired/missing)
const user = await cache.get<User>("user:123");

// Delete specific key
await cache.delete("user:123");

// Delete by pattern (Redis only, memory simulated)
const deleted = await cache.deletePattern("user:*");

// Clear all
await cache.clear();

// Health check
const healthy = await cache.ping();
```

### Batch Operations

```typescript
// Set multiple values
await cache.mset([
  { key: "user:1", value: { name: "Alice" }, ttlSeconds: 60 },
  { key: "user:2", value: { name: "Bob" }, ttlSeconds: 60 },
]);

// Get multiple values
const users = await cache.mget<User>(["user:1", "user:2"]);
// Returns Map<string, User>
```

### Authorization Caching

```typescript
import {
  buildAuthzKey,
  buildAuthzPatternForUser,
  buildAuthzPatternForOrg,
} from "@workspace/cache";

// Build cache key for specific permission check
const key = buildAuthzKey({
  userId: "user_123",
  appId: "api",
  tenantId: "org_456",
  resource: "posts",
  action: "read",
});
// → "authz:user_123:api:org_456:posts:read"

// Invalidate all permissions for a user
await cache.deletePattern(buildAuthzPatternForUser("user_123"));
// → Deletes "authz:user_123:*"

// Invalidate all permissions for an org
await cache.deletePattern(buildAuthzPatternForOrg("org_456"));
// → Deletes "authz:*:*:org_456:*"
```

## CacheProvider Interface

```typescript
type CacheProvider = {
  readonly name: string;

  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  deletePattern(pattern: string): Promise<number>;
  clear(): Promise<void>;
  mget<T>(keys: string[]): Promise<Map<string, T>>;
  mset<T>(entries: Array<{ key: string; value: T; ttlSeconds?: number }>): Promise<void>;
  ping(): Promise<boolean>;
};
```

## Configuration

### Memory Provider

```typescript
{
  type: "memory",
  maxSize: 1000  // Default: 1000 entries, LRU eviction
}
```

Best for:
- Development
- Testing
- Single-instance deployments

### Redis Provider

```typescript
{
  type: "redis",
  url: "redis://localhost:6379",
  keyPrefix: "cache:"  // Default: "cache:"
}
```

Best for:
- Production
- Multi-instance deployments
- Persistent caching
- Pattern-based invalidation

## Environment Variables

```bash
# Redis connection (production)
REDIS_URL=redis://localhost:6379

# Or with authentication
REDIS_URL=redis://:password@host:6379
```

## Dependencies

- `ioredis` - Redis client (production)

## Testing

```bash
pnpm test
```

Tests include:
- Memory provider with LRU eviction
- Redis provider with mocking
- Pattern deletion
- TTL expiration
