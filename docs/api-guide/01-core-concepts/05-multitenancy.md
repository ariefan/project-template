# Multitenancy

**Related**: [Naming Conventions](./01-naming-conventions.md) · [Authorization](../03-security/02-authorization.md) · [Audit Logging](../06-quality/01-audit-logging.md)

## Overview

Multitenancy allows a single API instance to serve multiple customers (tenants) while maintaining complete data isolation.

**Key principles:**
- Complete data isolation between tenants
- No cross-tenant data access
- Tenant context in every request
- Audit trail per tenant

## Tenant Identification Strategies

### Path-based (Recommended for SaaS)

**Format:**
```
/v1/{tenant-type}/{tenant-id}/{resource}
```

**Examples:**
```
GET /v1/orgs/acme-corp/users
GET /v1/orgs/org_abc123/invoices
GET /v1/tenants/tenant_xyz789/projects
```

**Advantages:**
- ✅ Explicit tenant context
- ✅ Easy to route and cache
- ✅ Clear in logs and monitoring
- ✅ Works with all HTTP clients
- ✅ Tenant visible in URL

**Disadvantages:**
- ❌ Longer URLs
- ❌ Tenant ID exposed in URL

### Header-based

**Format:**
```http
GET /v1/users HTTP/1.1
X-Tenant-ID: org_abc123
```

**Advantages:**
- ✅ Shorter URLs
- ✅ Tenant not in URL
- ✅ Easy to switch tenants

**Disadvantages:**
- ❌ Less explicit
- ❌ Harder to debug
- ❌ Caching more complex
- ❌ Requires custom headers

### Subdomain-based

**Format:**
```
https://acme-corp.api.example.com/v1/users
https://tenant-xyz.api.example.com/v1/invoices
```

**Advantages:**
- ✅ Clean URLs
- ✅ Natural tenant isolation
- ✅ Easy SSL per tenant
- ✅ Good for white-labeling

**Disadvantages:**
- ❌ DNS management overhead
- ❌ SSL certificate per subdomain
- ❌ More complex infrastructure
- ❌ CORS complications

### Recommendation

**Use path-based for:**
- Most SaaS applications
- B2B platforms
- Internal tools
- When tenant count is high

**Use subdomain-based for:**
- White-label solutions
- Enterprise customers
- When tenant count is low
- Custom branding required

**Use header-based for:**
- Internal microservices
- Service-to-service communication
- When URL length is critical

## Tenant Types

### Organization (org)

**Identifier:** `org_{id}`

```
/v1/orgs/org_abc123/users
/v1/orgs/acme-corp/projects
```

**Use when:**
- B2B SaaS
- Company accounts
- Team collaboration tools

### Workspace (wsp)

**Identifier:** `wsp_{id}`

```
/v1/workspaces/wsp_xyz789/documents
/v1/orgs/org_abc/workspaces/wsp_xyz/projects
```

**Use when:**
- Multiple environments per org
- Sandbox vs production
- Department isolation

### Account (acc)

**Identifier:** `acc_{id}`

```
/v1/accounts/acc_123456/billing
```

**Use when:**
- B2C applications
- Individual user accounts
- Personal data

## Tenant Isolation

### Database Level

**Separate Databases (Highest Isolation)**
```
database: tenant_org_abc123
database: tenant_org_def456
database: tenant_org_ghi789
```

**Advantages:**
- ✅ Complete isolation
- ✅ Easy backup/restore per tenant
- ✅ Independent scaling
- ✅ Compliance-friendly

**Disadvantages:**
- ❌ High overhead
- ❌ Schema migration complexity
- ❌ Cost inefficient for many tenants

**Separate Schemas (Medium Isolation)**
```
schema: tenant_org_abc123
schema: tenant_org_def456
schema: tenant_org_ghi789
```

**Advantages:**
- ✅ Good isolation
- ✅ Single database instance
- ✅ Easier migrations than separate DBs

**Disadvantages:**
- ❌ Still overhead per tenant
- ❌ Complex query routing

**Shared Tables with tenantId (Recommended)**
```sql
CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY,
  tenantId VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_email_per_tenant UNIQUE (tenantId, email)
);

CREATE INDEX idx_users_tenant ON users(tenantId);
```

**Advantages:**
- ✅ Cost-effective
- ✅ Simple to manage
- ✅ Easy migrations
- ✅ Good for high tenant count

**Disadvantages:**
- ❌ Requires careful filtering
- ❌ Risk of data leakage if bugs
- ❌ All tenants share resources

### Query Filtering

**Always filter by tenantId:**

```sql
-- ✅ Correct
SELECT * FROM users
WHERE tenantId = 'org_abc123'
  AND email = 'user@example.com';

-- ❌ WRONG - Missing tenant filter
SELECT * FROM users
WHERE email = 'user@example.com';
```

### Application Level

**Middleware enforcement:**

```typescript
// Express.js example
function tenantMiddleware(req, res, next) {
  const tenantId = req.params.org_id || req.headers['x-tenant-id'];

  if (!tenantId) {
    return res.status(400).json({
      error: {
        code: 'missing_tenant',
        message: 'Tenant identifier is required'
      }
    });
  }

  // Verify user has access to tenant
  if (!userHasAccessToTenant(req.user.id, tenantId)) {
    return res.status(403).json({
      error: {
        code: 'forbidden',
        message: 'Access to this tenant is not allowed'
      }
    });
  }

  // Attach to request
  req.tenantId = tenantId;
  next();
}

app.use('/v1/orgs/:org_id', tenantMiddleware);
```

**Query helper:**

```typescript
// Knex.js example
function forTenant(tenantId: string) {
  return function(queryBuilder) {
    queryBuilder.where('tenantId', tenantId);
  };
}

// Usage - Always includes tenant filter
const users = await db('users')
  .modify(forTenant(req.tenantId))
  .where('is_active', true);
```

## Tenant Context in Responses

Include tenant information in responses:

```json
{
  "data": {
    "id": "usr_123",
    "email": "user@example.com"
  },
  "meta": {
    "requestId": "req_xyz789",
    "tenantId": "org_abc123",
    "tenantName": "Acme Corp"
  }
}
```

## Cross-Tenant Resources

Some resources may be shared or global.

### Global Resources

```
GET /v1/global/templates
GET /v1/global/integrations
GET /v1/public/status
```

### Tenant-specific Resources

```
GET /v1/orgs/org_abc/templates          # Org's custom templates
GET /v1/orgs/org_abc/integrations       # Org's integrations
```

### Merged View

```
GET /v1/orgs/org_abc/available-templates
```

**Response:**
```json
{
  "data": [
    {
      "id": "tpl_global_001",
      "name": "Invoice Template",
      "scope": "global",
      "isCustom": false
    },
    {
      "id": "tpl_org_abc_001",
      "name": "Custom Invoice",
      "scope": "tenant",
      "isCustom": true,
      "tenantId": "org_abc123"
    }
  ]
}
```

## Tenant Switching

### User with Multiple Tenants

```json
{
  "user": {
    "id": "usr_123",
    "email": "user@example.com",
    "tenants": [
      {
        "tenantId": "org_abc123",
        "tenantName": "Acme Corp",
        "role": "admin"
      },
      {
        "tenantId": "org_def456",
        "tenantName": "Beta Inc",
        "role": "member"
      }
    ]
  }
}
```

### Switch Tenant Endpoint

```
POST /v1/users/usr_123/actions/switch-tenant
{
  "tenantId": "org_def456"
}
```

**Response:**
```json
{
  "data": {
    "userId": "usr_123",
    "activeTenantId": "org_def456",
    "activeTenantName": "Beta Inc",
    "role": "member",
    "permissions": ["users:read", "projects:read"]
  }
}
```

## Tenant Validation Rules

**Always validate:**
1. Tenant exists
2. Tenant is active
3. User has access to tenant
4. Resource belongs to tenant
5. Tenant has feature access

**Validation middleware:**

```typescript
async function validateTenant(tenantId: string, userId: string) {
  // 1. Check tenant exists and is active
  const tenant = await db('tenants')
    .where({ id: tenantId, is_active: true })
    .first();

  if (!tenant) {
    throw new NotFoundError('Tenant not found or inactive');
  }

  // 2. Check user has access
  const membership = await db('tenant_memberships')
    .where({ tenantId: tenantId, user_id: userId, is_active: true })
    .first();

  if (!membership) {
    throw new ForbiddenError('Access to tenant denied');
  }

  return { tenant, membership };
}
```

## Tenant-scoped Operations

### List Resources

```
GET /v1/orgs/org_abc123/users
```

**SQL:**
```sql
SELECT * FROM users
WHERE tenantId = 'org_abc123'
  AND deleted_at IS NULL
ORDER BY created_at DESC;
```

### Create Resource

```
POST /v1/orgs/org_abc123/users
{
  "email": "user@example.com",
  "name": "John Doe"
}
```

**SQL:**
```sql
INSERT INTO users (id, tenantId, email, name, created_at)
VALUES ('usr_xyz789', 'org_abc123', 'user@example.com', 'John Doe', NOW());
```

**Always set tenantId from URL, never from request body.**

### Update Resource

```
PATCH /v1/orgs/org_abc123/users/usr_xyz789
{
  "name": "Jane Doe"
}
```

**SQL:**
```sql
UPDATE users
SET name = 'Jane Doe', updated_at = NOW()
WHERE id = 'usr_xyz789'
  AND tenantId = 'org_abc123';  -- Prevent cross-tenant updates
```

### Delete Resource

```
DELETE /v1/orgs/org_abc123/users/usr_xyz789
```

**SQL:**
```sql
UPDATE users
SET deleted_at = NOW(), deleted_by = 'usr_admin_123'
WHERE id = 'usr_xyz789'
  AND tenantId = 'org_abc123';  -- Prevent cross-tenant deletes
```

## Audit Logging

Track all operations with tenant context:

```json
{
  "eventId": "evt_abc123",
  "eventType": "user.created",
  "tenantId": "org_abc123",
  "tenantName": "Acme Corp",
  "actor": {
    "type": "user",
    "id": "usr_123",
    "email": "admin@acme.com"
  },
  "resource": {
    "type": "user",
    "id": "usr_456"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

See [Audit Logging](../06-quality/01-audit-logging.md) for details.

## Security Best Practices

### 1. Never Trust Client Input

```typescript
// ❌ WRONG - Client controls tenant
app.post('/users', async (req, res) => {
  const { tenantId, email, name } = req.body;
  await createUser({ tenantId, email, name });
});

// ✅ CORRECT - Server controls tenant
app.post('/orgs/:org_id/users', async (req, res) => {
  const tenantId = req.params.org_id;  // From URL
  const { email, name } = req.body;
  await createUser({ tenantId, email, name });
});
```

### 2. Double-Check Ownership

```typescript
// Verify resource belongs to tenant
async function getUser(userId: string, tenantId: string) {
  const user = await db('users')
    .where({ id: userId, tenantId: tenantId })
    .first();

  if (!user) {
    throw new NotFoundError('User not found');
  }

  return user;
}
```

### 3. Index All Tenant Queries

```sql
-- Performance indexes
CREATE INDEX idx_users_tenant ON users(tenantId);
CREATE INDEX idx_users_tenant_email ON users(tenantId, email);
CREATE INDEX idx_users_tenant_created ON users(tenantId, created_at DESC);
```

### 4. Cache with Tenant Key

```typescript
// Include tenant in cache key
const cacheKey = `users:${tenantId}:${userId}`;
const user = await cache.get(cacheKey);
```

### 5. Log Tenant Context

```typescript
logger.info('User created', {
  tenantId: tenantId,
  user_id: userId,
  actor_id: actorId,
  request_id: requestId
});
```

## Examples

### Complete Request Flow

```http
POST /v1/orgs/org_abc123/users HTTP/1.1
Host: api.example.com
Authorization: Bearer {token}
Content-Type: application/json

{
  "email": "newuser@example.com",
  "name": "John Doe"
}
```

**Server processing:**
```typescript
1. Extract tenantId from URL: "org_abc123"
2. Verify tenant exists and is active
3. Verify user has access to org_abc123
4. Create user with tenantId = "org_abc123"
5. Log audit event with tenantId
6. Return response with tenant context
```

**Response:**
```json
{
  "data": {
    "id": "usr_xyz789",
    "email": "newuser@example.com",
    "name": "John Doe",
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "meta": {
    "tenantId": "org_abc123",
    "tenantName": "Acme Corp"
  }
}
```

## See Also

- [Naming Conventions](./01-naming-conventions.md) - URL structure with tenant IDs
- [Authorization](../03-security/02-authorization.md) - Tenant-based permissions
- [Audit Logging](../06-quality/01-audit-logging.md) - Tracking tenant operations
- [Security Best Practices](../03-security/04-security-best-practices.md) - Tenant security
