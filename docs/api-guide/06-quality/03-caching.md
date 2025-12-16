# Caching

**Related**: [Performance](./05-performance.md) · [HTTP Methods](../01-core-concepts/02-http-methods.md)

## ETags

```http
GET /v1/orgs/{org_id}/users/usr_123

Response:
ETag: "a7b3c9d2e4f5"
```

**Conditional request:**
```http
GET /v1/orgs/{org_id}/users/usr_123
If-None-Match: "a7b3c9d2e4f5"

Response: 304 Not Modified
```

## Last-Modified

```http
Last-Modified: Mon, 15 Jan 2024 10:30:00 GMT
```

**Conditional request:**
```http
If-Modified-Since: Mon, 15 Jan 2024 10:30:00 GMT

Response: 304 Not Modified
```

## Cache-Control

```http
Cache-Control: public, max-age=3600
Cache-Control: private, max-age=300
Cache-Control: no-cache
Cache-Control: no-store
```

**By resource type:**
- Public, rarely changing: `max-age=86400`
- User-specific: `private, max-age=3600`
- Real-time: `no-cache`
- Sensitive: `no-store, private`

## See Also

- [Performance](./05-performance.md) - Performance optimization
- [HTTP Methods](../01-core-concepts/02-http-methods.md) - Cacheable methods
