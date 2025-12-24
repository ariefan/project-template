# Security Guide

This guide documents the security practices, configuration, and patterns used across the monorepo.

## Table of Contents

1. [Authentication](#authentication)
2. [Authorization](#authorization)
3. [Secrets Management](#secrets-management)
4. [Input Validation](#input-validation)
5. [CORS Configuration](#cors-configuration)
6. [Rate Limiting](#rate-limiting)
7. [Security Headers](#security-headers)
8. [Data Protection](#data-protection)
9. [Security Checklist](#security-checklist)

---

## Authentication

### Overview

Authentication is handled by `@workspace/auth` using [Better Auth](https://better-auth.com). See [packages/auth/README.md](../packages/auth/README.md) for full documentation.

### Authentication Methods

| Method | Security Level | Use Case |
|--------|---------------|----------|
| Passkey (WebAuthn) | Highest | Phishing-resistant, recommended |
| Email/Password + 2FA | High | Standard with MFA |
| OAuth (Google/GitHub) | High | Delegated auth |
| Magic Link | Medium | Passwordless |
| API Key | Medium | Machine-to-machine |
| Phone OTP | Medium | Mobile-first |

### Session Security

```typescript
// Session configuration in @workspace/auth
session: {
  expiresIn: 60 * 60 * 24 * 7,  // 7 days
  updateAge: 60 * 60 * 24,      // Refresh daily
  cookieCache: {
    enabled: true,
    maxAge: 60 * 5,             // 5 minute cache
  },
},
```

### Cookie Configuration

```typescript
advanced: {
  cookiePrefix: "auth",
  useSecureCookies: isProduction,  // HTTPS only in production
  crossSubDomainCookies: {
    enabled: true,
    domain: ".example.com",       // Share across subdomains
  },
},
```

### Protecting Routes

```typescript
// apps/api/src/middleware/auth.ts
export async function requireAuth(request: FastifyRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    throw new UnauthorizedError("Authentication required");
  }

  request.user = session.user;
  request.session = session.session;
}

// Usage
app.get("/protected", { preHandler: [requireAuth] }, async (request) => {
  return { user: request.user };
});
```

---

## Authorization

### Overview

Authorization is handled by `@workspace/authorization` using [Casbin](https://casbin.org/). See [packages/authorization/README.md](../packages/authorization/README.md) for full documentation.

### Authorization Model

```
Request: (subject, app, tenant, resource, action, resourceOwnerId)
```

- **subject** - User ID
- **app** - Application (api, admin, etc.)
- **tenant** - Organization ID
- **resource** - What (posts, settings, etc.)
- **action** - How (read, create, update, delete)
- **resourceOwnerId** - For owner-based access

### Deny-Override

```
1. If ANY policy matches with eft=deny → DENY
2. If ANY policy matches with eft=allow → ALLOW
3. Otherwise → DENY (default deny)
```

### Protecting Resources

```typescript
// apps/api/src/middleware/authorization.ts
import { authorization } from "@workspace/authorization";

export async function requirePermission(
  resource: string,
  action: string
) {
  return async (request: FastifyRequest) => {
    const allowed = await authorization.enforce(
      request.user.id,
      "api",
      request.orgId,
      resource,
      action,
      ""
    );

    if (!allowed) {
      throw new ForbiddenError(
        `You don't have permission to ${action} ${resource}`
      );
    }
  };
}

// Usage
app.delete(
  "/posts/:id",
  {
    preHandler: [
      requireAuth,
      requirePermission("posts", "delete"),
    ],
  },
  async (request) => {
    // User is authenticated and authorized
  }
);
```

### Owner-Based Access

```typescript
// Check if user can update their own resource
const post = await db.query.posts.findFirst({
  where: eq(posts.id, postId),
});

const allowed = await authorization.enforce(
  request.user.id,
  "api",
  request.orgId,
  "posts",
  "update",
  post.authorId  // Resource owner
);
```

---

## Secrets Management

### Environment Variables

**Never commit secrets to git.** Use environment variables:

```bash
# .env.example (committed - template only)
DATABASE_URL=postgres://user:password@localhost:5432/db
BETTER_AUTH_SECRET=generate-a-random-32-char-secret
GOOGLE_CLIENT_SECRET=your-client-secret

# .env.local (never committed - actual values)
DATABASE_URL=postgres://real-user:real-password@host:5432/db
```

### Secret Generation

```bash
# Generate secure secrets
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Required Secrets

| Secret | Purpose | Example |
|--------|---------|---------|
| `DATABASE_URL` | Database connection | `postgres://...` |
| `BETTER_AUTH_SECRET` | Session encryption | Random 32+ chars |
| `GOOGLE_CLIENT_SECRET` | OAuth | From Google Console |
| `GITHUB_CLIENT_SECRET` | OAuth | From GitHub Settings |
| `RESEND_API_KEY` | Email sending | `re_...` |
| `TWILIO_AUTH_TOKEN` | SMS/WhatsApp | From Twilio |

### Production Secrets

In production, use your platform's secret management:

- **Vercel**: Environment Variables (encrypted)
- **AWS**: Secrets Manager or Parameter Store
- **Docker**: Docker Secrets
- **Kubernetes**: Kubernetes Secrets

### Never Log Secrets

```typescript
// Bad
console.log("Config:", config);

// Good - explicit logging without secrets
console.log("Config loaded:", {
  database: config.database.host,
  auth: { provider: config.auth.provider },
});
```

---

## Input Validation

### Zod Schema Validation

All input must be validated using Zod schemas:

```typescript
import { z } from "zod";

// Define schema
const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(50000),
  tags: z.array(z.string()).max(10).optional(),
});

// Use in route
app.post("/posts", {
  schema: {
    body: createPostSchema,
  },
}, async (request) => {
  // request.body is validated and typed
  const { title, content, tags } = request.body;
});
```

### Common Validation Patterns

```typescript
// Email
z.string().email()

// UUID
z.string().uuid()

// URL
z.string().url()

// Enum
z.enum(["draft", "published", "archived"])

// Positive integer
z.number().int().positive()

// Date
z.coerce.date()

// Optional with default
z.string().optional().default("default-value")

// Nullable
z.string().nullable()

// Custom validation
z.string().refine(
  (val) => !val.includes("<script>"),
  { message: "Invalid content" }
)
```

### SQL Injection Prevention

Drizzle ORM uses parameterized queries by default:

```typescript
// Safe - parameterized
const user = await db
  .select()
  .from(users)
  .where(eq(users.email, userInput));

// Also safe - explicit SQL with params
const results = await db.execute(
  sql`SELECT * FROM users WHERE email = ${userInput}`
);
```

### XSS Prevention

React escapes content by default. Be careful with:

```tsx
// Dangerous - only use with sanitized content
<div dangerouslySetInnerHTML={{ __html: content }} />

// Safe - React escapes this
<div>{userContent}</div>
```

---

## CORS Configuration

### API CORS Setup

```typescript
// apps/api/src/index.ts
import cors from "@fastify/cors";

app.register(cors, {
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.WEB_URL,           // https://app.example.com
      process.env.ADMIN_URL,         // https://admin.example.com
    ];

    // Allow requests with no origin (mobile apps, curl)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"), false);
    }
  },
  credentials: true,  // Allow cookies
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
});
```

### Better Auth Trusted Origins

```typescript
// @workspace/auth configuration
trustedOrigins: [
  "https://app.example.com",
  "https://admin.example.com",
],
```

---

## Rate Limiting

### Basic Rate Limiting

```typescript
// apps/api/src/plugins/rate-limit.ts
import rateLimit from "@fastify/rate-limit";

app.register(rateLimit, {
  max: 100,              // Max requests
  timeWindow: "1 minute",
  keyGenerator: (request) => {
    // Rate limit by user ID if authenticated, IP otherwise
    return request.user?.id ?? request.ip;
  },
  errorResponseBuilder: (request, context) => ({
    error: {
      code: "RATE_LIMITED",
      message: "Too many requests",
      details: {
        retryAfter: context.after,
      },
    },
  }),
});
```

### Endpoint-Specific Limits

```typescript
// Stricter limits for sensitive endpoints
app.post(
  "/auth/login",
  {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: "15 minutes",
      },
    },
  },
  async (request) => {
    // Handle login
  }
);
```

### Rate Limit Headers

Responses include rate limit info:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1703462400
```

---

## Security Headers

### Fastify Helmet

```typescript
// apps/api/src/index.ts
import helmet from "@fastify/helmet";

app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,  // May need adjustment for APIs
});
```

### Next.js Security Headers

```typescript
// apps/web/next.config.js
const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

module.exports = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};
```

---

## Data Protection

### Password Hashing

Better Auth uses bcrypt by default:

```typescript
password: {
  hash: (password) => bcrypt.hash(password, 10),
  verify: ({ hash, password }) => bcrypt.compare(password, hash),
},
```

### Sensitive Data Handling

```typescript
// Never return passwords or secrets
const user = await db.query.users.findFirst({
  where: eq(users.id, userId),
  columns: {
    id: true,
    email: true,
    name: true,
    // Explicitly exclude: passwordHash, apiKey, etc.
  },
});

// Or use a transform
function sanitizeUser(user: User) {
  const { passwordHash, ...safe } = user;
  return safe;
}
```

### Audit Logging

Log security-relevant events:

```typescript
import { AuthorizationAuditService } from "@workspace/authorization";

const audit = new AuthorizationAuditService(db);

// Log permission checks
await audit.log({
  userId: "user_123",
  action: "delete",
  resource: "posts",
  resourceId: "post_456",
  allowed: false,
  context: {
    ip: request.ip,
    userAgent: request.headers["user-agent"],
  },
});
```

---

## Security Checklist

### Before Deployment

- [ ] All secrets in environment variables (not code)
- [ ] HTTPS enabled (TLS certificates)
- [ ] CORS configured for production domains only
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (content escaping)
- [ ] CSRF protection (SameSite cookies)
- [ ] Password hashing (bcrypt, 10+ rounds)
- [ ] Session timeout configured
- [ ] Error messages sanitized (no stack traces in production)
- [ ] Audit logging enabled
- [ ] Dependencies updated (no known vulnerabilities)

### Ongoing Security

- [ ] Regular dependency updates (`pnpm audit`)
- [ ] Monitor rate limit violations
- [ ] Review audit logs for anomalies
- [ ] Rotate secrets periodically
- [ ] Test authentication flows
- [ ] Review new code for security issues

### Third-Party Security

- [ ] OAuth apps use least-privilege scopes
- [ ] API keys have expiration
- [ ] Webhook signatures verified
- [ ] External data validated before use

---

## Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Better Auth Security](https://better-auth.com/docs/security)
- [Casbin Authorization](https://casbin.org/docs/overview)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
