# HTTP Methods and Standard Operations

**Related**: [Naming Conventions](./01-naming-conventions.md) · [Error Handling](../04-error-handling/01-error-structure.md)

## HTTP Methods Overview

| Method | Operation | Idempotent | Safe | Request Body | Response |
|--------|-----------|------------|------|--------------|----------|
| GET | Retrieve resource(s) | ✅ Yes | ✅ Yes | ❌ No | Resource(s) |
| POST | Create resource | ❌ No | ❌ No | ✅ Yes | Created resource + 201 |
| PUT | Replace entire resource | ✅ Yes | ❌ No | ✅ Yes | Updated resource |
| PATCH | Partial update | ❌ No* | ❌ No | ✅ Yes | Updated resource |
| DELETE | Remove resource | ✅ Yes | ❌ No | Optional | 204 or resource |

*PATCH can be made idempotent with proper implementation

**Definitions:**
- **Idempotent**: Multiple identical requests have the same effect as one
- **Safe**: Does not modify server state

## Standard CRUD Operations

### List Resources (GET Collection)

```http
GET /v1/orgs/{orgId}/posts HTTP/1.1
```

**Response: 200 OK**
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
    "totalCount": 127,
    "hasNext": true
  }
}
```

### Create Resource (POST Collection)

```http
POST /v1/orgs/{orgId}/posts HTTP/1.1
Content-Type: application/json

{
  "email": "newuser@example.com",
  "name": "John Doe",
  "role": "member"
}
```

**Response: 201 Created**
```http
HTTP/1.1 201 Created
Location: /v1/orgs/{orgId}/posts/usr_abc123
```

```json
{
  "data": {
    "id": "usr_abc123",
    "email": "newuser@example.com",
    "name": "John Doe",
    "role": "member",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Get Single Resource (GET Item)

```http
GET /v1/orgs/{orgId}/posts/usr_abc123 HTTP/1.1
```

**Response: 200 OK**
```json
{
  "data": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "member",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-16T14:20:00.000Z"
  }
}
```

### Update Entire Resource (PUT)

Replace **all** fields of the resource.

```http
PUT /v1/orgs/{orgId}/posts/usr_abc123 HTTP/1.1
Content-Type: application/json

{
  "email": "newemail@example.com",
  "name": "John Smith",
  "role": "admin",
  "isActive": true
}
```

**Response: 200 OK**
```json
{
  "data": {
    "id": "usr_abc123",
    "email": "newemail@example.com",
    "name": "John Smith",
    "role": "admin",
    "isActive": true,
    "updatedAt": "2024-01-16T15:00:00.000Z"
  }
}
```

**Important:** PUT requires all fields. Missing fields are set to null/default.

### Update Partial Resource (PATCH)

Update **only** specified fields.

```http
PATCH /v1/orgs/{orgId}/posts/usr_abc123 HTTP/1.1
Content-Type: application/json

{
  "name": "John Smith"
}
```

**Response: 200 OK**
```json
{
  "data": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "name": "John Smith",
    "role": "member",
    "isActive": true,
    "updatedAt": "2024-01-16T15:00:00.000Z"
  }
}
```

**Note:** Only `name` changed. Other fields remain unchanged.

### Delete Resource (DELETE)

```http
DELETE /v1/orgs/{orgId}/posts/usr_abc123 HTTP/1.1
```

**Response Rules (No Ambiguity):**

```
Is it a soft delete?
├─ YES → ALWAYS 200 OK with metadata
└─ NO (hard delete) → ALWAYS 204 No Content
```

**Soft Delete: 200 OK** (ALWAYS include metadata)
```json
{
  "data": {
    "id": "usr_abc123",
    "deletedAt": "2024-01-16T16:00:00.000Z",
    "deletedBy": "usr_admin123",
    "canRestore": true
  }
}
```

**Hard Delete: 204 No Content** (no body)
```http
HTTP/1.1 204 No Content
```

**AI Instruction:**
- Soft delete → 200 OK + body (always return metadata for audit trail)
- Hard delete → 204 No Content + no body
- NEVER use 204 for soft delete

**Default:** Use [soft delete](../05-advanced-operations/04-soft-delete.md) (200 OK) for all user-facing resources.

## Custom Operations

For operations that don't fit CRUD, use POST with actions.

### Action Pattern

```http
POST /{resource}/{id}/actions/{action-name}
```

### Examples

**Send Invoice:**
```http
POST /v1/orgs/{orgId}/invoices/inv_123/actions/send HTTP/1.1
Content-Type: application/json

{
  "recipientEmail": "customer@example.com",
  "sendAt": "2024-01-20T09:00:00.000Z"
}
```

**Response: 200 OK**
```json
{
  "data": {
    "invoiceId": "inv_123",
    "sentAt": "2024-01-16T16:00:00.000Z",
    "recipient": "customer@example.com",
    "status": "sent"
  }
}
```

**Reset Password:**
```http
POST /v1/orgs/{orgId}/posts/usr_123/actions/reset-password HTTP/1.1
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Cancel Order:**
```http
POST /v1/orgs/{orgId}/orders/ord_789/actions/cancel HTTP/1.1
Content-Type: application/json

{
  "reason": "Customer requested cancellation",
  "refund": true
}
```

**Generate Report:**
```http
POST /v1/orgs/{orgId}/reports/actions/generate HTTP/1.1
Content-Type: application/json

{
  "reportType": "financial",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "format": "pdf"
}
```

**Response: 202 Accepted** (async operation)
```json
{
  "jobId": "job_abc123",
  "status": "pending",
  "statusUrl": "/v1/orgs/{orgId}/jobs/job_abc123"
}
```

## Bulk Operations

Use `/batch` for multiple operations.

**Batch Create:**
```http
POST /v1/orgs/{orgId}/posts/batch
```

**Batch Update:**
```http
PATCH /v1/orgs/{orgId}/posts/batch
```

**Batch Delete:**
```http
DELETE /v1/orgs/{orgId}/posts/batch
```

**Batch Soft Delete:**
```http
POST /v1/orgs/{orgId}/posts/batch/soft-delete
```

See [Batch Operations](../05-advanced-operations/) for details.

## Method Selection Guide

### GET
**Use when:** Retrieving data, no side effects
**Examples:**
- List users
- Get user details
- Search products
- Export report (if idempotent)

**Do NOT use GET for:**
- Creating resources
- Updating resources
- Deleting resources
- Operations with side effects

### POST
**Use when:** Creating resources, non-idempotent operations
**Examples:**
- Create user
- Upload file
- Send email
- Process payment
- Custom actions

**Do NOT use POST for:**
- Retrieving data (use GET)
- Full replacement (use PUT)
- Partial update (use PATCH)

### PUT
**Use when:** Replacing entire resource
**Examples:**
- Replace user profile completely
- Update configuration (all fields)
- Replace document

**Do NOT use PUT for:**
- Partial updates (use PATCH)
- Creating without ID (use POST)

### PATCH
**Use when:** Updating specific fields
**Examples:**
- Update user name only
- Change status
- Update specific settings

**Do NOT use PATCH for:**
- Full replacement (use PUT)
- Creating resources (use POST)

### DELETE
**Use when:** Removing resources
**Examples:**
- Delete user (soft delete by default)
- Remove item from cart
- Cancel subscription

**Guidelines:**
- Implement soft delete by default
- Use hard delete only when necessary
- Require confirmation for permanent deletion

## Success Status Codes

| Code | Meaning | When to Use |
|------|---------|-------------|
| 200 | OK | Successful GET, PUT, PATCH, DELETE (with body) |
| 201 | Created | Successful POST (resource created) |
| 204 | No Content | Successful DELETE (no body) |
| 202 | Accepted | Async operation started |

**Error codes**: See [Error Codes](../04-error-handling/02-error-codes.md) for complete HTTP error status codes and error response codes.

## Idempotency

### Idempotent Methods (Safe to Retry)

**GET, PUT, DELETE** - Multiple requests = same result

```http
DELETE /v1/orgs/{orgId}/posts/usr_123
DELETE /v1/orgs/{orgId}/posts/usr_123  ← Same result
DELETE /v1/orgs/{orgId}/posts/usr_123  ← Same result
```

First request: 200 OK (deleted)
Subsequent requests: 404 Not Found (already deleted)

### Non-Idempotent Methods

**POST, PATCH** - Multiple requests = different results

```http
POST /v1/orgs/{orgId}/posts
POST /v1/orgs/{orgId}/posts  ← Creates another user
POST /v1/orgs/{orgId}/posts  ← Creates another user
```

**Solution:** Use [Idempotency Keys](../06-quality/02-idempotency.md)

## Examples

### Complete Resource Lifecycle

```http
# 1. Create user
POST /v1/orgs/org_123/users
{"email": "john@example.com", "name": "John Doe"}
→ 201 Created, id: usr_abc123

# 2. Get user
GET /v1/orgs/org_123/users/usr_abc123
→ 200 OK

# 3. Update user (partial)
PATCH /v1/orgs/org_123/users/usr_abc123
{"name": "John Smith"}
→ 200 OK

# 4. Update user (full)
PUT /v1/orgs/org_123/users/usr_abc123
{"email": "john.smith@example.com", "name": "John Smith", "role": "admin"}
→ 200 OK

# 5. Custom action
POST /v1/orgs/org_123/users/usr_abc123/actions/reset-password
{}
→ 200 OK

# 6. Soft delete
DELETE /v1/orgs/org_123/users/usr_abc123
→ 200 OK (soft deleted)

# 7. Restore
POST /v1/orgs/org_123/users/usr_abc123/restore
→ 200 OK

# 8. Permanent delete
DELETE /v1/orgs/org_123/users/usr_abc123/permanent
{"confirmation": "PERMANENTLY DELETE usr_abc123"}
→ 204 No Content
```

## See Also

- [Naming Conventions](./01-naming-conventions.md) - URL and resource naming
- [Request/Response Format](./03-request-response-format.md) - Request and response structures
- [Error Handling](../04-error-handling/01-error-structure.md) - Error responses
- [Batch Create](../05-advanced-operations/01-batch-create.md) - Bulk operations
- [Idempotency](../06-quality/02-idempotency.md) - Making POST/PATCH idempotent
