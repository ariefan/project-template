# Field Selection

**Related**: [Request/Response Format](../01-core-concepts/03-request-response-format.md) · [Performance](../06-quality/05-performance.md)

## Overview

Allow clients to select which fields to return, reducing bandwidth and improving performance.

## Sparse Fieldsets

Use `fields` parameter to select specific fields:

```
GET /users?fields=id,email,name
GET /products?fields=id,name,price
GET /invoices?fields=id,number,amount,status
```

**Full response (without fields parameter):**
```json
{
  "data": {
    "id": "usr_123",
    "email": "user@example.com",
    "name": "John Doe",
    "phone": "+1234567890",
    "address": "123 Main St",
    "city": "New York",
    "country": "US",
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-16T14:00:00Z",
    "last_login_at": "2024-01-20T09:00:00Z"
  }
}
```

**Sparse response (with fields=id,email,name):**
```json
{
  "data": {
    "id": "usr_123",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

## Nested Field Selection

Select nested fields using dot notation:

```
GET /users/usr_123?fields=id,name,profile.bio,profile.avatar_url
GET /orders/ord_456?fields=id,status,customer.name,customer.email
```

**Response:**
```json
{
  "data": {
    "id": "usr_123",
    "name": "John Doe",
    "profile": {
      "bio": "Software engineer",
      "avatar_url": "https://cdn.example.com/avatars/usr_123.jpg"
    }
  }
}
```

## Include Related Resources

**Standard parameter:** `include`

```
GET /users/usr_123?include=addresses,payment_methods
GET /invoices/inv_456?include=line_items,customer
GET /orders/ord_789?include=customer,items,shipping_address
```

**AI Instruction:** Always use `include` parameter for loading related resources. Some legacy APIs use `expand` - this is deprecated.

**Without include:**
```json
{
  "data": {
    "id": "usr_123",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**With include=addresses:**
```json
{
  "data": {
    "id": "usr_123",
    "email": "user@example.com",
    "name": "John Doe",
    "addresses": [
      {
        "id": "addr_789",
        "street": "123 Main St",
        "city": "New York",
        "country": "US"
      }
    ]
  }
}
```

## Combining fields and include

You can combine sparse fieldsets with related resource loading:

```
GET /users/usr_123?fields=id,name,email&include=addresses
GET /invoices/inv_789?fields=id,number,amount&include=line_items,customer
```

**Response:**
```json
{
  "data": {
    "id": "usr_123",
    "name": "John Doe",
    "email": "user@example.com",
    "addresses": [
      {
        "id": "addr_789",
        "street": "123 Main St",
        "city": "New York"
      }
    ]
  }
}
```

## Implementation

### Implementation Priority

**Phase 1: Sparse Fieldsets (Start Here)**
```typescript
GET /users?fields=id,email,name

// Simple implementation
const fields = req.query.fields?.split(',') || ['*'];
const users = await db('users').select(fields);
```

**Phase 2: Include Relations (Add When Needed)**
```typescript
GET /users?include=addresses

// With eager loading
const include = req.query.include ? { addresses: true } : undefined;
const users = await prisma.user.findMany({ include });
```

**Phase 3: Advanced (Optional)**
- Nested field selection (`fields=profile.bio`)
- Combining features
- Deep validation

**AI Instruction:** Implement Phase 1 first. Add Phase 2 only when related resources are needed. Skip Phase 3 unless explicitly required.

### SQL Select Generation

```typescript
function buildSelectClause(fields?: string): string[] {
  if (!fields) {
    return ['*']; // All fields
  }

  return fields.split(',').map(f => f.trim());
}

// Usage
const fields = buildSelectClause('id,email,name');
// ['id', 'email', 'name']

const query = db('users').select(fields);
// SELECT id, email, name FROM users
```

### ORM Integration (Prisma)

```typescript
interface ListUsersOptions {
  fields?: string;
  include?: string;
}

async function listUsers(tenantId: string, options: ListUsersOptions) {
  // Parse fields
  const select = options.fields
    ? options.fields.split(',').reduce((acc, field) => {
        acc[field.trim()] = true;
        return acc;
      }, {})
    : undefined;

  // Parse includes
  const include = options.include
    ? options.include.split(',').reduce((acc, relation) => {
        acc[relation.trim()] = true;
        return acc;
      }, {})
    : undefined;

  return prisma.user.findMany({
    where: { tenant_id: tenantId },
    select,
    include,
  });
}

// Example usage
const users = await listUsers('org_abc', {
  fields: 'id,email,name',
  include: 'addresses,payment_methods',
});
```

### Nested Field Selection

```typescript
function parseNestedFields(fields: string): object {
  const result = {};

  fields.split(',').forEach((field) => {
    const parts = field.trim().split('.');

    if (parts.length === 1) {
      // Top-level field
      result[parts[0]] = true;
    } else {
      // Nested field
      const [parent, ...nested] = parts;
      if (!result[parent]) {
        result[parent] = { select: {} };
      }
      result[parent].select[nested.join('.')] = true;
    }
  });

  return result;
}

// Example
const select = parseNestedFields('id,name,profile.bio,profile.avatar_url');
// {
//   id: true,
//   name: true,
//   profile: {
//     select: {
//       bio: true,
//       avatar_url: true
//     }
//   }
// }
```

## N+1 Query Prevention

When using `include`, ensure proper eager loading to avoid N+1 queries:

**❌ Bad (N+1 query):**
```typescript
// Fetches users
const users = await db('users').where('tenant_id', tenantId);

// For each user, fetches addresses (N queries)
for (const user of users) {
  user.addresses = await db('addresses').where('user_id', user.id);
}
```

**✅ Good (Eager loading):**
```typescript
// Single query with join
const users = await db('users')
  .where('users.tenant_id', tenantId)
  .leftJoin('addresses', 'users.id', 'addresses.user_id')
  .select(
    'users.*',
    db.raw('JSON_AGG(addresses.*) as addresses')
  )
  .groupBy('users.id');

// Or use ORM includes
const users = await prisma.user.findMany({
  where: { tenant_id: tenantId },
  include: { addresses: true },
});
```

## Performance Optimization

### Index for Common Field Combinations

```sql
-- Index frequently selected fields together
CREATE INDEX idx_users_list ON users(tenant_id, id, email, name);
CREATE INDEX idx_products_list ON products(tenant_id, id, name, price);
```

### Caching Sparse Responses

```typescript
function getCacheKey(resource: string, id: string, fields?: string): string {
  const fieldsKey = fields ? `:${fields}` : ':full';
  return `${resource}:${id}${fieldsKey}`;
}

// Example
const cacheKey = getCacheKey('users', 'usr_123', 'id,email,name');
// "users:usr_123:id,email,name"

const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);
```

### Security: Limit include Parameters

**CRITICAL:** Unrestricted `include` parameters enable N+1 query attacks and performance degradation.

**AI Instruction:** ALWAYS enforce these limits when implementing `include` parameter:

```typescript
// Security limits to prevent N+1 query attacks
const MAX_INCLUDES = 3;        // Max comma-separated relations
const MAX_INCLUDE_DEPTH = 2;   // Max nested levels (e.g., customer.addresses)

function validateInclude(include: string): void {
  if (!include) return;

  const relations = include.split(',').map(r => r.trim());

  // Limit 1: Max number of relations
  if (relations.length > MAX_INCLUDES) {
    throw new ValidationError(
      `Maximum ${MAX_INCLUDES} relations allowed per request. ` +
      `Requested: ${relations.length} (${relations.join(', ')})`
    );
  }

  // Limit 2: Max nesting depth
  relations.forEach((relation) => {
    const depth = relation.split('.').length;
    if (depth > MAX_INCLUDE_DEPTH) {
      throw new ValidationError(
        `Include depth exceeds maximum of ${MAX_INCLUDE_DEPTH}. ` +
        `Relation '${relation}' has depth ${depth}`
      );
    }
  });
}

// Usage in endpoint
app.get('/users', (req, res) => {
  validateInclude(req.query.include); // Throws if invalid

  const users = await listUsers(tenantId, {
    include: req.query.include
  });

  res.json({ data: users });
});
```

**Attack Prevention:**

```typescript
// ❌ ATTACK: Client requests too many relations
GET /users?include=addresses,payment_methods,sessions,orders,invoices,subscriptions

// Response: 400 Bad Request
{
  "error": {
    "code": "validation_error",
    "message": "Maximum 3 relations allowed per request. Requested: 6"
  }
}

// ❌ ATTACK: Client requests deep nesting (N+1 cascade)
GET /users?include=organization.teams.members.addresses

// Response: 400 Bad Request
{
  "error": {
    "code": "validation_error",
    "message": "Include depth exceeds maximum of 2. Relation 'organization.teams.members.addresses' has depth 4"
  }
}

// ✅ SAFE: Within limits
GET /users?include=addresses,payment_methods
```

**Why These Limits:**

| Limit | Value | Reason |
|-------|-------|--------|
| MAX_INCLUDES | 3 | Prevents database query explosion (3 joins = manageable) |
| MAX_INCLUDE_DEPTH | 2 | Prevents N+1 cascades (user.addresses is safe, user.org.teams.members is not) |

**Cardinality Protection:**

```typescript
// Additional protection: Limit results for has-many relations
const include = {
  addresses: {
    take: 10,  // Max 10 addresses per user
    orderBy: { created_at: 'desc' }
  },
  payment_methods: {
    take: 5    // Max 5 payment methods
  }
};

const users = await prisma.user.findMany({
  where: { tenant_id: tenantId },
  include,
  take: 50  // Max 50 users
});

// Prevents: 1000 users × 100 addresses = 100K rows
// Ensures: 50 users × 10 addresses = 500 rows max
```

## Benefits

- **Reduced bandwidth**: Send only needed fields (up to 80% reduction)
- **Faster responses**: Less serialization and data transfer
- **Better performance**: Fewer database columns fetched
- **Client control**: Clients choose exact data needed
- **Mobile-friendly**: Critical for low-bandwidth connections

## Example: Mobile API

Mobile clients typically request minimal fields:

```
GET /posts?fields=id,title,author.name,created_at&include=author
```

**Full desktop response:** 2.5 KB
**Mobile response:** 0.4 KB (84% reduction)

## Best Practices

1. **Default to Most Common Fields**
   - If no `fields` specified, return sensible defaults
   - Don't return sensitive fields by default

2. **Document Available Fields**
   - Provide field reference for each resource
   - Note which fields are expensive to compute

3. **Validate Field Names**
   - Reject invalid field names
   - Return clear error messages

```typescript
function validateFields(fields: string, validFields: string[]): void {
  const requested = fields.split(',').map(f => f.trim());
  const invalid = requested.filter(f => !validFields.includes(f));

  if (invalid.length > 0) {
    throw new Error(`Invalid fields: ${invalid.join(', ')}`);
  }
}
```

4. **Limit Include Complexity**
   - Max 2-3 levels of nesting
   - Max 5 related resources
   - Prevent circular includes

5. **Monitor Usage**
   - Track which fields are most requested
   - Optimize queries for common patterns

## Error Responses

**Invalid field:**
```json
{
  "error": {
    "code": "validation_error",
    "message": "Invalid field selection",
    "details": [
      {
        "field": "fields",
        "code": "invalid_field",
        "message": "Field 'password' is not selectable",
        "metadata": {
          "invalid_fields": ["password"],
          "available_fields": ["id", "email", "name", "created_at"]
        }
      }
    ]
  }
}
```

**Invalid include:**
```json
{
  "error": {
    "code": "validation_error",
    "message": "Invalid include parameter",
    "details": [
      {
        "field": "include",
        "code": "invalid_relation",
        "message": "Relation 'orders' does not exist on User",
        "metadata": {
          "available_relations": ["addresses", "payment_methods", "sessions"]
        }
      }
    ]
  }
}
```

## See Also

- [Request/Response Format](../01-core-concepts/03-request-response-format.md) - Standard response structure
- [Filtering and Search](./02-filtering-and-search.md) - Filter data before selection
- [Performance](../06-quality/05-performance.md) - Optimization techniques
- [Caching](../06-quality/03-caching.md) - Cache sparse responses
