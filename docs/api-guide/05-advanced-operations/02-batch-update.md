# Batch Update

**Related**: [Batch Create](./01-batch-create.md) · [Batch Delete](./03-batch-delete.md)

## Endpoint

```
PATCH /v1/orgs/{orgId}/{resource}/batch
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
    "returnRecords": true,
    "trackChanges": true
  }
}
```

## Request (By Filter)

```json
{
  "filter": {
    "role": "member",
    "isActive": true
  },
  "updates": {
    "role": "verifiedMember"
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
        "updatedAt": "2024-01-15T10:30:00.000Z"
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
