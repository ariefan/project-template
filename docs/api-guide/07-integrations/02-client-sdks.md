# Client SDKs

**Related**: [Authentication](../03-security/01-authentication.md) · [Error Handling](../04-error-handling/01-error-structure.md)

## SDK Structure

```javascript
// JavaScript/TypeScript
const client = new APIClient({
  apiKey: 'your_api_key',
  baseUrl: 'https://api.example.com/v1'
});

const users = await client.users.list('org_123', {
  page: 1,
  pageSize: 50
});
```

```python
# Python
from example_api import Client

client = Client(api_key='your_api_key')
users = client.users.list(org_id='org_123', page=1, page_size=50)
```

## SDK Features

- Automatic retry with exponential backoff
- Built-in rate limit handling
- Request/response logging
- Error handling and typing
- Pagination helpers
- Webhook signature verification

## See Also

- [Authentication](../03-security/01-authentication.md) - SDK authentication
- [Error Handling](../04-error-handling/01-error-structure.md) - Error handling in SDKs
