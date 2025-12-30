# Validation

**Related**: [Error Structure](./01-error-structure.md) · [Error Codes](./02-error-codes.md)

## Request Validation

Validate all input before processing.

## Validation Errors

**Required fields:**
```json
{
  "error": {
    "code": "validationError",
    "details": [
      {
        "field": "email",
        "code": "required",
        "message": "Email is required"
      }
    ]
  }
}
```

**Format validation:**
```json
{
  "details": [
    {
      "field": "email",
      "code": "invalidFormat",
      "message": "Email must be a valid email address",
      "metadata": {
        "pattern": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
      }
    }
  ]
}
```

**Range validation:**
```json
{
  "details": [
    {
      "field": "age",
      "code": "outOfRange",
      "message": "Age must be between 18 and 120",
      "metadata": {
        "min": 18,
        "max": 120,
        "actual": 150
      }
    }
  ]
}
```

## Implementation

```typescript
function validateUser(data: any) {
  const errors = [];

  if (!data.email) {
    errors.push({
      field: 'email',
      code: 'required',
      message: 'Email is required'
    });
  } else if (!isValidEmail(data.email)) {
    errors.push({
      field: 'email',
      code: 'invalidFormat',
      message: 'Email must be a valid email address'
    });
  }

  if (data.age && (data.age < 18 || data.age > 120)) {
    errors.push({
      field: 'age',
      code: 'outOfRange',
      message: 'Age must be between 18 and 120',
      metadata: { min: 18, max: 120, actual: data.age }
    });
  }

  if (errors.length > 0) {
    throw new ValidationError('Validation failed', errors);
  }
}
```

## See Also

- [Error Structure](./01-error-structure.md) - Error response format
- [Error Codes](./02-error-codes.md) - Validation error codes
