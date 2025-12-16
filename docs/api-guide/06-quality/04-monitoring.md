# Monitoring and Observability

**Related**: [Audit Logging](./01-audit-logging.md) · [Performance](./05-performance.md)

## Metrics to Track

**Request metrics:**
- Request count
- Response time (p50, p95, p99)
- Error rate
- Request/response size

**Business metrics:**
- Active users
- API calls per tenant
- Feature usage

**System metrics:**
- CPU usage
- Memory usage
- Database connections

## Distributed Tracing

```http
X-Trace-ID: trace_abc123xyz
X-Span-ID: span_def456uvw
```

## Structured Logging

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "User created",
  "context": {
    "request_id": "req_abc123",
    "tenant_id": "org_def456",
    "user_id": "usr_123",
    "endpoint": "/v1/orgs/org_def456/users",
    "duration_ms": 234
  }
}
```

## See Also

- [Audit Logging](./01-audit-logging.md) - Audit events
- [Performance](./05-performance.md) - Performance metrics
