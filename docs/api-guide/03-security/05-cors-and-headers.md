# CORS and Headers

**Related**: [Security Best Practices](./04-security-best-practices.md)

## CORS Configuration

```http
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE
Access-Control-Allow-Headers: Authorization, Content-Type
Access-Control-Max-Age: 86400
```

**Never use:**
```http
Access-Control-Allow-Origin: *  ❌ Too permissive
```

## Required Security Headers

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
```

**Purpose:**
- `Strict-Transport-Security` - Force HTTPS connections
- `X-Content-Type-Options` - Prevent MIME-type sniffing
- `X-Frame-Options` - Prevent clickjacking
- `X-XSS-Protection` - Enable browser XSS protection
- `Content-Security-Policy` - Control resource loading

## See Also

- [Security Best Practices](./04-security-best-practices.md) - Security guidelines
- [Request/Response Format](../01-core-concepts/03-request-response-format.md) - Standard headers
