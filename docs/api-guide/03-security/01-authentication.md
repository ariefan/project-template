# Authentication

**Related**: [Authorization](./02-authorization.md) · [Security Best Practices](./04-security-best-practices.md) · [Multitenancy](../01-core-concepts/05-multitenancy.md)

## Overview

The API uses **token-based authentication**, agnostic to the authentication provider (Better Auth, Auth0, Clerk, custom SSO, or standalone auth).

All requests must include a valid access token in the `Authorization` header.

**New to authentication?** See [Getting Started with Authentication](./06-getting-started-auth.md) for a step-by-step implementation guide.

## Authentication Methods

### Bearer Token (Primary)

**For:** User authentication, session management

```http
GET /v1/orgs/{orgId}/users HTTP/1.1
Authorization: Bearer {access_token}
```

**Example:**
```http
GET /v1/orgs/org_abc/users HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### API Key (Service Accounts)

**For:** Service-to-service communication, automation, long-lived access

```http
GET /v1/orgs/{orgId}/users HTTP/1.1
X-API-Key: key_abc123xyz789
```

## Access Token Format

The API expects **JWT tokens** with the following claims:

```json
{
  "sub": "usr_123",
  "email": "user@example.com",
  "tenantId": "org_abc",
  "roles": ["admin"],
  "permissions": ["users:read", "users:write"],
  "iat": 1642348800,
  "exp": 1642352400
}
```

**Required Claims:**
| Claim | Type | Description |
|-------|------|-------------|
| `sub` | string | User ID (prefixed, e.g., `usr_123`) |
| `email` | string | User email address |
| `iat` | number | Issued at (Unix timestamp) |
| `exp` | number | Expiration time (Unix timestamp) |

**Optional Claims:**
| Claim | Type | Description |
|-------|------|-------------|
| `tenantId` | string | Current active tenant |
| `roles` | string[] | User roles (tenant-scoped) |
| `permissions` | string[] | Granular permissions |
| `sessionId` | string | Session identifier |

## Token Lifecycle

### Token Expiration

Access tokens typically expire after **15-60 minutes**. When a token expires, the API returns `401 Unauthorized`.

**Expired token response:**
```json
{
  "error": {
    "code": "unauthorized",
    "message": "Access token has expired",
    "details": [
      {
        "code": "tokenExpired",
        "message": "Access token expired at 2024-01-15T10:30:00Z",
        "metadata": {
          "expiredAt": "2024-01-15T10:30:00Z"
        }
      }
    ]
  }
}
```

**Client action:** Refresh the access token using your authentication provider's refresh mechanism.

### Token Refresh

Token refresh is handled by your authentication provider (Better Auth, Auth0, etc.).

**Generic refresh flow:**
1. Client detects `401 token_expired` error
2. Client calls auth provider's refresh endpoint
3. Auth provider issues new access token
4. Client retries original request with new token

**Example (provider-agnostic):**
```typescript
// Pseudocode - actual implementation depends on your auth provider
async function refreshAccessToken(refreshToken: string) {
  const response = await authProvider.refresh({ refreshToken });
  return response.access_token;
}
```

### Token Revocation

Tokens can be revoked when:
- User logs out
- User changes password
- Admin revokes session
- Security breach detected

**Revoked token response:**
```json
{
  "error": {
    "code": "unauthorized",
    "message": "Access token has been revoked",
    "details": [
      {
        "code": "tokenRevoked",
        "message": "This session has been terminated",
        "metadata": {
          "revokedAt": "2024-01-15T11:00:00Z",
          "reason": "userLogout"
        }
      }
    ]
  }
}
```

## Authentication Errors

| Status | Error Code | Description | Client Action |
|--------|------------|-------------|---------------|
| 401 | `unauthorized` | No token provided | Redirect to login |
| 401 | `tokenExpired` | Token has expired | Refresh token |
| 401 | `tokenInvalid` | Malformed or invalid token | Re-authenticate |
| 401 | `tokenRevoked` | Token revoked | Re-authenticate |
| 403 | `forbidden` | Valid token, insufficient permissions | Show error (see [Authorization](./02-authorization.md)) |

**Example error responses:**

**Missing token:**
```json
{
  "error": {
    "code": "unauthorized",
    "message": "Authentication required",
    "details": [
      {
        "code": "missingToken",
        "message": "No Authorization header provided"
      }
    ]
  }
}
```

**Invalid token:**
```json
{
  "error": {
    "code": "unauthorized",
    "message": "Invalid access token",
    "details": [
      {
        "code": "tokenInvalid",
        "message": "Token signature verification failed"
      }
    ]
  }
}
```

## Authentication Provider Integration

The API is **provider-agnostic** and works with any authentication system that can issue JWT tokens with the required claims.

### Supported Providers

- **Better Auth** - Modern auth library for Next.js/Node.js
- **Auth0** - Enterprise identity platform
- **Clerk** - User management for modern apps
- **Supabase Auth** - Open-source auth
- **Custom JWT** - Self-managed authentication
- **SSO/SAML** - Enterprise single sign-on

### Integration Requirements

Your authentication provider must:
1. Issue **JWT access tokens** with required claims
2. Support token refresh (optional but recommended)
3. Provide token revocation (optional)
4. Use secure token signing (RS256 or HS256)

### Token Signing

**Recommended:** RS256 (asymmetric)
- API validates tokens using public key
- Auth provider signs with private key
- More secure for distributed systems

**Alternative:** HS256 (symmetric)
- Single shared secret
- Simpler setup
- Suitable for monolithic apps

## API Key Authentication

For service accounts and automation:

### Creating API Keys

```http
POST /v1/orgs/{orgId}/api-keys HTTP/1.1
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "name": "CI/CD Pipeline",
  "permissions": ["deployments:write", "logs:read"],
  "expiresAt": "2025-01-15T00:00:00Z"
}
```

**Response:**
```json
{
  "data": {
    "id": "key_abc123",
    "name": "CI/CD Pipeline",
    "key": "key_abc123xyz789_secret",
    "permissions": ["deployments:write", "logs:read"],
    "createdAt": "2024-01-15T10:00:00Z",
    "expiresAt": "2025-01-15T00:00:00Z"
  }
}
```

**Security:**
- Store API key securely (environment variables, secrets manager)
- Rotate keys periodically
- Use minimum required permissions
- Set expiration dates

### Using API Keys

```http
GET /v1/orgs/{orgId}/deployments HTTP/1.1
X-API-Key: key_abc123xyz789_secret
```

## Implementation Example

**Token validation middleware (provider-agnostic):**

```typescript
import { verify } from 'jsonwebtoken';

interface TokenPayload {
  sub: string;
  email: string;
  tenant_id?: string;
  roles?: string[];
  permissions?: string[];
  exp: number;
}

async function validateToken(token: string): Promise<TokenPayload> {
  try {
    // Verify token signature (use your provider's public key)
    const payload = verify(token, process.env.JWT_PUBLIC_KEY, {
      algorithms: ['RS256'],
    }) as TokenPayload;

    // Check expiration
    if (payload.exp * 1000 < Date.now()) {
      throw new Error('token_expired');
    }

    // Check revocation (if using a revocation list)
    const isRevoked = await checkRevocationList(payload.sub, token);
    if (isRevoked) {
      throw new Error('token_revoked');
    }

    return payload;
  } catch (error) {
    if (error.message === 'token_expired') throw error;
    if (error.message === 'token_revoked') throw error;
    throw new Error('token_invalid');
  }
}

// Express middleware
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        code: 'unauthorized',
        message: 'Authentication required',
      },
    });
  }

  const token = authHeader.substring(7);

  try {
    const payload = await validateToken(token);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({
      error: {
        code: 'unauthorized',
        message: error.message,
      },
    });
  }
}
```

## Security Best Practices

1. **Token Storage**
   - Web: httpOnly cookies (most secure)
   - Mobile: Secure storage (Keychain/Keystore)
   - Never localStorage for sensitive tokens

2. **Token Transmission**
   - Always use HTTPS
   - Never include tokens in URLs
   - Never log tokens

3. **Token Lifetime**
   - Short-lived access tokens (15-60 min)
   - Long-lived refresh tokens (days/weeks)
   - Rotate refresh tokens on use

4. **Token Validation**
   - Verify signature
   - Check expiration
   - Validate issuer/audience
   - Check revocation status

## See Also

- [Authorization](./02-authorization.md) - Permission model and multi-tenant roles
- [Multitenancy](../01-core-concepts/05-multitenancy.md) - Tenant isolation
- [Rate Limiting](./03-rate-limiting.md) - Protect endpoints
- [Security Best Practices](./04-security-best-practices.md) - Security guidelines
- [Audit Logging](../06-quality/01-audit-logging.md) - Track authentication events
