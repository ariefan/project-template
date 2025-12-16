# Batch Update

**Related**: [Batch Create](./01-batch-create.md) · [Batch Delete](./03-batch-delete.md)

## Endpoint

```
PATCH /v1/orgs/{org_id}/{resource}/batch
```

## Request (By IDs)

```json
{
  "items": [
    {
      "id": "usr_abc123",
      "role": "admin"
    },
    {
      "id": "usr_def456",
      "name": "Jane Doe"
    }
  ],
  "options": {
    "atomic": false,
    "return_records": true,
    "track_changes": true
  }
}
```

## Request (By Filter)

```json
{
  "filter": {
    "role": "member",
    "is_active": true
  },
  "updates": {
    "role": "verified_member"
  }
}
```

## Response (By IDs)

```json
{
  "results": [
    {
      "index": 0,
      "status": "success",
      "data": {
        "id": "usr_abc123",
        "role": "admin",
        "updated_at": "2024-01-15T10:30:00.000Z"
      },
      "changes": {
        "role": {
          "old": "member",
          "new": "admin"
        }
      }
    }
  ],
  "summary": {
    "total": 2,
    "successful": 2,
    "failed": 0
  }
}
```

## See Also

- [Batch Create](./01-batch-create.md) - Create multiple records
- [Batch Delete](./03-batch-delete.md) - Delete multiple records
