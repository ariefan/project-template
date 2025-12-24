# @workspace/auth

**Better Auth integration for authentication and authorization**

This package provides a fully configured [Better Auth](https://better-auth.com) instance with support for multiple authentication methods, multi-tenancy, SSO, and API key management.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         @workspace/auth                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Authentication Methods:                                             │
│  ├── Email/Password (with verification)                             │
│  ├── Magic Link                                                      │
│  ├── Phone Number (OTP)                                             │
│  ├── OAuth (Google, GitHub)                                         │
│  ├── Passkey (WebAuthn)                                             │
│  └── Anonymous (guest users)                                        │
│                                                                      │
│  Enterprise Features:                                                │
│  ├── Organizations (multi-tenancy)                                  │
│  ├── SSO (SAML, OIDC)                                               │
│  ├── OIDC Provider (act as IdP)                                     │
│  ├── API Keys                                                        │
│  ├── Two-Factor Authentication                                      │
│  └── Admin/Impersonation                                            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  @workspace/db  │
                    │  (users, etc.)  │
                    └─────────────────┘
```

## Exports

```typescript
// Main factory function
export { createAuth } from "@workspace/auth";

// Default instance (for simple setups)
export { auth } from "@workspace/auth";

// Types
export type { Auth, Session, User, AuthConfig } from "@workspace/auth";

// Services (for custom email/SMS providers)
export {
  createConsoleEmailService,
  createConsoleSmsService,
  type EmailService,
  type SmsService,
} from "@workspace/auth";
```

## Usage

### Basic Setup (Development)

```typescript
import { auth } from "@workspace/auth";

// Use in Fastify
app.register(auth.handler);

// Get session
const session = await auth.api.getSession({
  headers: request.headers,
});
```

### Custom Configuration (Production)

```typescript
import { createAuth } from "@workspace/auth";
import { resendEmailService } from "./services/email";
import { twilioSmsService } from "./services/sms";

export const auth = createAuth({
  baseUrl: process.env.BETTER_AUTH_URL,
  environment: "production",

  // Email service (Resend, SendGrid, etc.)
  emailService: resendEmailService,

  // SMS service (Twilio, etc.)
  smsService: twilioSmsService,

  // OAuth providers
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    },
  },

  // Cross-app SSO (act as OIDC provider)
  trustedClients: [
    {
      clientId: "admin-app",
      clientSecret: process.env.ADMIN_CLIENT_SECRET,
      redirectUris: ["https://admin.example.com/callback"],
    },
  ],

  // CORS origins
  trustedOrigins: [
    "https://app.example.com",
    "https://admin.example.com",
  ],

  // Passkey support
  passkey: {
    rpID: "example.com",
    rpName: "My App",
  },
});
```

## Authentication Methods

| Method | Plugin | Use Case |
|--------|--------|----------|
| Email/Password | Built-in | Standard auth |
| Magic Link | `magicLink` | Passwordless |
| Phone OTP | `phoneNumber` | Mobile-first |
| OAuth | Built-in | Social login |
| Passkey | `passkey` | Phishing-resistant |
| Anonymous | `anonymous` | Guest checkout |
| API Key | `apiKey` | Machine-to-machine |
| Bearer Token | `bearer` | Mobile apps |

## Enterprise Features

### Organizations (Multi-Tenancy)

```typescript
// Create organization
await auth.api.createOrganization({
  body: { name: "Acme Corp" },
  headers,
});

// Invite member
await auth.api.inviteOrganizationMember({
  body: { email: "user@example.com", role: "member" },
  headers,
});
```

### SSO (Enterprise Identity Providers)

```typescript
// Organizations can connect their own IdP
await auth.api.createSSOConnection({
  body: {
    providerId: "okta",
    domain: "acme.com",
    // SAML or OIDC config
  },
  headers,
});
```

### OIDC Provider (Cross-App SSO)

Configure `trustedClients` to allow other apps to authenticate via this auth server. Users sign in once and get access to all connected apps.

## Client-Side Integration

```typescript
// packages/auth/src/client.ts
import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

// Usage in React
const { data: session } = await authClient.getSession();
await authClient.signIn.email({ email, password });
await authClient.signOut();
```

## Environment Variables

```bash
# Required
BETTER_AUTH_URL=http://localhost:3001
BETTER_AUTH_SECRET=your-secret-key

# OAuth (optional)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Passkey (optional)
PASSKEY_RP_ID=localhost
PASSKEY_RP_NAME="My App"
```

## Dependencies

- `better-auth` - Core authentication library
- `@better-auth/passkey` - WebAuthn support
- `@better-auth/sso` - Enterprise SSO
- `@workspace/db` - Database adapter
- `bcrypt` - Password hashing

## Related Documentation

- [Better Auth Docs](https://better-auth.com/docs)
- [SSO Architecture](../../docs/sso-architecture.md)
- [Shared Auth UI](../../docs/shared-auth-ui.md)
