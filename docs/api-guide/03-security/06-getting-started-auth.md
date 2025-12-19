# Getting Started with Authentication

**Related**: [Authentication](./01-authentication.md) · [Authorization](./02-authorization.md) · [Security Best Practices](./04-security-best-practices.md)

## Overview

This guide shows you how to implement authentication from scratch in **under 30 minutes**. We'll start with the absolute minimum and progressively add features.

**What you'll build:**
1. JWT-based authentication
2. Login endpoint
3. Protected route middleware
4. Token refresh flow

---

## Quick Start (5 minutes)

**The fastest way to add auth to your API:**

### Step 1: Install Dependencies

```bash
npm install jsonwebtoken bcryptjs
npm install -D @types/jsonwebtoken @types/bcryptjs
```

### Step 2: Create Auth Middleware

Create `src/middleware/auth.ts`:

```typescript
import { verify } from 'jsonwebtoken';

export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      error: { code: 'unauthorized', message: 'Authentication required' }
    });
  }

  const token = authHeader.substring(7);

  try {
    const payload = verify(token, process.env.JWT_SECRET);
    req.user = payload;  // Attach user to request
    next();
  } catch (error) {
    return res.status(401).json({
      error: { code: 'unauthorized', message: 'Invalid token' }
    });
  }
}
```

### Step 3: Protect Your Routes

```typescript
import { authenticate } from './middleware/auth';

// Public route (no auth)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Protected route (requires auth)
app.get('/users', authenticate, async (req, res) => {
  const users = await db('users')
    .where('tenant_id', req.user.tenant_id)
    .select('*');

  res.json({ data: users });
});
```

**That's it!** You now have basic JWT authentication. Continue reading to add login, registration, and token refresh.

---

## Complete Setup (30 minutes)

### Phase 1: Environment Setup

**1. Add environment variables to `.env`:**

```bash
# JWT Configuration
JWT_SECRET=your-super-secret-key-min-32-characters-long
JWT_EXPIRES_IN=15m

# Optional: Use RS256 for production (more secure)
# JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----...
# JWT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...
```

**2. Validate environment on startup:**

Create `src/config/env.ts`:

```typescript
import { z } from 'zod';

const EnvSchema = z.object({
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  DATABASE_URL: z.string().url()
});

export const env = EnvSchema.parse(process.env);
```

---

### Phase 2: User Model & Database

**1. Create users table:**

```sql
CREATE TABLE users (
  id VARCHAR(50) PRIMARY KEY,           -- usr_abc123
  tenant_id VARCHAR(50) NOT NULL,       -- org_xyz789
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
```

**2. Create user service:**

Create `src/services/user.service.ts`:

```typescript
import { compare, hash } from 'bcryptjs';
import { db } from '../config/database';

export async function createUser(data: {
  email: string;
  password: string;
  name: string;
  tenant_id: string;
}) {
  // Hash password
  const password_hash = await hash(data.password, 10);

  // Generate user ID
  const id = `usr_${randomId()}`;

  // Insert user
  const [user] = await db('users').insert({
    id,
    tenant_id: data.tenant_id,
    email: data.email,
    password_hash,
    name: data.name
  }).returning(['id', 'email', 'name', 'created_at']);

  return user;
}

export async function verifyPassword(email: string, password: string) {
  const user = await db('users')
    .where('email', email)
    .first();

  if (!user) {
    return null;
  }

  const isValid = await compare(password, user.password_hash);

  if (!isValid) {
    return null;
  }

  // Don't return password hash
  const { password_hash, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

function randomId(): string {
  return Math.random().toString(36).substring(2, 15);
}
```

---

### Phase 3: JWT Token Generation

Create `src/services/jwt.service.ts`:

```typescript
import { sign, verify } from 'jsonwebtoken';
import { env } from '../config/env';

interface TokenPayload {
  sub: string;         // User ID
  email: string;
  tenant_id: string;
  roles?: string[];
  permissions?: string[];
}

export function generateAccessToken(payload: TokenPayload): string {
  return sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,  // 15 minutes
    issuer: 'api.example.com',
    audience: 'api.example.com'
  });
}

export function generateRefreshToken(userId: string): string {
  return sign({ sub: userId }, env.JWT_SECRET, {
    expiresIn: '7d',  // 7 days
    issuer: 'api.example.com'
  });
}

export function verifyAccessToken(token: string): TokenPayload {
  return verify(token, env.JWT_SECRET, {
    issuer: 'api.example.com',
    audience: 'api.example.com'
  }) as TokenPayload;
}
```

---

### Phase 4: Authentication Endpoints

Create `src/routes/auth.routes.ts`:

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { createUser, verifyPassword } from '../services/user.service';
import { generateAccessToken, generateRefreshToken } from '../services/jwt.service';

const router = Router();

// Validation schemas
const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
  tenant_id: z.string().startsWith('org_')
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

// Register endpoint
router.post('/auth/register', async (req, res) => {
  try {
    const data = RegisterSchema.parse(req.body);

    // Create user
    const user = await createUser(data);

    // Generate tokens
    const accessToken = generateAccessToken({
      sub: user.id,
      email: user.email,
      tenant_id: data.tenant_id
    });

    const refreshToken = generateRefreshToken(user.id);

    res.status(201).json({
      data: {
        user,
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 900  // 15 minutes in seconds
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(422).json({
        error: {
          code: 'validation_error',
          message: 'Invalid input',
          details: error.errors
        }
      });
    }

    if (error.code === '23505') {  // PostgreSQL unique violation
      return res.status(409).json({
        error: {
          code: 'conflict',
          message: 'Email already exists'
        }
      });
    }

    throw error;
  }
});

// Login endpoint
router.post('/auth/login', async (req, res) => {
  try {
    const data = LoginSchema.parse(req.body);

    // Verify credentials
    const user = await verifyPassword(data.email, data.password);

    if (!user) {
      return res.status(401).json({
        error: {
          code: 'unauthorized',
          message: 'Invalid email or password'
        }
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      sub: user.id,
      email: user.email,
      tenant_id: user.tenant_id
    });

    const refreshToken = generateRefreshToken(user.id);

    res.json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 900
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(422).json({
        error: { code: 'validation_error', message: 'Invalid input' }
      });
    }

    throw error;
  }
});

// Refresh token endpoint
router.post('/auth/refresh', async (req, res) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res.status(400).json({
      error: { code: 'bad_request', message: 'Refresh token required' }
    });
  }

  try {
    const payload = verify(refresh_token, process.env.JWT_SECRET);
    const userId = payload.sub;

    // Get user from database
    const user = await db('users').where('id', userId).first();

    if (!user) {
      return res.status(401).json({
        error: { code: 'unauthorized', message: 'User not found' }
      });
    }

    // Generate new access token
    const accessToken = generateAccessToken({
      sub: user.id,
      email: user.email,
      tenant_id: user.tenant_id
    });

    res.json({
      data: {
        access_token: accessToken,
        expires_in: 900
      }
    });
  } catch (error) {
    return res.status(401).json({
      error: { code: 'unauthorized', message: 'Invalid refresh token' }
    });
  }
});

export default router;
```

---

### Phase 5: Mount Routes

Update `src/app.ts`:

```typescript
import express from 'express';
import authRoutes from './routes/auth.routes';
import { authenticate } from './middleware/auth';

const app = express();

app.use(express.json());

// Public routes
app.use(authRoutes);

// Protected routes
app.get('/v1/orgs/:org_id/users',
  authenticate,  // Require authentication
  async (req, res) => {
    const users = await db('users')
      .where('tenant_id', req.params.org_id)
      .select('*');

    res.json({ data: users });
  }
);

app.listen(3000);
```

---

## Testing Your Implementation

### 1. Register a User

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123",
    "name": "John Doe",
    "tenantId": "org_abc123"
  }'
```

**Response:**
```json
{
  "data": {
    "user": {
      "id": "usr_xyz789",
      "email": "user@example.com",
      "name": "John Doe",
      "createdAt": "2024-01-20T10:00:00Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}
```

### 2. Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }'
```

### 3. Access Protected Route

```bash
curl http://localhost:3000/v1/orgs/org_abc123/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 4. Refresh Token

```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

---

## Using Better Auth (Recommended)

If you're using [Better Auth](https://better-auth.com), the setup is even simpler:

### 1. Install Better Auth

```bash
npm install better-auth
```

### 2. Configure Better Auth

Create `src/lib/auth.ts`:

```typescript
import { betterAuth } from 'better-auth';
import { db } from './db';

export const auth = betterAuth({
  database: db,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false
  },
  jwt: {
    expiresIn: '15m',
    issuer: 'api.example.com'
  }
});
```

### 3. Use Better Auth Middleware

```typescript
import { auth } from './lib/auth';

// Better Auth handles everything
app.use('/auth/*', auth.handler);

// Protected routes
app.get('/users', auth.middleware, async (req, res) => {
  console.log(req.user);  // User from Better Auth
  // Your logic here
});
```

**That's it!** Better Auth handles:
- ✅ Registration
- ✅ Login
- ✅ Token generation
- ✅ Token refresh
- ✅ Password hashing
- ✅ Email verification (optional)
- ✅ OAuth providers (optional)

See [Better Auth docs](https://better-auth.com/docs) for full configuration.

---

## Next Steps

Now that you have authentication working:

1. **Add Authorization**: [Authorization Guide](./02-authorization.md)
   - Implement RBAC (roles and permissions)
   - Tenant-scoped roles
   - Permission middleware

2. **Add Rate Limiting**: [Rate Limiting](./03-rate-limiting.md)
   - Prevent brute force attacks
   - Limit login attempts

3. **Improve Security**: [Security Best Practices](./04-security-best-practices.md)
   - Token revocation
   - Password reset
   - Email verification
   - Two-factor authentication

4. **Add Audit Logging**: [Audit Logging](../06-quality/01-audit-logging.md)
   - Log authentication events
   - Track failed login attempts

---

## Common Issues

### Issue: "Invalid token" on every request

**Cause:** JWT secret mismatch or token expired

**Fix:**
```bash
# Check .env file has JWT_SECRET
echo $JWT_SECRET

# Token might be expired (15 minutes by default)
# Get a new token by logging in again
```

### Issue: "User not found" after registration

**Cause:** Database transaction not committed

**Fix:**
```typescript
// Make sure to use .returning() with insert
const [user] = await db('users').insert(data).returning('*');
```

### Issue: CORS errors from frontend

**Fix:**
```typescript
import cors from 'cors';

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
```

---

## Security Checklist

Before going to production:

- [ ] Use RS256 (not HS256) for JWT signing
- [ ] Store JWT secret in environment variable (never commit to git)
- [ ] Use HTTPS in production
- [ ] Set short access token expiration (15 minutes)
- [ ] Implement token revocation
- [ ] Hash passwords with bcrypt (cost factor ≥ 10)
- [ ] Rate limit login endpoint
- [ ] Add CORS configuration
- [ ] Validate all inputs with schemas
- [ ] Log authentication events

---

## See Also

- [Authentication](./01-authentication.md) - Complete auth documentation
- [Authorization](./02-authorization.md) - Add permissions and roles
- [Security Best Practices](./04-security-best-practices.md) - Production security
- [Rate Limiting](./03-rate-limiting.md) - Prevent abuse
- [Multitenancy](../01-core-concepts/05-multitenancy.md) - Tenant isolation

---

**Need help?** Check the [Better Auth documentation](https://better-auth.com) or [JWT.io](https://jwt.io) for debugging tokens.
