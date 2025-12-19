# Batch Delete

**Related**: [Batch Create](./01-batch-create.md) · [Batch Update](./02-batch-update.md) · [Soft Delete](./04-soft-delete.md)

## Endpoint

```
DELETE /v1/orgs/{orgId}/{resource}/batch
```

OR

```
POST /v1/orgs/{orgId}/{resource}/batch/soft-delete
```

## Request

```json
{
  "ids": ["usr_abc123", "usr_def456", "usr_ghi789"],
  "options": {
    "atomic": false,
    "force": false,
    "returnDeleted": true
  }
}
```

## Response

```json
{
  "results": [
    {
      "index": 0,
      "status": "success",
      "data": {
        "id": "usr_abc123",
        "deletedAt": "2024-01-15T10:30:00.000Z"
      }
    },
    {
      "index": 1,
      "status": "error",
      "error": {
        "code": "forbidden",
        "message": "Cannot delete user with active subscriptions"
      }
    }
  ],
  "summary": {
    "total": 3,
    "successful": 2,
    "failed": 1
  }
}
```

## See Also

- [Soft Delete](./04-soft-delete.md) - Soft delete details
- [Restore Operations](./05-restore.md) - Restore deleted records
