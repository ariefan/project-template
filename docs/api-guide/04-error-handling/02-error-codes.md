# Error Codes

**Related**: [Error Structure](./01-error-structure.md) · [Validation](./03-validation.md)

## Standard Error Codes

| HTTP | Error Code | Description |
|------|------------|-------------|
| 400 | bad_request | Malformed request (invalid JSON, wrong data type) |
| 400 | validation_error | Validation failed (business rule violations) |
| 401 | unauthorized | Authentication required (missing/invalid token) |
| 401 | token_expired | Access token has expired |
| 403 | forbidden | Permission denied (lacks necessary permissions) |
| 403 | insufficient_permissions | Specific permission missing |
| 404 | not_found | Resource doesn't exist |
| 409 | conflict | Resource conflict (duplicate, version mismatch) |
| 409 | duplicate | Resource already exists |
| 422 | unprocessable_entity | Semantic errors (valid format but can't process) |
| 429 | rate_limit_exceeded | Rate limit hit |
| 500 | internal_error | Unexpected server error |
| 503 | service_unavailable | Service down (maintenance or overload) |

## Validation Error Codes

| Code | Description |
|------|-------------|
| required | Field is required but missing |
| invalid_format | Invalid format (email, URL, etc.) |
| invalid_type | Wrong data type |
| out_of_range | Value outside allowed range |
| too_short | String too short |
| too_long | String too long |
| already_exists | Duplicate value |
| not_found | Referenced resource not found |

## See Also

- [Error Structure](./01-error-structure.md) - Error response format
- [Validation](./03-validation.md) - Validation rules
