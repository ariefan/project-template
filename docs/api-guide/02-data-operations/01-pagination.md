# Pagination

**Related**: [HTTP Methods](../01-core-concepts/02-http-methods.md) · [Request/Response Format](../01-core-concepts/03-request-response-format.md)

## Overview

Pagination divides large result sets into manageable chunks.

**DEFAULT: Use page-based pagination** for most applications.

## Default Strategy: Page-Based Pagination

**AI Instruction:** Implement page-based pagination UNLESS you have specific requirements for cursor-based.

### When to Use Each Strategy

**Decision logic:**
```
Will you have > 100,000 records AND concurrent writes?
├─ YES → Use cursor-based (prevents duplicates during pagination)
└─ NO  → Use page-based (simpler, works for 95% of cases)
```

**Strategy comparison:**

| Strategy | Use When | Pros | Cons |
|----------|----------|------|------|
| **Page-based** ← DEFAULT | < 100K records, need page numbers | Simple, predictable, page jumping | Duplicates possible with concurrent writes |
| **Cursor-based** | > 100K records, real-time data | Consistent, no duplicates | No random page access |
| **Offset-based** | Never (deprecated) | - | Slow performance at scale |

**AI Instruction:** Start with page-based. Only use cursor-based if dataset > 100K records with concurrent writes.

## Page-Based Pagination

**Best for:** UI-driven navigation, known page counts

**Request:**
```
GET /v1/orgs/{org_id}/users?page=2&page_size=50
```

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "page_size": 50,
    "total_pages": 10,
    "total_count": 487,
    "has_next": true,
    "has_previous": true,
    "links": {
      "first": "/v1/orgs/{org_id}/users?page=1&page_size=50",
      "previous": "/v1/orgs/{org_id}/users?page=1&page_size=50",
      "next": "/v1/orgs/{org_id}/users?page=3&page_size=50",
      "last": "/v1/orgs/{org_id}/users?page=10&page_size=50"
    }
  }
}
```

**SQL Implementation:**
```sql
SELECT * FROM users
WHERE tenant_id = 'org_abc123'
ORDER BY created_at DESC
LIMIT 50 OFFSET 50;  -- page=2, page_size=50
```

## Cursor-Based Pagination

**Best for:** Real-time data, large datasets, consistent ordering

**Request:**
```
GET /v1/orgs/{org_id}/events?cursor=evt_xyz789&limit=100
```

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "limit": 100,
    "has_next": true,
    "next_cursor": "evt_abc123",
    "previous_cursor": "evt_def456"
  }
}
```

**SQL Implementation:**
```sql
SELECT * FROM events
WHERE tenant_id = 'org_abc123'
  AND id < 'evt_xyz789'  -- cursor
ORDER BY id DESC
LIMIT 100;
```

**TypeScript Implementation:**
```typescript
interface CursorPagination {
  cursor?: string;
  limit?: number;
}

async function listWithCursor(tenantId: string, options: CursorPagination) {
  const limit = Math.min(options.limit || 50, 100);
  const query = db('events')
    .where('tenant_id', tenantId)
    .orderBy('id', 'desc')
    .limit(limit + 1);  // Fetch one extra to check has_next

  if (options.cursor) {
    query.where('id', '<', options.cursor);
  }

  const results = await query;
  const has_next = results.length > limit;
  const data = has_next ? results.slice(0, limit) : results;

  return {
    data,
    pagination: {
      limit,
      has_next,
      next_cursor: has_next ? data[data.length - 1].id : null,
    },
  };
}
```

## Offset-Based Pagination

**Best for:** Random access, SQL-friendly

**Request:**
```
GET /v1/orgs/{org_id}/products?offset=100&limit=50
```

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "offset": 100,
    "limit": 50,
    "total_count": 1523,
    "has_next": true
  }
}
```

**SQL Implementation:**
```sql
SELECT * FROM products
WHERE tenant_id = 'org_abc123'
ORDER BY name ASC
LIMIT 50 OFFSET 100;
```

## Default Values

| Parameter | Default | Maximum |
|-----------|---------|---------|
| page | 1 | - |
| page_size | 50 | 100 |
| limit | 50 | 100 |
| offset | 0 | - |

**Enforce maximum:**
```typescript
const pageSize = Math.min(req.query.page_size || 50, 100);
```

**Warning when capped:**
```json
{
  "data": [...],
  "pagination": {
    "page_size": 100,
    "requested_page_size": 500
  },
  "warnings": [
    {
      "code": "page_size_capped",
      "message": "Requested page_size of 500 exceeds maximum of 100"
    }
  ]
}
```

## Performance Optimization

**Index for pagination:**
```sql
CREATE INDEX idx_users_tenant_created ON users(tenant_id, created_at DESC);
CREATE INDEX idx_events_tenant_id ON events(tenant_id, id DESC);
```

**Avoid COUNT(*) for large tables:**
```typescript
// Instead of exact count
const total_count = await db('users').where('tenant_id', tenantId).count();

// Use estimated count or omit
const has_next = results.length > limit;
```

## See Also

- [Filtering and Search](./02-filtering-and-search.md) - Combine with filters
- [Sorting](./03-sorting.md) - Order results
- [Performance](../06-quality/05-performance.md) - Optimization tips
