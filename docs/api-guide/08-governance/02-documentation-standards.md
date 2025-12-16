# Documentation Standards

**Related**: [API Governance](./01-api-governance.md)

## OpenAPI Specification

Use OpenAPI 3.x for API documentation.

## Endpoint Documentation

Each endpoint should document:

- **Purpose** - What the endpoint does
- **Authentication** - Required auth method
- **Authorization** - Required permissions
- **Parameters** - All path, query, and body parameters
- **Request examples** - Sample requests
- **Response examples** - Success and error cases
- **Rate limits** - Applicable limits
- **Idempotency** - Support for idempotency keys

## Code Examples

Provide examples in multiple languages:

```bash
curl -X GET "https://api.example.com/v1/orgs/org_123/users" \
  -H "Authorization: Bearer {token}"
```

```javascript
const response = await fetch('https://api.example.com/v1/orgs/org_123/users', {
  headers: { 'Authorization': 'Bearer {token}' }
});
```

```python
import requests
response = requests.get(
    'https://api.example.com/v1/orgs/org_123/users',
    headers={'Authorization': 'Bearer {token}'}
)
```

## See Also

- [API Governance](./01-api-governance.md) - Governance process
- [Testing](./03-testing.md) - Test documentation
