# Soft Delete

**Related**: [Restore Operations](./05-restore.md) · [Batch Delete](./03-batch-delete.md) · [Audit Logging](../06-quality/01-audit-logging.md)

## Overview

Soft delete marks records as deleted without removing them, allowing restoration.

## Database Schema

```sql
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN deleted_by VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN deletion_reason TEXT NULL;

CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_users_not_deleted ON users(tenant_id) WHERE deleted_at IS NULL;
```

## Single Soft Delete

**Endpoint:**
```
DELETE /v1/orgs/{orgId}/users/{userId}
```

**Request:**
```json
{
  "reason": "User requested account deletion",
  "metadata": {
    "ticketId": "TKT-12345"
  }
}
```

**Response:**
```json
{
  "data": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "deletedAt": "2024-01-15T10:30:00.000Z",
    "deletedBy": "usr_admin_456",
    "deletionReason": "User requested account deletion",
    "canRestore": true,
    "restoreUntil": "2024-02-14T10:30:00.000Z"
  }
}
```

## Batch Soft Delete

**Endpoint:**
```
POST /v1/orgs/{orgId}/users/batch/soft-delete
```

**Request:**
```json
{
  "ids": ["usr_abc123", "usr_def456"],
  "reason": "Bulk cleanup of inactive accounts",
  "options": {
    "atomic": false,
    "permanentAfterDays": 30
  }
}
```

## Implementation

```typescript
async function softDelete(resourceId, tenantId, deletedBy, options) {
  const deletedAt = new Date();
  const restoreUntil = new Date(deletedAt);
  restoreUntil.setDate(restoreUntil.getDate() + (options.permanent_after_days || 30));

  return await db.transaction(async (trx) => {
    const [deleted] = await trx('users')
      .where({ id: resourceId, tenant_id: tenantId })
      .update({
        deleted_at: deletedAt,
        deleted_by: deletedBy,
        deletion_reason: options.reason
      })
      .returning('*');

    await trx('deleted_records').insert({
      tenant_id: tenantId,
      resource_type: 'user',
      resource_id: resourceId,
      deleted_at: deletedAt,
      deleted_by: deletedBy,
      can_restore: true
    });

    return { ...deleted, can_restore: true, restore_until: restoreUntil };
  });
}
```

## Query Helpers

```typescript
// Exclude soft-deleted
function withoutDeleted(query) {
  return query.whereNull('deleted_at');
}

// Only soft-deleted
function onlyDeleted(query) {
  return query.whereNotNull('deleted_at');
}

// Usage
const activeUsers = await db('users')
  .where({ tenant_id })
  .modify(withoutDeleted);
```

## List Deleted

**Endpoint:**
```
GET /v1/orgs/{orgId}/users/deleted
```

**Response:**
```json
{
  "data": [
    {
      "id": "usr_abc123",
      "email": "user@example.com",
      "deletedAt": "2024-01-15T10:30:00.000Z",
      "deletedBy": "usr_admin_456",
      "canRestore": true,
      "restoreUntil": "2024-02-14T10:30:00.000Z"
    }
  ]
}
```

## See Also

- [Restore Operations](./05-restore.md) - Restore deleted records
- [Batch Delete](./03-batch-delete.md) - Batch soft delete
- [Audit Logging](../06-quality/01-audit-logging.md) - Track deletions
