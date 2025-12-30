# Error Codes

**Related**: [Error Structure](./01-error-structure.md) · [Validation](./03-validation.md)

## Standard Error Codes

| HTTP | Error Code | Description |
|------|------------|-------------|
| 400 | badRequest | Malformed request (invalid JSON, wrong data type) |
| 400 | validationError | Validation failed (business rule violations) |
| 401 | unauthorized | Authentication required (missing/invalid token) |
| 401 | tokenExpired | Access token has expired |
| 403 | forbidden | Permission denied (lacks necessary permissions) |
| 403 | insufficientPermissions | Specific permission missing |
| 404 | notFound | Resource doesn't exist |
| 409 | conflict | Resource conflict (duplicate, version mismatch) |
| 409 | duplicate | Resource already exists |
| 422 | unprocessableEntity | Semantic errors (valid format but can't process) |
| 429 | rateLimitExceeded | Rate limit hit |
| 500 | internalError | Unexpected server error |
| 503 | serviceUnavailable | Service down (maintenance or overload) |

## Validation Error Codes

| Code | Description |
|------|-------------|
| required | Field is required but missing |
| invalidFormat | Invalid format (email, URL, etc.) |
| invalidType | Wrong data type |
| outOfRange | Value outside allowed range |
| tooShort | String too short |
| tooLong | String too long |
| alreadyExists | Duplicate value |
| notFound | Referenced resource not found |

## See Also

- [Error Structure](./01-error-structure.md) - Error response format
- [Validation](./03-validation.md) - Validation rules
