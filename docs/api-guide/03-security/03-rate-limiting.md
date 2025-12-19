# Rate Limiting

**Related**: [Performance](../06-quality/05-performance.md) · [Error Handling](../04-error-handling/02-error-codes.md)

## Rate Limit Headers

Include in every response:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 873
X-RateLimit-Reset: 1642254600
X-RateLimit-Window: 3600
```

## Rate Limit Tiers

| Tier | Requests/Hour | Burst |
|------|---------------|-------|
| Free | 100 | 10/min |
| Basic | 1,000 | 100/min |
| Pro | 10,000 | 500/min |
| Enterprise | 100,000 | Custom |

## Rate Limit Exceeded Response

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 300
```

```json
{
  "error": {
    "code": "rateLimitExceeded",
    "message": "Rate limit exceeded. Please retry after 300 seconds",
    "details": [
      {
        "limit": 1000,
        "window": "1 hour",
        "resetAt": "2024-01-15T11:00:00Z"
      }
    ]
  }
}
```

## See Also

- [Error Codes](../04-error-handling/02-error-codes.md) - Rate limit errors
- [Performance](../06-quality/05-performance.md) - Performance guidelines
