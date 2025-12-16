# Naming Conventions

**Related**: [HTTP Methods](./02-http-methods.md) · [Multitenancy](./05-multitenancy.md)

## URL Structure

```
https://api.{domain}/{version}/{tenant-id}/{collection}/{resource-id}/{sub-resource}
```

**Example:**
```
https://api.example.com/v1/orgs/acme-corp/users/usr_abc123/sessions
```

**Components:**
- `api.example.com` - API domain
- `v1` - API version
- `orgs/acme-corp` - Tenant identifier
- `users` - Resource collection
- `usr_abc123` - Resource ID
- `sessions` - Sub-resource

## Collection Names

Use **plural nouns** in lowercase with hyphens for multi-word names.

**Correct:**
```
/users
/invoice-items
/payment-methods
/user-profiles
```

**Incorrect:**
```
/user              ❌ Singular
/invoiceItems      ❌ camelCase
/payment_method    ❌ Singular + underscore
/UserProfiles      ❌ PascalCase
```

## Resource IDs

Use **prefixed identifiers** for type safety and debugging.

**Format:** `{type}_{random_string}`

See [Naming Consistency](#naming-consistency) table below for standard prefixes.

**Benefits:**
- Type-safe: Know what the ID represents
- Debuggable: Easy to identify in logs
- Collision-resistant: Random suffix prevents conflicts
- Human-readable: Prefix indicates resource type

**Implementation:**
```typescript
function generateId(prefix: string): string {
  const random = crypto.randomBytes(6).toString('base64url');
  return `${prefix}_${random}`;
}

// Usage
const userId = generateId('usr');     // usr_k7m3p9n2
const orgId = generateId('org');      // org_2h8k5m9p
```

## Sub-Resources

Represent **hierarchical relationships** naturally in the URL.

**Correct:**
```
/users/usr_123/addresses
/organizations/org_456/projects/prj_789/tasks
/invoices/inv_123/line-items
```

**Guidelines:**
- Maximum 3 levels deep for readability
- Use when resources are tightly coupled
- Parent ID required to access child

## Query Parameters

Use **snake_case** for all query parameters.

**Common Parameters:**

**Pagination:**
```
?page=2&page_size=50
?cursor=usr_xyz789&limit=100
?offset=100&limit=50
```

**Sorting:**
```
?order_by=-created_at
?order_by=-price,name
```

**Filtering:**
```
?status=active&role=admin
?created_after=2024-01-01T00:00:00Z
?price_gte=100&price_lte=500
```

**Field Selection:**
```
?fields=id,email,name
?include=addresses,payment_methods
?expand=organization,created_by
```

**Search:**
```
?search=john+doe
?q=laptop
```

**Examples:**
```
GET /users?page=2&page_size=50&order_by=-created_at
GET /invoices?status=paid&created_after=2024-01-01&include=line_items
GET /products?search=laptop&category_id=cat_123&min_price=500&max_price=1000
```

## Field Names (JSON)

Use **snake_case** for all JSON field names.

**Correct:**
```json
{
  "user_id": "usr_123",
  "first_name": "John",
  "last_name": "Doe",
  "email_address": "john@example.com",
  "created_at": "2024-01-15T10:30:00.000Z",
  "is_active": true,
  "metadata": {
    "last_login_ip": "192.168.1.1",
    "login_count": 42
  }
}
```

**Incorrect:**
```json
{
  "userId": "usr_123",           ❌ camelCase
  "FirstName": "John",           ❌ PascalCase
  "email-address": "john@...",   ❌ kebab-case
  "created_at": "2024-01-15"     ❌ Wrong date format
}
```

## Boolean Fields

Prefix with `is_`, `has_`, `can_`, or `should_` for clarity.

**Examples:**
```json
{
  "is_active": true,
  "is_verified": false,
  "has_subscription": true,
  "has_payment_method": false,
  "can_edit": true,
  "can_delete": false,
  "should_notify": true,
  "should_send_email": false
}
```

## Date and Time Fields

Use **ISO 8601 format** with UTC timezone.

**Format:** `YYYY-MM-DDTHH:mm:ss.sssZ`

**Examples:**
```json
{
  "created_at": "2024-01-15T10:30:00.000Z",
  "updated_at": "2024-01-16T14:45:30.500Z",
  "deleted_at": null,
  "scheduled_for": "2024-02-01T09:00:00.000Z"
}
```

**Suffix conventions:**
- `_at` for timestamps: `created_at`, `updated_at`, `deleted_at`
- `_date` for date-only: `birth_date`, `start_date`, `end_date`
- `_on` for legacy compatibility (avoid in new APIs)

## Forbidden Patterns

**Do NOT use:**

❌ **Verbs in URLs:**
```
/getUsers
/createInvoice
/deleteUser
```
Use HTTP methods instead (GET, POST, DELETE).

❌ **File extensions:**
```
/users.json
/invoices.xml
```
Use `Accept` header instead.

❌ **Trailing slashes:**
```
/users/
/invoices/
```
Use `/users` and `/invoices`.

❌ **Underscores in URLs:**
```
/user_profiles
/payment_methods
```
Use hyphens: `/user-profiles`, `/payment-methods`.

❌ **CamelCase in URLs:**
```
/userProfiles
/paymentMethods
```
Use lowercase with hyphens.

## Custom Actions

For operations that don't fit CRUD, use `/actions/` with verbs.

**Format:** `POST /{resource}/{id}/actions/{action-name}`

**Examples:**
```
POST /invoices/inv_123/actions/send
POST /users/usr_456/actions/reset-password
POST /orders/ord_789/actions/cancel
POST /reports/actions/generate
```

**Guidelines:**
- Always use POST method
- Use kebab-case for action names
- Place at end of URL path
- Include idempotency key for critical actions

## Naming Consistency

**Maintain a glossary** of standard terms:

| Term | Meaning | ID Prefix |
|------|---------|-----------|
| user | Individual person with account | usr_ |
| organization | Tenant/company account | org_ |
| workspace | Isolated environment within org | wsp_ |
| project | Collection of related work | prj_ |
| task | Individual work item | tsk_ |
| invoice | Billing document | inv_ |
| payment | Payment transaction | pay_ |
| subscription | Recurring service | sub_ |
| api_key | API authentication key | key_ |
| webhook | Webhook endpoint | whk_ |
| session | User session | ses_ |
| token | Authentication token | tok_ |

## Examples

### Good API URLs

```
GET    /v1/orgs/org_abc/users
POST   /v1/orgs/org_abc/users
GET    /v1/orgs/org_abc/users/usr_123
PATCH  /v1/orgs/org_abc/users/usr_123
DELETE /v1/orgs/org_abc/users/usr_123

GET    /v1/orgs/org_abc/invoices?status=paid&sort_by=created_at
POST   /v1/orgs/org_abc/invoices/inv_456/actions/send
GET    /v1/orgs/org_abc/users/usr_123/payment-methods

POST   /v1/orgs/org_abc/users/batch
POST   /v1/orgs/org_abc/users/batch/soft-delete
POST   /v1/orgs/org_abc/users/usr_123/restore
```

### Good JSON Responses

```json
{
  "data": {
    "id": "usr_abc123",
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "is_active": true,
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-16T14:20:00.000Z",
    "metadata": {
      "last_login_at": "2024-01-16T09:00:00.000Z",
      "login_count": 42
    }
  }
}
```

## See Also

- [HTTP Methods](./02-http-methods.md) - How to use HTTP verbs correctly
- [Request/Response Format](./03-request-response-format.md) - Complete request/response structure
- [Multitenancy](./05-multitenancy.md) - Tenant identification strategies
- [Filtering and Search](../02-data-operations/02-filtering-and-search.md) - Query parameter details
