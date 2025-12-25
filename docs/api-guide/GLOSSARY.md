# API Glossary

**Quick reference for technical terms used throughout the API documentation.**

Jump to: [A](#a) · [B](#b) · [C](#c) · [D](#d) · [E](#e) · [I](#i) · [J](#j) · [M](#m) · [N](#n) · [O](#o) · [P](#p) · [R](#r) · [S](#s) · [T](#t) · [W](#w)

---

## A

### API Key
A long-lived authentication credential used for service-to-service communication and automated systems. Passed via `X-API-Key` header. More secure than sharing user passwords, can be revoked independently.

**Example:** `key_abc123xyz789`
**See:** [Authentication](./03-security/01-authentication.md#api-key-authentication)

### Async Operation
An operation that runs in the background and returns a job ID instead of the final result. Used for long-running tasks like report generation or bulk data processing.

**Example:** `POST /reports/generate` → Returns `job_id`, check status with `GET /jobs/{job_id}`
**See:** [Async Operations](./05-advanced-operations/06-async-operations.md)

---

## B

### Bearer Token
An authentication token sent in the `Authorization` header with the `Bearer` scheme. Typically a JWT containing user identity and permissions.

**Format:** `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
**See:** [Authentication](./03-security/01-authentication.md#bearer-token-primary)

### Bulk Operation
See [Batch Operation](#batch-operation)

### Batch Operation
An API endpoint that processes multiple resources in a single request. More efficient than individual requests but requires careful error handling.

**Example:** `POST /users/batch` with array of users to create
**See:** [Batch Create](./05-advanced-operations/01-batch-create.md)

---

## C

### Cursor
An opaque identifier pointing to a specific position in a dataset, used for cursor-based pagination. Unlike page numbers, cursors remain stable even when data changes.

**Format:** Typically an encoded ID or timestamp: `usr_abc123` or `eyJpZCI6MTIzfQ`
**See:** [Pagination](./02-data-operations/01-pagination.md#cursor-based-pagination)

### Cursor-Based Pagination
A pagination strategy using opaque cursors to navigate datasets. Provides consistent results even with concurrent writes. Best for large datasets (>100K records) or real-time data.

**Example:** `GET /events?cursor=evt_xyz789&limit=100`
**See:** [Pagination](./02-data-operations/01-pagination.md#cursor-based-pagination)

---

## D

### Dead Letter Queue (DLQ)
A holding area for messages/jobs that failed processing after maximum retry attempts. Allows manual inspection and reprocessing without blocking the main queue.

**Use case:** Webhook delivery failed 5 times → Move to DLQ for investigation
**See:** [Webhooks](./07-integrations/01-webhooks.md)

---

## E

### Eager Loading
A database query pattern that loads related resources in the same query to prevent N+1 query problems. Essential for `include` parameter implementations.

**Example (SQL):**
```sql
-- Eager loading addresses with users
SELECT users.*, JSON_AGG(addresses.*) as addresses
FROM users
LEFT JOIN addresses ON users.id = addresses.user_id
GROUP BY users.id
```

**Example (ORM):**
```typescript
await prisma.user.findMany({
  include: { addresses: true } // Eager loads addresses
});
```

**See:** [Field Selection](./02-data-operations/04-field-selection.md#n1-query-prevention)

---

## I

### Idempotency
A property where multiple identical requests have the same effect as a single request. Critical for safe retries and network reliability.

**Examples:**
- `GET /users/123` - Always returns same user (idempotent ✓)
- `PUT /users/123` - Replaces user, same result if repeated (idempotent ✓)
- `DELETE /users/123` - First call deletes, subsequent calls return 404 (idempotent ✓)
- `POST /users` - Creates multiple users if repeated (NOT idempotent ✗)

**Solution:** Use idempotency keys for non-idempotent operations
**See:** [Idempotency](./06-quality/02-idempotency.md)

### Idempotency Key
A unique client-generated identifier sent with non-idempotent requests to ensure the same request isn't processed twice.

**Format:** `Idempotency-Key: key_abc123xyz789`
**See:** [Idempotency](./06-quality/02-idempotency.md)

### Include Parameter
A query parameter specifying which related resources to load alongside the main resource. Uses eager loading to prevent N+1 queries.

**Format:** `?include=addresses,payment_methods`
**Standard:** Always use `include` (not `expand`)
**See:** [Field Selection](./02-data-operations/04-field-selection.md#include-related-resources)

---

## J

### JWT (JSON Web Token)
A compact, self-contained token format for securely transmitting information between parties. Contains three parts: header, payload (claims), and signature.

**Structure:** `header.payload.signature`
**Example payload:**
```json
{
  "sub": "usr_123",
  "email": "user@example.com",
  "tenantId": "org_abc",
  "exp": 1642352400
}
```

**Use case:** Access tokens, authentication
**See:** [Authentication](./03-security/01-authentication.md#access-token-format)
**External:** [jwt.io](https://jwt.io) · [RFC 7519](https://tools.ietf.org/html/rfc7519)

---

## M

### Multitenancy
An architecture where a single application instance serves multiple isolated customers (tenants). Each tenant's data is isolated from others.

**Isolation strategies:**
- Path-based: `/v1/orgs/{orgId}/posts`
- Subdomain-based: `acme.api.example.com`
- Header-based: `X-Tenant-ID: org_abc`

**See:** [Multitenancy](./01-core-concepts/05-multitenancy.md)

---

## N

### N+1 Query Problem
A performance anti-pattern where loading N items triggers N+1 database queries (1 for the list, N for each item's relations).

**Bad example (N+1):**
```typescript
const users = await db('users').select(); // 1 query
for (const user of users) {
  user.addresses = await db('addresses')
    .where('user_id', user.id); // N queries!
}
```

**Good example (eager loading):**
```typescript
const users = await prisma.user.findMany({
  include: { addresses: true } // 1-2 queries total
});
```

**See:** [Field Selection](./02-data-operations/04-field-selection.md#n1-query-prevention)

---

## O

### OAuth (Open Authorization)
An authorization framework allowing third-party applications to access user data without sharing passwords. Uses authorization codes and access tokens.

**Common flows:**
- Authorization Code: For web/mobile apps with users
- Client Credentials: For service-to-service

**See:** [Authentication](./03-security/01-authentication.md)

### Offset-Based Pagination
A pagination strategy using numeric offsets to skip records. Simple but slow at large offsets (LIMIT 50 OFFSET 100000 scans 100000 rows).

**Status:** Deprecated - use page-based or cursor-based instead
**See:** [Pagination](./02-data-operations/01-pagination.md#offset-based-pagination)

---

## P

### Page-Based Pagination
The default pagination strategy using page numbers and page sizes. Simple, predictable, and suitable for most use cases (<100K records).

**Format:** `?page=2&page_size=50`
**Default choice:** Use unless you need cursor-based
**See:** [Pagination](./02-data-operations/01-pagination.md#page-based-pagination)

### Permission
A granular access right to perform specific actions on resources. Format: `{resource}:{action}`

**Examples:**
- `users:read` - Can view users
- `invoices:write` - Can create/edit invoices
- `settings:admin` - Full settings control

**See:** [Authorization](./03-security/02-authorization.md#permission-format)

### Prefixed ID
A resource identifier with a type prefix for human readability and type safety.

**Format:** `{type}_{random}`
**Examples:** `usr_abc123`, `org_xyz789`, `inv_def456`
**See:** [Naming Conventions](./01-core-concepts/01-naming-conventions.md#resource-ids)

---

## R

### RBAC (Role-Based Access Control)
An authorization model where permissions are assigned to roles, and roles are assigned to users. Simplifies permission management at scale.

**Model:** User → Role → Permissions

**Example:**
- Role: `admin`
- Permissions: `users:*`, `settings:*`, `billing:*`
- User has role `admin` → User has all admin permissions

**See:** [Authorization](./03-security/02-authorization.md)

### REST (Representational State Transfer)
An architectural style for APIs using standard HTTP methods (GET, POST, PUT, PATCH, DELETE) and stateless communication.

**Principles:**
- Resources identified by URLs: `/users/123`
- Standard HTTP methods for operations
- Stateless: Each request contains all needed information
- JSON response format

**External:** [REST API Tutorial](https://restfulapi.net/)

---

## S

### Soft Delete
Marking a record as deleted without actually removing it from the database. Allows data recovery and maintains referential integrity.

**Implementation:** Set `deleted_at` timestamp, filter queries with `WHERE deleted_at IS NULL`
**Response:** Always return 200 OK with metadata (not 204)
**See:** [Soft Delete](./05-advanced-operations/04-soft-delete.md)

### Sparse Fieldset
Requesting only specific fields in an API response to reduce bandwidth and improve performance.

**Format:** `?fields=id,email,name`
**Benefit:** 80% bandwidth reduction for mobile clients
**See:** [Field Selection](./02-data-operations/04-field-selection.md#sparse-fieldsets)

---

## T

### Tenant
A customer/organization in a multi-tenant system. Each tenant's data is isolated from other tenants.

**Naming conventions:**
- URL path: `org_id` → `/v1/orgs/{org_id}/users`
- Database column: `tenant_id` → `WHERE tenant_id = ?`
- TypeScript variable: `tenantId` → `const tenantId = ...`

**See:** [Multitenancy](./01-core-concepts/05-multitenancy.md)
**See also:** [Terminology Mapping](./DOCUMENTATION-STANDARDS.md#tenant-vs-organization-naming)

### Tenant-Scoped
A permission or role that applies only within a specific tenant/organization. Same user can have different roles in different tenants.

**Example:** User A is `admin` in Org 1 but only `viewer` in Org 2

**See:** [Authorization](./03-security/02-authorization.md#multi-tenant-rbac-model)

---

## W

### Webhook
A user-defined HTTP callback that sends event notifications to external systems when specific actions occur.

**Flow:** Event occurs → API sends POST to webhook URL → External system processes

**Example:** User created → POST to `https://client.com/webhooks` with user data
**See:** [Webhooks](./07-integrations/01-webhooks.md)

---

## Quick Reference Tables

### HTTP Methods
| Method | Purpose | Idempotent | Request Body | Response Code |
|--------|---------|------------|--------------|---------------|
| GET | Retrieve | ✓ | No | 200 |
| POST | Create | ✗ | Yes | 201 |
| PUT | Replace | ✓ | Yes | 200 |
| PATCH | Update | ✗ | Yes | 200 |
| DELETE | Remove | ✓ | Optional | 200/204 |

### HTTP Status Codes (Common)
| Code | Name | When to Use |
|------|------|-------------|
| 200 | OK | Successful GET/PUT/PATCH/soft DELETE |
| 201 | Created | Successful POST (resource created) |
| 204 | No Content | Successful hard DELETE |
| 400 | Bad Request | Invalid request format |
| 401 | Unauthorized | Authentication required/failed |
| 403 | Forbidden | Authenticated but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 422 | Unprocessable Entity | Valid format but semantic error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |

**See:** [Error Codes](./04-error-handling/02-error-codes.md)

### Pagination Strategies
| Strategy | Default? | Best For | Max Records |
|----------|----------|----------|-------------|
| Page-based | ✓ | Most use cases | < 100K |
| Cursor-based | | Large datasets, real-time | Unlimited |
| Offset-based | | Legacy support only | Deprecated |

**See:** [Pagination](./02-data-operations/01-pagination.md)

---

## See Also

- [Documentation Standards](./DOCUMENTATION-STANDARDS.md) - Writing conventions
- [Naming Conventions](./01-core-concepts/01-naming-conventions.md) - Terminology standards
- [HTTP Methods](./01-core-concepts/02-http-methods.md) - REST operations
- [Authentication](./03-security/01-authentication.md) - Auth methods
- [Authorization](./03-security/02-authorization.md) - Permissions model

---

**Contributing:** If you encounter undefined terms in the documentation, please add them to this glossary.
