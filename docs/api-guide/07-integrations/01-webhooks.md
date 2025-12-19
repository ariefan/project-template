# Webhooks

**Related**: [Idempotency](../06-quality/02-idempotency.md) · [Audit Logging](../06-quality/01-audit-logging.md)

## Webhook Configuration

```
POST /v1/orgs/{orgId}/webhooks
{
  "url": "https://customer.com/webhooks/handler",
  "events": ["user.created", "user.updated", "invoice.paid"],
  "secret": "whsec_abc123xyz",
  "isActive": true
}
```

## Webhook Payload

```http
POST https://customer.com/webhooks/handler
X-Webhook-ID: wh_evt_abc123
X-Webhook-Timestamp: 1642254600
X-Webhook-Signature: sha256=a7b3c9d2...
Content-Type: application/json

{
  "id": "wh_evt_abc123",
  "type": "user.created",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "data": {
    "id": "usr_456",
    "email": "newuser@example.com"
  },
  "metadata": {
    "tenantId": "org_xyz789",
    "apiVersion": "v1"
  }
}
```

## Signature Verification

```typescript
const expectedSignature = crypto
  .createHmac('sha256', secret)
  .update(`${timestamp}.${payload}`)
  .digest('hex');

if (receivedSignature !== `sha256=${expectedSignature}`) {
  throw new Error('Invalid signature');
}
```

## Retry Policy

- Retry schedule: 1min, 5min, 30min, 2hr, 6hr, 24hr
- Mark failed after 7 days
- Return 2xx for success
- Timeout after 10 seconds

## See Also

- [Audit Logging](../06-quality/01-audit-logging.md) - Track webhook deliveries
- [Idempotency](../06-quality/02-idempotency.md) - Idempotent webhooks
