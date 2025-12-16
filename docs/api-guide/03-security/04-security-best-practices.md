# Security Best Practices

**Related**: [Authentication](./01-authentication.md) · [Authorization](./02-authorization.md) · [Rate Limiting](./03-rate-limiting.md) · [CORS and Headers](./05-cors-and-headers.md)

## Overview

This guide covers security best practices for production APIs, mapped to OWASP Top 10 and compliance requirements (GDPR, CCPA, SOC 2).

**Priority Order:**
1. Authentication & Authorization (prevent unauthorized access)
2. Input Validation (prevent injection attacks)
3. PII Protection (comply with regulations)
4. Secrets Management (protect credentials)
5. Audit Logging (detect breaches)

---

## OWASP Top 10 for APIs (2023)

### API1: Broken Object Level Authorization (BOLA)

**Risk:** Users accessing resources they don't own.

**Example Attack:**
```http
# User A tries to access User B's data
GET /v1/orgs/org_abc/users/usr_999  # usr_999 belongs to different tenant
Authorization: Bearer {user_a_token}
```

**✅ Prevention:**
```typescript
// ALWAYS verify resource belongs to authenticated tenant
app.get('/v1/orgs/:org_id/users/:user_id', authenticate, async (req, res) => {
  const { org_id, user_id } = req.params;

  // Check 1: Token tenant matches URL tenant
  if (req.user.tenant_id !== org_id) {
    return res.status(403).json({
      error: { code: 'forbidden', message: 'Access denied to this tenant' }
    });
  }

  // Check 2: Resource belongs to tenant
  const user = await db('users')
    .where('id', user_id)
    .where('tenant_id', org_id)  // CRITICAL: Always scope by tenant
    .first();

  if (!user) {
    return res.status(404).json({
      error: { code: 'not_found', message: 'User not found' }
    });
  }

  res.json({ data: user });
});
```

**AI Instruction:** ALWAYS add `WHERE tenant_id = ?` to every query. Never trust user_id alone.

---

### API2: Broken Authentication

**Risk:** Weak token validation, exposed credentials.

**✅ Prevention:**

```typescript
// 1. Verify token signature
import { verify } from 'jsonwebtoken';

async function validateToken(token: string) {
  try {
    const payload = verify(token, process.env.JWT_PUBLIC_KEY, {
      algorithms: ['RS256'],  // Only allow RS256, never 'none'
      issuer: 'https://auth.example.com',
      audience: 'api.example.com'
    });

    // 2. Check expiration
    if (payload.exp * 1000 < Date.now()) {
      throw new Error('token_expired');
    }

    // 3. Check revocation list (Redis/database)
    const isRevoked = await redis.sismember('revoked_tokens', token);
    if (isRevoked) {
      throw new Error('token_revoked');
    }

    return payload;
  } catch (error) {
    throw new Error('unauthorized');
  }
}

// 4. Rate limit authentication attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,  // 5 attempts
  message: 'Too many login attempts, please try again later'
});

app.post('/auth/login', loginLimiter, async (req, res) => {
  // Login logic
});
```

**Never:**
- Accept `alg: none` in JWT
- Store passwords in plain text
- Use weak secrets (< 32 characters)
- Skip token expiration checks

---

### API3: Broken Object Property Level Authorization

**Risk:** Exposing sensitive fields or accepting unauthorized updates.

**✅ Prevention:**

```typescript
// Define allowed fields per role
const ALLOWED_FIELDS = {
  admin: ['id', 'email', 'name', 'phone', 'role', 'created_at'],
  member: ['id', 'email', 'name'],  // No sensitive fields
  public: ['id', 'name']  // Minimal info
};

// Filter response based on permissions
function filterFields(data: any, role: string) {
  const allowed = ALLOWED_FIELDS[role];
  return Object.keys(data)
    .filter(key => allowed.includes(key))
    .reduce((obj, key) => {
      obj[key] = data[key];
      return obj;
    }, {});
}

app.get('/users/:id', authenticate, async (req, res) => {
  const user = await db('users').where('id', req.params.id).first();

  // Filter fields based on role
  const filtered = filterFields(user, req.user.role);

  res.json({ data: filtered });
});

// Mass assignment protection
const ALLOWED_UPDATE_FIELDS = ['name', 'email', 'phone'];

app.patch('/users/:id', authenticate, async (req, res) => {
  // Only allow specific fields to be updated
  const updates = Object.keys(req.body)
    .filter(key => ALLOWED_UPDATE_FIELDS.includes(key))
    .reduce((obj, key) => {
      obj[key] = req.body[key];
      return obj;
    }, {});

  await db('users').where('id', req.params.id).update(updates);
});
```

**Never allow:**
```typescript
// ❌ BAD: Client can update any field
app.patch('/users/:id', (req, res) => {
  await db('users').where('id', req.params.id).update(req.body);
  // Client could send: { role: 'admin', is_verified: true }
});
```

---

### API4: Unrestricted Resource Consumption

**Risk:** DDoS, resource exhaustion.

**✅ Prevention:**

```typescript
// 1. Rate limiting (per IP, per user, per tenant)
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,  // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by user ID if authenticated
    return req.user?.id || req.ip;
  }
});

app.use('/v1/', apiLimiter);

// 2. Tenant-level rate limiting
const tenantLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: async (req) => {
    const tenant = await getTenantSettings(req.params.org_id);
    return tenant.rate_limit || 100;  // Per-tenant limits
  },
  keyGenerator: (req) => req.params.org_id
});

// 3. Limit pagination size
app.get('/users', (req, res) => {
  const pageSize = Math.min(req.query.page_size || 50, 100);  // Max 100
  // ...
});

// 4. Timeout long-running requests
app.use(timeout('30s'));

// 5. Limit request body size
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));
```

**See:** [Rate Limiting](./03-rate-limiting.md) for complete implementation.

---

### API5: Broken Function Level Authorization

**Risk:** Users calling admin-only endpoints.

**✅ Prevention:**

```typescript
// Permission middleware
function requirePermission(...permissions: string[]) {
  return (req, res, next) => {
    const userPerms = req.user.permissions || [];

    const hasPermission = permissions.every(required =>
      userPerms.some(perm => matchesPermission(perm, required))
    );

    if (!hasPermission) {
      return res.status(403).json({
        error: {
          code: 'forbidden',
          message: `Required permissions: ${permissions.join(', ')}`,
          metadata: {
            required: permissions,
            actual: userPerms
          }
        }
      });
    }

    next();
  };
}

// Usage
app.delete('/users/:id',
  authenticate,
  requirePermission('users:delete'),  // CRITICAL: Check before action
  async (req, res) => {
    // Delete user
  }
);

app.post('/orgs/:org_id/settings',
  authenticate,
  requirePermission('settings:admin'),  // Only admins
  async (req, res) => {
    // Update settings
  }
);
```

**Never:**
```typescript
// ❌ BAD: No permission check
app.delete('/users/:id', authenticate, async (req, res) => {
  await db('users').where('id', req.params.id).delete();
  // Any authenticated user can delete any user!
});
```

---

### API6: Unrestricted Access to Sensitive Business Flows

**Risk:** Bypassing multi-step processes (e.g., payment without checkout).

**✅ Prevention:**

```typescript
// State machine for sensitive flows
interface PaymentFlow {
  step: 'cart' | 'checkout' | 'payment' | 'confirmed';
  session_id: string;
  created_at: Date;
  expires_at: Date;
}

app.post('/payments/process', authenticate, async (req, res) => {
  const { session_id } = req.body;

  // Verify session exists and is in correct state
  const flow = await redis.get(`payment_flow:${session_id}`);

  if (!flow) {
    return res.status(400).json({
      error: { code: 'invalid_session', message: 'Payment session not found' }
    });
  }

  if (flow.step !== 'checkout') {
    return res.status(400).json({
      error: {
        code: 'invalid_state',
        message: `Cannot process payment in '${flow.step}' state. Complete checkout first.`
      }
    });
  }

  // Check expiration
  if (new Date(flow.expires_at) < new Date()) {
    return res.status(400).json({
      error: { code: 'session_expired', message: 'Checkout session expired' }
    });
  }

  // Process payment
  await processPayment(session_id);

  // Update state
  await redis.set(`payment_flow:${session_id}`, { ...flow, step: 'confirmed' });
});
```

---

### API7: Server Side Request Forgery (SSRF)

**Risk:** API making requests to internal services.

**✅ Prevention:**

```typescript
// Webhook URL validation
const ALLOWED_PROTOCOLS = ['https'];
const BLOCKED_HOSTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '169.254.169.254',  // AWS metadata
  '::1'
];

function validateWebhookUrl(url: string): void {
  const parsed = new URL(url);

  // Only HTTPS
  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol.replace(':', ''))) {
    throw new Error('Only HTTPS URLs allowed');
  }

  // Block internal IPs
  if (BLOCKED_HOSTS.includes(parsed.hostname)) {
    throw new Error('Internal URLs not allowed');
  }

  // Block private IP ranges
  if (parsed.hostname.match(/^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/)) {
    throw new Error('Private IP ranges not allowed');
  }
}

app.post('/webhooks', authenticate, async (req, res) => {
  const { url } = req.body;

  validateWebhookUrl(url);  // Throws if invalid

  await db('webhooks').insert({ url, tenant_id: req.user.tenant_id });
  res.status(201).json({ data: { url } });
});
```

---

### API8: Security Misconfiguration

**✅ Required Security Headers:**

See [CORS and Headers](./05-cors-and-headers.md#required-security-headers) for complete configuration.

**Environment-specific settings:**

```typescript
// Different settings per environment
const config = {
  development: {
    cors: { origin: '*' },
    debug: true,
    stackTrace: true
  },
  production: {
    cors: { origin: ['https://app.example.com'] },
    debug: false,
    stackTrace: false  // Never expose stack traces in production
  }
};

// Error handling
app.use((err, req, res, next) => {
  console.error(err);  // Log internally

  res.status(500).json({
    error: {
      code: 'internal_error',
      message: 'An unexpected error occurred',
      // NEVER include stack trace in production
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});
```

---

### API9: Improper Inventory Management

**Best Practices:**
- Document all API endpoints (OpenAPI/Swagger)
- Track deprecated endpoints
- Remove unused endpoints
- Version control for breaking changes

See: [Versioning](../01-core-concepts/04-versioning.md) and [Deprecation](../08-governance/04-deprecation.md)

---

### API10: Unsafe Consumption of APIs

**Risk:** Calling untrusted third-party APIs.

**✅ Prevention:**

```typescript
// Timeout third-party API calls
import axios from 'axios';

const externalApi = axios.create({
  timeout: 5000,  // 5 second timeout
  maxRedirects: 0,  // Don't follow redirects
  validateStatus: (status) => status < 500  // Don't throw on 4xx
});

// Validate responses
async function fetchExternalData(url: string) {
  try {
    const response = await externalApi.get(url);

    // Validate response schema
    if (!response.data.id || !response.data.name) {
      throw new Error('Invalid response format');
    }

    return response.data;
  } catch (error) {
    // Don't expose third-party errors to clients
    throw new Error('External service unavailable');
  }
}
```

---

## SQL Injection Prevention

**CRITICAL:** Always use parameterized queries.

**❌ VULNERABLE:**
```typescript
// NEVER do this
app.get('/users', async (req, res) => {
  const { search } = req.query;

  // SQL INJECTION VULNERABILITY!
  const users = await db.raw(`SELECT * FROM users WHERE name = '${search}'`);
  // Attack: ?search=' OR '1'='1
});
```

**✅ SAFE:**
```typescript
// Use parameterized queries
app.get('/users', async (req, res) => {
  const { search } = req.query;

  // Safe: Query builder
  const users = await db('users')
    .where('name', 'LIKE', `%${search}%`)
    .where('tenant_id', req.user.tenant_id);

  // Safe: Parameterized raw query
  const users = await db.raw(
    'SELECT * FROM users WHERE name LIKE ? AND tenant_id = ?',
    [`%${search}%`, req.user.tenant_id]
  );

  res.json({ data: users });
});
```

**AI Instruction:** NEVER concatenate user input into SQL strings. ALWAYS use parameterized queries or query builders.

---

## Input Validation & Sanitization

**Validate ALL input:**

```typescript
import { z } from 'zod';

// Define schemas
const CreateUserSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(1).max(100),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  age: z.number().int().min(0).max(150).optional()
});

app.post('/users', authenticate, async (req, res) => {
  try {
    // Validate input
    const validated = CreateUserSchema.parse(req.body);

    // Input is now safe to use
    const user = await db('users').insert({
      ...validated,
      tenant_id: req.user.tenant_id
    });

    res.status(201).json({ data: user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(422).json({
        error: {
          code: 'validation_error',
          message: 'Invalid input',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        }
      });
    }
    throw error;
  }
});
```

**Sanitize HTML content:**

```typescript
import DOMPurify from 'isomorphic-dompurify';

app.post('/posts', authenticate, async (req, res) => {
  const { content } = req.body;

  // Sanitize HTML to prevent XSS
  const sanitized = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a'],
    ALLOWED_ATTR: ['href']
  });

  await db('posts').insert({ content: sanitized });
});
```

---

## PII Protection (GDPR/CCPA Compliance)

### Identifying PII

**PII includes:**
- Email addresses
- Phone numbers
- IP addresses
- Full names
- Physical addresses
- Payment information
- Health records
- Biometric data

### Encryption at Rest

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;  // 32 bytes
const ALGORITHM = 'aes-256-gcm';

function encrypt(text: string): { encrypted: string; iv: string; tag: string } {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: cipher.getAuthTag().toString('hex')
  };
}

// Store encrypted PII
app.post('/users', async (req, res) => {
  const { ssn, credit_card } = req.body;

  const encryptedSSN = encrypt(ssn);
  const encryptedCard = encrypt(credit_card);

  await db('users').insert({
    ssn_encrypted: encryptedSSN.encrypted,
    ssn_iv: encryptedSSN.iv,
    ssn_tag: encryptedSSN.tag
  });
});
```

### Data Masking in Logs

```typescript
function maskPII(data: any): any {
  if (typeof data !== 'object') return data;

  const masked = { ...data };

  // Mask email
  if (masked.email) {
    masked.email = masked.email.replace(/(.{1,3}).*(@.*)/, '$1***$2');
  }

  // Mask phone
  if (masked.phone) {
    masked.phone = masked.phone.replace(/\d(?=\d{4})/g, '*');
  }

  // Mask credit card
  if (masked.card_number) {
    masked.card_number = '****' + masked.card_number.slice(-4);
  }

  // Mask SSN
  if (masked.ssn) {
    masked.ssn = '***-**-' + masked.ssn.slice(-4);
  }

  return masked;
}

// Logger middleware
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    console.log({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: Date.now() - start,
      body: maskPII(req.body)  // Mask PII before logging
    });
  });

  next();
});
```

### GDPR Rights Implementation

```typescript
// Right to access (data export)
app.get('/users/:id/export', authenticate, requirePermission('users:export'), async (req, res) => {
  const userId = req.params.id;

  // Collect all user data
  const user = await db('users').where('id', userId).first();
  const orders = await db('orders').where('user_id', userId);
  const addresses = await db('addresses').where('user_id', userId);

  const exportData = {
    user,
    orders,
    addresses,
    exported_at: new Date().toISOString()
  };

  res.json({ data: exportData });
});

// Right to erasure (hard delete)
app.delete('/users/:id/gdpr-delete', authenticate, requirePermission('users:delete'), async (req, res) => {
  const userId = req.params.id;

  // Delete from all tables
  await db.transaction(async (trx) => {
    await trx('orders').where('user_id', userId).delete();
    await trx('addresses').where('user_id', userId).delete();
    await trx('sessions').where('user_id', userId).delete();
    await trx('users').where('id', userId).delete();
  });

  // Log deletion for compliance (tamper-proof)
  await db.raw(`
    SELECT audit.log_event(
      p_event_type := 'user.gdpr_deleted',
      p_tenant_id := ?,
      p_actor_type := 'user',
      p_actor_id := ?,
      p_actor_email := ?,
      p_actor_ip_address := ?::INET,
      p_resource_type := 'user',
      p_resource_id := ?,
      p_endpoint := '/users/:id/gdpr-delete',
      p_http_method := 'DELETE',
      p_resource_before := ?::JSONB,
      p_request_id := ?
    )
  `, [
    req.user.tenant_id,
    req.user.id,
    req.user.email,
    req.ip,
    userId,
    JSON.stringify(user),  // Store deleted user data
    req.headers['x-request-id']
  ]);

  res.status(204).send();
});
```

---

## Secrets Management

**NEVER hardcode secrets:**

```typescript
// ❌ BAD
const API_KEY = 'sk_live_abc123xyz789';
const DB_PASSWORD = 'mypassword123';

// ✅ GOOD: Environment variables
const API_KEY = process.env.STRIPE_API_KEY;
const DB_PASSWORD = process.env.DATABASE_PASSWORD;

// ✅ BETTER: Secret management service
import { SecretsManager } from '@aws-sdk/client-secrets-manager';

const secretsManager = new SecretsManager({ region: 'us-east-1' });

async function getSecret(secretName: string) {
  const response = await secretsManager.getSecretValue({ SecretId: secretName });
  return JSON.parse(response.SecretString);
}

const dbConfig = await getSecret('production/database');
```

**Environment variable validation:**

```typescript
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  DATABASE_URL: z.string().url(),
  JWT_PUBLIC_KEY: z.string().min(100),
  ENCRYPTION_KEY: z.string().length(64),  // 32 bytes hex
  STRIPE_API_KEY: z.string().startsWith('sk_'),
  REDIS_URL: z.string().url()
});

// Validate on startup
try {
  EnvSchema.parse(process.env);
} catch (error) {
  console.error('Invalid environment variables:', error);
  process.exit(1);
}
```

**Rotate secrets regularly:**
- API keys: Every 90 days
- Database passwords: Every 90 days
- Encryption keys: Annually
- JWT signing keys: Every 6 months

---

## Audit Logging

**Log security events:**

```typescript
enum AuditAction {
  LOGIN = 'auth.login',
  LOGOUT = 'auth.logout',
  PASSWORD_CHANGE = 'auth.password_change',
  PERMISSION_GRANT = 'authz.permission_grant',
  PERMISSION_REVOKE = 'authz.permission_revoke',
  RESOURCE_CREATE = 'resource.create',
  RESOURCE_UPDATE = 'resource.update',
  RESOURCE_DELETE = 'resource.delete',
  SENSITIVE_ACCESS = 'data.sensitive_access',
  EXPORT = 'data.export'
}

async function logAudit(action: AuditAction, details: any) {
  // Use tamper-proof audit logging with hash chains
  await db.raw(`
    SELECT audit.log_event(
      p_event_type := ?,
      p_tenant_id := ?,
      p_actor_type := 'user',
      p_actor_id := ?,
      p_actor_email := ?,
      p_actor_ip_address := ?::INET,
      p_resource_type := ?,
      p_resource_id := ?,
      p_endpoint := ?,
      p_http_method := ?,
      p_changes := ?::JSONB,
      p_request_id := ?,
      p_user_agent := ?,
      p_metadata := ?::JSONB
    )
  `, [
    action,
    details.tenant_id,
    details.user_id,
    details.user_email,
    details.ip_address,
    details.resource_type,
    details.resource_id,
    details.endpoint,
    details.http_method,
    details.changes ? JSON.stringify(details.changes) : null,
    details.request_id,
    details.user_agent,
    details.metadata ? JSON.stringify(details.metadata) : null
  ]);
}

// Usage
app.delete('/users/:id', authenticate, requirePermission('users:delete'), async (req, res) => {
  const userId = req.params.id;

  await db('users').where('id', userId).update({ deleted_at: new Date() });

  // Log deletion (tamper-proof)
  await logAudit(AuditAction.RESOURCE_DELETE, {
    user_id: req.user.id,
    user_email: req.user.email,
    tenant_id: req.user.tenant_id,
    resource_type: 'user',
    resource_id: userId,
    endpoint: `/users/${userId}`,
    http_method: 'DELETE',
    ip_address: req.ip,
    user_agent: req.get('user-agent'),
    request_id: req.headers['x-request-id']
  });

  res.json({ data: { deleted: true } });
});
```

**What to log:**
- Authentication attempts (success/failure)
- Permission changes
- Access to sensitive data
- Data exports
- Resource deletion
- Failed authorization attempts
- Rate limit violations

**What NOT to log:**
- Passwords
- Access tokens
- API keys
- Full PII (mask it)

**Important:** The examples above use **tamper-proof audit logging** with hash chains. This ensures:
- ✅ Audit logs cannot be modified or deleted
- ✅ Any tampering is detectable
- ✅ Compliance-ready (SOC2, HIPAA, GDPR)

See: [Audit Logging](../06-quality/01-audit-logging.md) | [PostgreSQL Implementation](../06-quality/01-audit-logging-postgresql.md)

---

## Tenant Isolation Security

**Critical for multi-tenant systems:**

```typescript
// Row-level security function
function scopeToTenant(query: any, tenantId: string) {
  return query.where('tenant_id', tenantId);
}

// Middleware to enforce tenant context
function enforceTenantContext(req, res, next) {
  const urlTenantId = req.params.org_id;
  const tokenTenantId = req.user.tenant_id;

  // Verify URL tenant matches token tenant
  if (urlTenantId !== tokenTenantId) {
    return res.status(403).json({
      error: {
        code: 'forbidden',
        message: 'Access denied to this organization',
        metadata: {
          url_tenant: urlTenantId,
          token_tenant: tokenTenantId
        }
      }
    });
  }

  next();
}

// Apply to all tenant-scoped routes
app.use('/v1/orgs/:org_id', authenticate, enforceTenantContext);

// Query helper
async function getTenantUsers(tenantId: string) {
  // ALWAYS scope queries by tenant
  return scopeToTenant(db('users'), tenantId).select('*');
}
```

---

## Security Checklist

Before deploying to production:

### Authentication & Authorization
- [ ] JWT signature validation enabled
- [ ] Token expiration enforced
- [ ] Revocation list implemented
- [ ] Permission checks on all endpoints
- [ ] Tenant isolation verified

### Input Validation
- [ ] All inputs validated with schemas
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (HTML sanitization)
- [ ] File upload restrictions
- [ ] Request size limits

### Data Protection
- [ ] PII encrypted at rest
- [ ] Sensitive data masked in logs
- [ ] GDPR rights endpoints implemented
- [ ] Secrets in vault/env vars
- [ ] Database backups encrypted

### Infrastructure
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Error messages don't leak info

### Monitoring
- [ ] Audit logging enabled
- [ ] Failed auth attempts logged
- [ ] Suspicious activity alerts
- [ ] Log retention policy
- [ ] Incident response plan

---

## See Also

- [Authentication](./01-authentication.md) - Token-based auth implementation
- [Authorization](./02-authorization.md) - Multi-tenant RBAC model
- [Rate Limiting](./03-rate-limiting.md) - Prevent resource exhaustion
- [CORS and Headers](./05-cors-and-headers.md) - Security headers configuration
- [Audit Logging](../06-quality/01-audit-logging.md) - Security event tracking
- [Multitenancy](../01-core-concepts/05-multitenancy.md) - Tenant isolation patterns

---

**External Resources:**
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [GDPR Compliance Guide](https://gdpr.eu/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
