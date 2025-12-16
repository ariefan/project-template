# Performance Guidelines

**Related**: [Caching](./03-caching.md) · [Pagination](../02-data-operations/01-pagination.md)

## Response Time Targets

| Endpoint Type | Target (p95) | Maximum |
|---------------|--------------|---------|
| Read (simple) | 100ms | 300ms |
| Read (complex) | 300ms | 1000ms |
| Write | 200ms | 500ms |
| Bulk operations | 1000ms | 5000ms |

## Optimization Techniques

**Database:**
- Use indexes on frequently queried fields
- Implement query result caching
- Use connection pooling
- Optimize N+1 queries

**API:**
- Implement pagination for all lists
- Support field selection
- Use HTTP caching headers
- Compress responses (gzip)

**Network:**
- Use CDN for static assets
- Enable HTTP/2
- Minimize payload size

## Payload Limits

```
Max request body: 10 MB
Max response body: 25 MB
Max URL length: 2048 characters
Max header size: 8 KB
```

## See Also

- [Caching](./03-caching.md) - Caching strategies
- [Pagination](../02-data-operations/01-pagination.md) - Efficient pagination
- [Field Selection](../02-data-operations/04-field-selection.md) - Reduce payload
