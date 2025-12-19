# Batch Create

**Related**: [Batch Update](./02-batch-update.md) · [Batch Delete](./03-batch-delete.md) · [HTTP Methods](../01-core-concepts/02-http-methods.md)

## Endpoint

```
POST /v1/orgs/{orgId}/{resource}/batch
```

## Request Format

```json
{
  "items": [
    {
      "email": "user1@example.com",
      "name": "John Doe",
      "role": "member"
    },
    {
      "email": "user2@example.com",
      "name": "Jane Smith",
      "role": "admin"
    }
  ],
  "options": {
    "atomic": false,
    "returnRecords": true,
    "skipDuplicates": false
  }
}
```

## Request Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| atomic | boolean | false | All items succeed or all fail |
| returnRecords | boolean | true | Return created records in response |
| skipDuplicates | boolean | false | Skip items that already exist |
| validateOnly | boolean | false | Validate without creating |

## Response Format

```json
{
  "results": [
    {
      "index": 0,
      "status": "success",
      "data": {
        "id": "usr_abc123",
        "email": "user1@example.com",
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    },
    {
      "index": 1,
      "status": "error",
      "error": {
        "code": "validationError",
        "message": "Email already exists"
      },
      "input": {
        "email": "user2@example.com"
      }
    }
  ],
  "summary": {
    "total": 2,
    "successful": 1,
    "failed": 1,
    "skipped": 0
  },
  "meta": {
    "requestId": "req_batch_123",
    "durationMs": 234
  }
}
```

## Atomic Mode

When `atomic: true`, all items rollback if any fails:

```json
{
  "error": {
    "code": "batchValidationFailed",
    "message": "Batch operation failed. All items rolled back"
  },
  "summary": {
    "total": 3,
    "successful": 0,
    "failed": 3
  }
}
```

## Implementation

```typescript
async function batchCreate(tenantId, request) {
  const options = {
    atomic: false,
    return_records: true,
    skip_duplicates: false,
    ...request.options
  };

  const results = [];
  const transaction = options.atomic ? await startTransaction() : null;

  try {
    for (let i = 0; i < request.items.length; i++) {
      try {
        const created = await createItem(request.items[i], tenantId);
        results.push({ index: i, status: 'success', data: created });
      } catch (error) {
        if (options.skip_duplicates && isDuplicate(error)) {
          results.push({ index: i, status: 'skipped' });
          continue;
        }
        
        results.push({ 
          index: i, 
          status: 'error', 
          error: formatError(error),
          input: request.items[i]
        });

        if (options.atomic) {
          await transaction.rollback();
          throw error;
        }
      }
    }

    if (transaction) await transaction.commit();

    return {
      results,
      summary: {
        total: request.items.length,
        successful: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'error').length,
        skipped: results.filter(r => r.status === 'skipped').length
      }
    };
  } catch (error) {
    if (transaction) await transaction.rollback();
    throw error;
  }
}
```

## See Also

- [Batch Update](./02-batch-update.md) - Update multiple records
- [Batch Delete](./03-batch-delete.md) - Delete multiple records
- [Error Handling](../04-error-handling/01-error-structure.md) - Error format
