# Testing Guidelines

**Related**: [API Governance](./01-api-governance.md) · [Documentation](./02-documentation-standards.md)

## Contract Testing

Ensure API responses match documented schemas:

```typescript
test('GET /users returns valid schema', async () => {
  const response = await api.get('/users');

  expect(response.status).toBe(200);
  expect(response.data).toMatchSchema({
    data: expect.arrayOf({
      id: expect.stringMatching(/^usr_/),
      email: expect.stringMatching(/@/),
      created_at: expect.iso8601String()
    }),
    pagination: expect.object()
  });
});
```

## Error Case Testing

Test all error scenarios:

- Invalid input
- Missing required fields
- Unauthorized access
- Resource not found
- Rate limit exceeded
- Server errors

## See Also

- [API Governance](./01-api-governance.md) - Testing requirements
- [Error Handling](../04-error-handling/01-error-structure.md) - Error scenarios
