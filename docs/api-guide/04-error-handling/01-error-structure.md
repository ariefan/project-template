# Error Structure

**Related**: [Error Codes](./02-error-codes.md) · [Validation](./03-validation.md) · [HTTP Methods](../01-core-concepts/02-http-methods.md)

## Standard Error Response

```json
{
  "error": {
    "code": "validation_error",
    "message": "The request data is invalid",
    "details": [
      {
        "field": "email",
        "code": "invalid_format",
        "message": "Email address is not valid"
      },
      {
        "field": "age",
        "code": "out_of_range",
        "message": "Age must be between 18 and 120"
      }
    ],
    "request_id": "req_xyz789",
    "documentation_url": "https://docs.example.com/errors/validation_error"
  }
}
```

## Error Response Fields

| Field | Required | Description |
|-------|----------|-------------|
| code | Yes | Machine-readable error code |
| message | Yes | Human-readable error message |
| details | Optional | Array of detailed error information |
| request_id | Yes | Request identifier for debugging |
| documentation_url | Optional | Link to error documentation |

## HTTP Status Codes

See [Error Codes](./02-error-codes.md) for the complete mapping of HTTP status codes to error codes and when to use each.

## Error Detail Structure

```json
{
  "field": "email",
  "code": "already_exists",
  "message": "An account with this email already exists",
  "metadata": {
    "existing_user_id": "usr_456"
  }
}
```

## See Also

- [Error Codes](./02-error-codes.md) - Complete error code reference
- [Validation](./03-validation.md) - Input validation errors
- [HTTP Methods](../01-core-concepts/02-http-methods.md) - Status codes by method
