# Deprecation Process

**Related**: [Versioning](../01-core-concepts/04-versioning.md) · [Migration](./05-migration.md)

## Deprecation Timeline

**Standard: 12 months**

| Phase | Timeline | Action |
|-------|----------|--------|
| Announcement | T-12 months | Announce deprecation |
| Documentation | T-9 months | Publish migration guide |
| Warning | T-6 months | Add deprecation headers |
| Final Notice | T-3 months | Email all API users |
| Sunset Notice | T-1 month | Final reminder |
| Retirement | T-0 | Remove old version |

## Deprecation Headers

```http
Deprecation: true
Sunset: Sat, 31 Dec 2024 23:59:59 GMT
Link: <https://docs.example.com/migrations/v1-to-v2>; rel="deprecation"
```

## Deprecation Response

```json
{
  "data": {...},
  "warnings": [
    {
      "code": "endpoint_deprecated",
      "message": "This endpoint will be sunset on 2024-12-31",
      "sunset_date": "2024-12-31T23:59:59Z",
      "alternative": "Use GET /v2/users instead",
      "documentation_url": "https://docs.example.com/migrations/v1-to-v2"
    }
  ]
}
```

## See Also

- [Versioning](../01-core-concepts/04-versioning.md) - Version lifecycle
- [Migration](./05-migration.md) - Migration support
