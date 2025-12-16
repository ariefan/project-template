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
POST /v1/orgs/{org_id}/users HTTP/1.1
Host: api.example.com
Authorization: Bearer {token}
Content-Type: application/json
Idempotency-Key: idem_abc123xyz

{
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
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
    "first_name": "John",
    "last_name": "Doe",
    "role": "member",
    "is_active": true,
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-16T14:20:00.000Z"
  },
  "meta": {
    "request_id": "req_xyz789",
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
    "page_size": 50,
    "total_pages": 10,
    "total_count": 487,
    "has_next": true,
    "has_previous": false,
    "links": {
      "first": "/v1/orgs/{org_id}/users?page=1",
      "previous": null,
      "next": "/v1/orgs/{org_id}/users?page=2",
      "last": "/v1/orgs/{org_id}/users?page=10"
    }
  },
  "meta": {
    "request_id": "req_xyz789",
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
      "code": "endpoint_deprecated",
      "message": "This endpoint version will be sunset on 2025-12-31",
      "documentation_url": "https://docs.example.com/migrations/v1-to-v2"
    },
    {
      "code": "page_size_capped",
      "message": "Requested page_size of 500 exceeds maximum of 100"
    }
  ],
  "meta": {
    "request_id": "req_xyz789",
    "timestamp": "2024-01-16T14:20:00.000Z"
  }
}
```

## Field Naming

### Use snake_case

**Correct:**
```json
{
  "user_id": "usr_123",
  "first_name": "John",
  "last_name": "Doe",
  "email_address": "john@example.com",
  "is_active": true,
  "created_at": "2024-01-15T10:30:00.000Z"
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
  "tax_rate": 0.08
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
  "formatted_amount": "$19.99"
}
```

### Boolean

Use lowercase `true` or `false`.

```json
{
  "is_active": true,
  "is_verified": false,
  "has_subscription": true,
  "can_edit": false
}
```

**Prefix with:**
- `is_` for state: `is_active`, `is_deleted`
- `has_` for possession: `has_subscription`, `has_payment_method`
- `can_` for ability: `can_edit`, `can_delete`
- `should_` for intention: `should_notify`, `should_send_email`

### Date and Time

**Format:** ISO 8601 with UTC timezone

```json
{
  "created_at": "2024-01-15T10:30:00.000Z",
  "updated_at": "2024-01-16T14:45:30.500Z",
  "deleted_at": null,
  "scheduled_for": "2024-02-01T09:00:00.000Z"
}
```

**Pattern:** `YYYY-MM-DDTHH:mm:ss.sssZ`

**Examples:**
```json
{
  "date_only": "2024-01-15",
  "datetime_utc": "2024-01-15T10:30:00.000Z",
  "datetime_with_ms": "2024-01-15T10:30:00.123Z"
}
```

### Arrays

```json
{
  "tags": ["engineering", "backend", "api"],
  "user_ids": ["usr_123", "usr_456", "usr_789"],
  "metadata_list": [
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
    "postal_code": "94105",
    "country": "US"
  },
  "metadata": {
    "custom_field_1": "value1",
    "custom_field_2": "value2"
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
  "middle_name": null,
  "deleted_at": null
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
    "page_size": 50,
    "total_pages": 10,
    "total_count": 487,
    "has_next": true,
    "has_previous": false
  }
}
```

### Meta Field

```json
{
  "meta": {
    "request_id": "req_xyz789",
    "timestamp": "2024-01-16T14:20:00.000Z",
    "api_version": "v1",
    "tenant_id": "org_abc123"
  }
}
```

**Common meta fields:**
- `request_id` - Unique request identifier
- `timestamp` - Response timestamp
- `api_version` - API version used
- `tenant_id` - Tenant context
- `duration_ms` - Processing time

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
Location: /v1/orgs/{org_id}/users/usr_abc123
```

```json
{
  "data": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "created_at": "2024-01-15T10:30:00.000Z"
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
  "job_id": "job_abc123",
  "status": "pending",
  "status_url": "/v1/orgs/{org_id}/jobs/job_abc123",
  "estimated_completion": "2024-01-15T10:35:00.000Z"
}
```

### Error Responses

See [Error Handling](../04-error-handling/01-error-structure.md) for details.

```json
{
  "error": {
    "code": "validation_error",
    "message": "The request data is invalid",
    "details": [
      {
        "field": "email",
        "code": "invalid_format",
        "message": "Email address is not valid"
      }
    ],
    "request_id": "req_xyz789"
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
    "first_name": "John",
    "last_name": "Doe",
    "role": "member",
    "is_active": true,
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-16T14:20:00.000Z",
    "addresses": [
      {
        "id": "addr_123",
        "street": "123 Main St",
        "city": "San Francisco",
        "state": "CA",
        "postal_code": "94105"
      }
    ]
  },
  "meta": {
    "request_id": "req_xyz789",
    "timestamp": "2024-01-16T14:20:00.000Z",
    "tenant_id": "org_123"
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
  "first_name": "Jane",
  "last_name": "Smith",
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
    "first_name": "Jane",
    "last_name": "Smith",
    "role": "admin",
    "is_active": true,
    "created_at": "2024-01-16T15:00:00.000Z",
    "updated_at": "2024-01-16T15:00:00.000Z"
  },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2024-01-16T15:00:00.000Z"
  }
}
```

## See Also

- [HTTP Methods](./02-http-methods.md) - HTTP method usage
- [Naming Conventions](./01-naming-conventions.md) - Field naming rules
- [Error Handling](../04-error-handling/01-error-structure.md) - Error response format
- [Pagination](../02-data-operations/01-pagination.md) - Pagination formats
