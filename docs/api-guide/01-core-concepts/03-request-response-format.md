# Request and Response Format

**Related**: [HTTP Methods](./02-http-methods.md) · [Error Handling](../04-error-handling/01-error-structure.md) · [Naming Conventions](./01-naming-conventions.md)

## Content Type

**Default:** `application/json`

**Request headers:**
```http
Content-Type: application/json
Accept: application/json
```

**Response headers:**
```http
Content-Type: application/json; charset=utf-8
```

## Request Format

### Basic Request

```http
POST /v1/orgs/{orgId}/users HTTP/1.1
Host: api.example.com
Authorization: Bearer {token}
Content-Type: application/json
Idempotency-Key: idem_abc123xyz

{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "member"
}
```

### Required Headers

| Header | Required | Description |
|--------|----------|-------------|
| Authorization | Yes* | Bearer token or API key |
| Content-Type | Yes** | Must be `application/json` |
| Idempotency-Key | Optional | For idempotent operations |

*Except public endpoints
**For requests with body

## Response Format

### Single Resource Response

```json
{
  "data": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "member",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-16T14:20:00.000Z"
  },
  "meta": {
    "requestId": "req_xyz789",
    "timestamp": "2024-01-16T14:20:00.000Z"
  }
}
```

### Collection Response

```json
{
  "data": [
    {
      "id": "usr_123",
      "email": "user1@example.com",
      "name": "John Doe"
    },
    {
      "id": "usr_456",
      "email": "user2@example.com",
      "name": "Jane Smith"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "totalPages": 10,
    "totalCount": 487,
    "hasNext": true,
    "hasPrevious": false,
    "links": {
      "first": "/v1/orgs/{orgId}/users?page=1",
      "previous": null,
      "next": "/v1/orgs/{orgId}/users?page=2",
      "last": "/v1/orgs/{orgId}/users?page=10"
    }
  },
  "meta": {
    "requestId": "req_xyz789",
    "timestamp": "2024-01-16T14:20:00.000Z"
  }
}
```

### Response with Warnings

```json
{
  "data": {
    "id": "usr_abc123",
    "email": "user@example.com"
  },
  "warnings": [
    {
      "code": "endpointDeprecated",
      "message": "This endpoint version will be sunset on 2025-12-31",
      "documentationUrl": "https://docs.example.com/migrations/v1-to-v2"
    },
    {
      "code": "pageSizeCapped",
      "message": "Requested pageSize of 500 exceeds maximum of 100"
    }
  ],
  "meta": {
    "requestId": "req_xyz789",
    "timestamp": "2024-01-16T14:20:00.000Z"
  }
}
```

## Field Naming

### Use camelCase

**Correct:**
```json
{
  "userId": "usr_123",
  "firstName": "John",
  "lastName": "Doe",
  "emailAddress": "john@example.com",
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

**Incorrect:**
```json
{
  "userId": "usr_123",           ❌ camelCase
  "FirstName": "John",           ❌ PascalCase
  "last-name": "Doe",            ❌ kebab-case
  "EMAIL_ADDRESS": "john@..."    ❌ UPPER_CASE
}
```

## Data Types

### String

```json
{
  "name": "John Doe",
  "description": "Software Engineer",
  "note": null
}
```

### Number

```json
{
  "age": 30,
  "price": 99.99,
  "quantity": 5,
  "taxRate": 0.08
}
```

**Guidelines:**
- Use integers for counts, IDs (when numeric)
- Use floats for monetary values, percentages
- Store currency as smallest unit (cents) to avoid floating point issues

**Monetary values:**
```json
{
  "amount": 1999,
  "currency": "USD",
  "formattedAmount": "$19.99"
}
```

### Boolean

Use lowercase `true` or `false`.

```json
{
  "isActive": true,
  "isVerified": false,
  "hasSubscription": true,
  "canEdit": false
}
```

**Prefix with:**
- `is` for state: `isActive`, `isDeleted`
- `has` for possession: `hasSubscription`, `hasPaymentMethod`
- `can` for ability: `canEdit`, `canDelete`
- `should` for intention: `shouldNotify`, `shouldSendEmail`

### Date and Time

**Format:** ISO 8601 with UTC timezone

```json
{
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-16T14:45:30.500Z",
  "deletedAt": null,
  "scheduledFor": "2024-02-01T09:00:00.000Z"
}
```

**Pattern:** `YYYY-MM-DDTHH:mm:ss.sssZ`

**Examples:**
```json
{
  "dateOnly": "2024-01-15",
  "datetimeUtc": "2024-01-15T10:30:00.000Z",
  "datetimeWithMs": "2024-01-15T10:30:00.123Z"
}
```

### Arrays

```json
{
  "tags": ["engineering", "backend", "api"],
  "userIds": ["usr_123", "usr_456", "usr_789"],
  "metadataList": [
    {"key": "color", "value": "blue"},
    {"key": "size", "value": "large"}
  ]
}
```

**Empty arrays:**
```json
{
  "tags": [],
  "permissions": []
}
```

### Objects (Nested)

```json
{
  "user": {
    "id": "usr_123",
    "email": "user@example.com"
  },
  "address": {
    "street": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "postalCode": "94105",
    "country": "US"
  },
  "metadata": {
    "customField1": "value1",
    "customField2": "value2"
  }
}
```

### Null vs Omission

**Include null when:**
- Field exists but has no value
- Field is optional and currently unset
- Explicit absence is meaningful

```json
{
  "email": "user@example.com",
  "phone": null,
  "middleName": null,
  "deletedAt": null
}
```

**Omit when:**
- Field doesn't apply to context
- Using field selection
- Sparse response requested

```json
{
  "email": "user@example.com"
}
```

## Response Envelope

### Standard Envelope Structure

```json
{
  "data": {},
  "pagination": {},
  "warnings": [],
  "meta": {}
}
```

### Data Field

**Single resource:**
```json
{
  "data": {
    "id": "usr_123",
    "email": "user@example.com"
  }
}
```

**Collection:**
```json
{
  "data": [
    {"id": "usr_123"},
    {"id": "usr_456"}
  ]
}
```

**Empty collection:**
```json
{
  "data": []
}
```

### Pagination Field

See [Pagination](../02-data-operations/01-pagination.md) for details.

```json
{
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "totalPages": 10,
    "totalCount": 487,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

### Meta Field

```json
{
  "meta": {
    "requestId": "req_xyz789",
    "timestamp": "2024-01-16T14:20:00.000Z",
    "apiVersion": "v1",
    "tenantId": "org_abc123"
  }
}
```

**Common meta fields:**
- `requestId` - Unique request identifier
- `timestamp` - Response timestamp
- `apiVersion` - API version used
- `tenantId` - Tenant context
- `durationMs` - Processing time

## Status Codes and Bodies

### 200 OK

**With body:**
```json
{
  "data": {
    "id": "usr_123",
    "email": "user@example.com"
  }
}
```

### 201 Created

**With Location header and body:**
```http
HTTP/1.1 201 Created
Location: /v1/orgs/{orgId}/users/usr_abc123
```

```json
{
  "data": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 204 No Content

**No body:**
```http
HTTP/1.1 204 No Content
```

### 202 Accepted

**Async operation:**
```json
{
  "jobId": "job_abc123",
  "status": "pending",
  "statusUrl": "/v1/orgs/{orgId}/jobs/job_abc123",
  "estimatedCompletion": "2024-01-15T10:35:00.000Z"
}
```

### Error Responses

See [Error Handling](../04-error-handling/01-error-structure.md) for details.

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
    ],
    "requestId": "req_xyz789"
  }
}
```

## Response Headers

### Standard Headers

```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
X-Request-ID: req_xyz789
X-API-Version: v1
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 873
X-RateLimit-Reset: 1642254600
Cache-Control: private, max-age=300
```

### Custom Headers

| Header | Description | Example |
|--------|-------------|---------|
| X-Request-ID | Unique request identifier | req_xyz789 |
| X-API-Version | API version used | v1 |
| X-RateLimit-* | Rate limit information | See [Rate Limiting](../03-security/03-rate-limiting.md) |
| X-Idempotent-Replayed | Idempotency replay indicator | true |
| X-Tenant-ID | Tenant identifier | org_abc123 |

## Examples

### Complete GET Request/Response

**Request:**
```http
GET /v1/orgs/org_123/users/usr_abc456?include=addresses HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGc...
Accept: application/json
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
X-Request-ID: req_xyz789
X-API-Version: v1
Cache-Control: private, max-age=300
```

```json
{
  "data": {
    "id": "usr_abc456",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "member",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-16T14:20:00.000Z",
    "addresses": [
      {
        "id": "addr_123",
        "street": "123 Main St",
        "city": "San Francisco",
        "state": "CA",
        "postalCode": "94105"
      }
    ]
  },
  "meta": {
    "requestId": "req_xyz789",
    "timestamp": "2024-01-16T14:20:00.000Z",
    "tenantId": "org_123"
  }
}
```

### Complete POST Request/Response

**Request:**
```http
POST /v1/orgs/org_123/users HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGc...
Content-Type: application/json
Idempotency-Key: idem_create_user_001

{
  "email": "newuser@example.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "admin"
}
```

**Response:**
```http
HTTP/1.1 201 Created
Location: /v1/orgs/org_123/users/usr_def789
Content-Type: application/json; charset=utf-8
X-Request-ID: req_abc123
```

```json
{
  "data": {
    "id": "usr_def789",
    "email": "newuser@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "role": "admin",
    "isActive": true,
    "createdAt": "2024-01-16T15:00:00.000Z",
    "updatedAt": "2024-01-16T15:00:00.000Z"
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2024-01-16T15:00:00.000Z"
  }
}
```

## See Also

- [HTTP Methods](./02-http-methods.md) - HTTP method usage
- [Naming Conventions](./01-naming-conventions.md) - Field naming rules
- [Error Handling](../04-error-handling/01-error-structure.md) - Error response format
- [Pagination](../02-data-operations/01-pagination.md) - Pagination formats
