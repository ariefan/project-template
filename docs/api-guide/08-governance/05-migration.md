# Migration Support

**Related**: [Versioning](../01-core-concepts/04-versioning.md) · [Deprecation](./04-deprecation.md)

## Migration Guide Template

```markdown
# Migration Guide: v1 to v2

## Breaking Changes

### 1. User ID format changed
**v1:** Numeric ID
**v2:** Prefixed string ID

### 2. Date format changed
**v1:** YYYY-MM-DD
**v2:** ISO 8601 with timezone

## Migration Steps

1. Update user ID parsing to handle usr_ prefix
2. Update date parsing to ISO 8601 format
3. Test in staging environment
4. Deploy to production
```

## Migration Status Endpoint

```
GET /v1/migration/status
```

**Response:**
```json
{
  "version": "v1",
  "status": "deprecated",
  "sunset_date": "2024-12-31T23:59:59Z",
  "days_until_sunset": 45,
  "replacement_version": "v2",
  "migration_guide_url": "https://docs.example.com/migrations/v1-to-v2"
}
```

## See Also

- [Versioning](../01-core-concepts/04-versioning.md) - Version management
- [Deprecation](./04-deprecation.md) - Deprecation process
