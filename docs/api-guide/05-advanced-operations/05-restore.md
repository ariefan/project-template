# Restore Operations

**Related**: [Soft Delete](./04-soft-delete.md) · [Audit Logging](../06-quality/01-audit-logging.md)

## Single Restore

**Endpoint:**
```
POST /v1/orgs/{org_id}/users/{user_id}/restore
```

**Request:**
```json
{
  "reason": "User account restored per support request",
  "metadata": {
    "ticket_id": "TKT-12346"
  }
}
```

**Response:**
```json
{
  "data": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "deleted_at": null,
    "restored_at": "2024-01-16T14:20:00.000Z",
    "restored_by": "usr_admin_456",
    "was_deleted_at": "2024-01-15T10:30:00.000Z"
  }
}
```

## Batch Restore

**Endpoint:**
```
POST /v1/orgs/{org_id}/users/batch/restore
```

**Request:**
```json
{
  "ids": ["usr_abc123", "usr_def456"],
  "reason": "Accidental bulk deletion - restoring affected accounts",
  "options": {
    "atomic": false,
    "skip_not_deleted": true
  }
}
```

**Response:**
```json
{
  "results": [
    {
      "index": 0,
      "status": "success",
      "data": {
        "id": "usr_abc123",
        "restored_at": "2024-01-16T14:20:00.000Z"
      }
    },
    {
      "index": 1,
      "status": "error",
      "error": {
        "code": "restore_expired",
        "message": "Restore window has expired"
      }
    }
  ],
  "summary": {
    "total": 2,
    "successful": 1,
    "failed": 1
  }
}
```

## Implementation

```typescript
async function restore(resourceId, tenantId, restoredBy, options) {
  return await db.transaction(async (trx) => {
    const record = await trx('users')
      .where({ id: resourceId, tenant_id: tenantId })
      .whereNotNull('deleted_at')
      .first();

    if (!record) {
      throw new NotFoundError('Deleted record not found');
    }

    const [restored] = await trx('users')
      .where({ id: resourceId, tenant_id: tenantId })
      .update({
        deleted_at: null,
        deleted_by: null,
        deletion_reason: null
      })
      .returning('*');

    await trx('deleted_records')
      .where({ resource_id: resourceId })
      .update({
        restored_at: new Date(),
        restored_by: restoredBy
      });

    return {
      ...restored,
      restored_at: new Date(),
      restored_by: restoredBy,
      was_deleted_at: record.deleted_at
    };
  });
}
```

## See Also

- [Soft Delete](./04-soft-delete.md) - Soft delete details
- [Audit Logging](../06-quality/01-audit-logging.md) - Track restorations
