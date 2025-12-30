# Naming Conventions

**Related**: [HTTP Methods](./02-http-methods.md) · [Multitenancy](./05-multitenancy.md)

## JSON Field Naming: camelCase

**This API uses camelCase for all JSON field names**, following the convention of modern JavaScript/TypeScript APIs (Google, Microsoft, Meta, Twitter, Salesforce).

**Why camelCase?**
- Native to JavaScript/TypeScript - no conversion needed
- Preferred by frontend/mobile developers
- Industry standard for modern web APIs
- Cleaner for JSON-heavy applications

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

Use **camelCase** for all query parameters.

**Common Parameters:**

**Pagination:**
```
?page=2&pageSize=50
?cursor=usr_xyz789&limit=100
?offset=100&limit=50
```

**Sorting:**
```
?orderBy=-createdAt
?orderBy=-price,name
```

**Filtering:**
```
?status=active&role=admin
?createdAfter=2024-01-01T00:00:00Z
?priceGte=100&priceLte=500
```

**Field Selection:**
```
?fields=id,email,name
?include=addresses,paymentMethods
?expand=organization,createdBy
```

**Search:**
```
?search=john+doe
?q=laptop
```

**Examples:**
```
GET /users?page=2&pageSize=50&orderBy=-createdAt
GET /invoices?status=paid&createdAfter=2024-01-01&include=lineItems
GET /products?search=laptop&categoryId=cat_123&minPrice=500&maxPrice=1000
```

## Field Names (JSON)

Use **camelCase** for all JSON field names.

**Correct:**
```json
{
  "userId": "usr_123",
  "firstName": "John",
  "lastName": "Doe",
  "emailAddress": "john@example.com",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "isActive": true,
  "metadata": {
    "lastLoginIp": "192.168.1.1",
    "loginCount": 42
  }
}
```

**Incorrect:**
```json
{
  "user_id": "usr_123",          ❌ snake_case
  "FirstName": "John",           ❌ PascalCase
  "email-address": "john@...",   ❌ kebab-case
  "created_at": "2024-01-15"     ❌ Wrong date format (also snake_case)
}
```

## Error Codes

Use **camelCase** for error codes to match JSON field naming convention.

**Examples:**
```json
{
  "error": {
    "code": "validationError",
    "message": "The request data is invalid",
    "details": [
      {
        "field": "email",
        "code": "invalidFormat",
        "message": "Email address is not valid"
      }
    ]
  }
}
```

**Standard error codes:** `badRequest`, `validationError`, `unauthorized`, `forbidden`, `notFound`, `conflict`, `rateLimitExceeded`, `internalError`

**Validation codes:** `required`, `invalidFormat`, `invalidType`, `outOfRange`, `tooShort`, `tooLong`, `alreadyExists`

**See:** [Error Codes](../04-error-handling/02-error-codes.md)

## Boolean Fields

Prefix with `is`, `has`, `can`, or `should` for clarity (using camelCase).

**Examples:**
```json
{
  "isActive": true,
  "isVerified": false,
  "hasSubscription": true,
  "hasPaymentMethod": false,
  "canEdit": true,
  "canDelete": false,
  "shouldNotify": true,
  "shouldSendEmail": false
}
```

## Date and Time Fields

Use **ISO 8601 format** with UTC timezone.

**Format:** `YYYY-MM-DDTHH:mm:ss.sssZ`

**Examples:**
```json
{
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-16T14:45:30.500Z",
  "deletedAt": null,
  "scheduledFor": "2024-02-01T09:00:00.000Z"
}
```

**Suffix conventions:**
- `At` suffix for timestamps: `createdAt`, `updatedAt`, `deletedAt`
- `Date` suffix for date-only: `birthDate`, `startDate`, `endDate`
- `On` suffix for legacy compatibility (avoid in new APIs)

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

GET    /v1/orgs/org_abc/invoices?status=paid&orderBy=createdAt
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
    "firstName": "John",
    "lastName": "Doe",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-16T14:20:00.000Z",
    "metadata": {
      "lastLoginAt": "2024-01-16T09:00:00.000Z",
      "loginCount": 42
    }
  }
}
```

## See Also

- [HTTP Methods](./02-http-methods.md) - How to use HTTP verbs correctly
- [Request/Response Format](./03-request-response-format.md) - Complete request/response structure
- [Multitenancy](./05-multitenancy.md) - Tenant identification strategies
- [Filtering and Search](../02-data-operations/02-filtering-and-search.md) - Query parameter details
