# Performance Guide

This guide documents performance optimization strategies, caching patterns, and monitoring practices for the monorepo.

## Table of Contents

1. [Caching Strategies](#caching-strategies)
2. [Database Optimization](#database-optimization)
3. [API Performance](#api-performance)
4. [Frontend Performance](#frontend-performance)
5. [Authorization Performance](#authorization-performance)
6. [Monitoring & Profiling](#monitoring--profiling)

---

## Caching Strategies

### Cache Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                        Cache Layers                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Browser Cache (HTTP headers)                                │
│     └── Static assets, API responses                            │
│                                                                  │
│  2. CDN Cache (Vercel Edge, Cloudflare)                        │
│     └── Static pages, images, API responses                     │
│                                                                  │
│  3. Application Cache (@workspace/cache)                        │
│     ├── Redis (production)                                      │
│     └── Memory (development)                                    │
│                                                                  │
│  4. Database Query Cache (Drizzle/Postgres)                    │
│     └── Prepared statements, connection pooling                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Using @workspace/cache

```typescript
import { createCacheProvider } from "@workspace/cache";

const cache = createCacheProvider({
  type: process.env.NODE_ENV === "production" ? "redis" : "memory",
  url: process.env.REDIS_URL,
});

// Cache expensive queries
async function getOrganizationStats(orgId: string) {
  const cacheKey = `stats:org:${orgId}`;

  // Try cache first
  const cached = await cache.get<OrgStats>(cacheKey);
  if (cached) return cached;

  // Compute if not cached
  const stats = await computeOrgStats(orgId);

  // Cache for 5 minutes
  await cache.set(cacheKey, stats, 300);

  return stats;
}
```

### Cache Invalidation

```typescript
// Invalidate on update
async function updateOrganization(orgId: string, data: UpdateOrgInput) {
  await db.update(orgs).set(data).where(eq(orgs.id, orgId));

  // Invalidate related caches
  await cache.delete(`org:${orgId}`);
  await cache.deletePattern(`stats:org:${orgId}:*`);
}

// Time-based expiration (TTL)
await cache.set("user:session", session, 3600); // 1 hour
```

### Cache Key Patterns

```typescript
// User-specific data
`user:${userId}`
`user:${userId}:preferences`
`user:${userId}:notifications`

// Organization data
`org:${orgId}`
`org:${orgId}:members`
`org:${orgId}:stats`

// Authorization decisions
`authz:${userId}:${appId}:${orgId}:${resource}:${action}`

// API responses
`api:posts:list:${JSON.stringify(params)}`
```

---

## Database Optimization

### Connection Pooling

```typescript
// packages/db/src/index.ts
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  min: 2,           // Minimum connections
  max: 10,          // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### Query Optimization

```typescript
// Bad - N+1 query
const posts = await db.select().from(posts);
for (const post of posts) {
  const author = await db.select().from(users).where(eq(users.id, post.authorId));
}

// Good - Single query with join
const postsWithAuthors = await db
  .select({
    post: posts,
    author: users,
  })
  .from(posts)
  .leftJoin(users, eq(posts.authorId, users.id));
```

### Pagination

```typescript
// Offset pagination (simple, but slow for large offsets)
const page = await db
  .select()
  .from(posts)
  .orderBy(desc(posts.createdAt))
  .limit(20)
  .offset((pageNumber - 1) * 20);

// Cursor pagination (better for large datasets)
const page = await db
  .select()
  .from(posts)
  .where(cursor ? lt(posts.createdAt, cursor) : undefined)
  .orderBy(desc(posts.createdAt))
  .limit(20);
```

### Indexes

Ensure indexes exist for frequently queried columns:

```typescript
// packages/db/src/schema/posts.ts
import { index, pgTable } from "drizzle-orm/pg-core";

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey(),
    authorId: uuid("author_id").notNull(),
    orgId: uuid("org_id").notNull(),
    status: text("status").notNull(),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => ({
    // Index for common queries
    authorIdx: index("posts_author_idx").on(table.authorId),
    orgIdx: index("posts_org_idx").on(table.orgId),
    statusIdx: index("posts_status_idx").on(table.status),
    // Composite index for filtered queries
    orgStatusIdx: index("posts_org_status_idx").on(table.orgId, table.status),
  })
);
```

### Query Analysis

```sql
-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM posts WHERE org_id = 'xxx' AND status = 'published';

-- Check index usage
SELECT * FROM pg_stat_user_indexes WHERE relname = 'posts';
```

---

## API Performance

### Response Compression

```typescript
// apps/api/src/index.ts
import compress from "@fastify/compress";

app.register(compress, {
  global: true,
  encodings: ["gzip", "deflate"],
  threshold: 1024,  // Only compress responses > 1KB
});
```

### Field Selection

Let clients request only needed fields:

```typescript
// Request: GET /posts?fields=id,title,createdAt
app.get("/posts", async (request) => {
  const fields = parseFields(request.query.fields);

  const posts = await db
    .select(pick(posts, fields))
    .from(posts)
    .limit(20);

  return posts;
});
```

### Batch Operations

```typescript
// Bad - Multiple round trips
for (const id of ids) {
  await db.delete(posts).where(eq(posts.id, id));
}

// Good - Single query
await db.delete(posts).where(inArray(posts.id, ids));
```

### HTTP Caching Headers

```typescript
app.get("/posts/:id", async (request, reply) => {
  const post = await getPost(request.params.id);

  // Cache for 60 seconds, allow stale for 300s while revalidating
  reply.header("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  reply.header("ETag", `"${post.version}"`);

  return post;
});
```

### Request Timeouts

```typescript
app.register(async (app) => {
  app.addHook("onRequest", async (request) => {
    // Set request timeout
    request.raw.setTimeout(30000); // 30 seconds
  });
});
```

---

## Frontend Performance

### React Query Caching

```typescript
// apps/web/lib/api/posts.ts
import { useQuery } from "@tanstack/react-query";

export function usePosts(orgId: string) {
  return useQuery({
    queryKey: ["posts", orgId],
    queryFn: () => fetchPosts(orgId),
    staleTime: 60 * 1000,        // Consider fresh for 1 minute
    gcTime: 5 * 60 * 1000,       // Keep in cache for 5 minutes
    refetchOnWindowFocus: false,  // Don't refetch on tab focus
  });
}
```

### Optimistic Updates

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useUpdatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePost,
    onMutate: async (newPost) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["posts"] });

      // Snapshot previous value
      const previousPosts = queryClient.getQueryData(["posts"]);

      // Optimistically update
      queryClient.setQueryData(["posts"], (old) =>
        old.map((p) => (p.id === newPost.id ? { ...p, ...newPost } : p))
      );

      return { previousPosts };
    },
    onError: (err, newPost, context) => {
      // Rollback on error
      queryClient.setQueryData(["posts"], context.previousPosts);
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}
```

### Code Splitting

```typescript
// apps/web/app/dashboard/page.tsx
import dynamic from "next/dynamic";

// Lazy load heavy components
const Chart = dynamic(() => import("@/components/chart"), {
  loading: () => <ChartSkeleton />,
  ssr: false,  // Client-only component
});
```

### Image Optimization

```tsx
// Use Next.js Image component
import Image from "next/image";

<Image
  src={post.coverImage}
  alt={post.title}
  width={800}
  height={400}
  placeholder="blur"
  blurDataURL={post.coverImageBlur}
  sizes="(max-width: 768px) 100vw, 800px"
/>
```

---

## Authorization Performance

### Cache Permission Checks

```typescript
import { createCacheProvider, buildAuthzKey } from "@workspace/cache";

const cache = createCacheProvider({ type: "redis", url: REDIS_URL });

async function checkPermission(
  userId: string,
  appId: string,
  orgId: string,
  resource: string,
  action: string
): Promise<boolean> {
  const cacheKey = buildAuthzKey({ userId, appId, orgId, resource, action });

  // Check cache first
  const cached = await cache.get<boolean>(cacheKey);
  if (cached !== null) return cached;

  // Compute if not cached
  const allowed = await enforcer.enforce(userId, appId, orgId, resource, action);

  // Cache for 5 minutes
  await cache.set(cacheKey, allowed, 300);

  return allowed;
}
```

### Batch Permission Checks

```typescript
// Check multiple permissions at once
async function checkPermissions(
  userId: string,
  checks: Array<{ resource: string; action: string }>
): Promise<Map<string, boolean>> {
  const results = await Promise.all(
    checks.map(async ({ resource, action }) => {
      const allowed = await checkPermission(userId, "api", orgId, resource, action);
      return [`${resource}:${action}`, allowed] as const;
    })
  );

  return new Map(results);
}
```

### Invalidate on Role Change

```typescript
async function updateUserRole(userId: string, orgId: string, newRole: string) {
  // Update role
  await userRoleService.assignRole({ userId, roleName: newRole, orgId });

  // Invalidate all cached permissions for this user in this org
  const pattern = buildAuthzPatternForUser(userId);
  await cache.deletePattern(pattern);
}
```

---

## Monitoring & Profiling

### Key Metrics to Monitor

| Metric | Alert Threshold | Description |
|--------|-----------------|-------------|
| Request latency p99 | > 500ms | Slow requests |
| Error rate | > 1% | Failed requests |
| Cache hit ratio | < 80% | Cache ineffective |
| DB connection pool | > 80% used | Connection exhaustion |
| Memory usage | > 80% | Memory pressure |
| CPU usage | > 70% | CPU bottleneck |

### Logging for Performance

```typescript
app.addHook("onResponse", (request, reply, done) => {
  request.log.info({
    method: request.method,
    url: request.url,
    statusCode: reply.statusCode,
    responseTime: reply.elapsedTime,
    userId: request.user?.id,
  }, "Request completed");
  done();
});
```

### Database Query Logging

```typescript
// Enable slow query logging in Postgres
// postgresql.conf:
// log_min_duration_statement = 100  # Log queries > 100ms
```

---

## Performance Checklist

### Before Deployment

- [ ] Database indexes on frequently queried columns
- [ ] Connection pooling configured
- [ ] Redis caching for expensive operations
- [ ] Response compression enabled
- [ ] Static assets on CDN
- [ ] Images optimized (Next.js Image)
- [ ] Code splitting for large components
- [ ] React Query caching configured

### Ongoing Optimization

- [ ] Monitor p99 latency
- [ ] Review slow query logs
- [ ] Check cache hit ratios
- [ ] Profile memory usage
- [ ] Load test critical paths
- [ ] Review N+1 queries

### Quick Wins

1. **Add caching** - Even 60s cache helps
2. **Use pagination** - Never return unbounded lists
3. **Select specific fields** - Don't fetch entire rows
4. **Add indexes** - On filtered/sorted columns
5. **Compress responses** - For responses > 1KB
6. **Use optimistic updates** - Better perceived performance
