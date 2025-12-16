# Idempotency

**Related**: [HTTP Methods](../01-core-concepts/02-http-methods.md) · [Batch Operations](../05-advanced-operations/01-batch-create.md)

## Idempotency Keys

For unsafe operations (POST, PATCH), support idempotency:

```http
POST /v1/orgs/{org_id}/payments
Idempotency-Key: idem_7d3f9a2e4b1c8f6e
```

## Idempotent Response

**First request:**
```http
POST /v1/orgs/{org_id}/payments
Idempotency-Key: idem_abc123

Response: 201 Created
```

**Duplicate request:**
```http
POST /v1/orgs/{org_id}/payments
Idempotency-Key: idem_abc123

Response: 200 OK
X-Idempotent-Replayed: true
```

## When to Require

**Required for:**
- Payment processing
- Email/notification sending
- External API calls
- State-changing operations with side effects

**Optional for:**
- Simple CRUD operations
- Read operations (naturally idempotent)

## Implementation

```typescript
async function handleWithIdempotency(key, operation) {
  const cached = await getIdempotencyResult(key);
  if (cached) {
    return { ...cached, replayed: true };
  }

  const result = await operation();
  await storeIdempotencyResult(key, result, '24h');
  return result;
}
```

## See Also

- [HTTP Methods](../01-core-concepts/02-http-methods.md) - Idempotent methods
- [Batch Operations](../05-advanced-operations/01-batch-create.md) - Batch idempotency
