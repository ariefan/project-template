# @workspace/notifications

**Multi-channel notification system with templates, preferences, and queue support**

This package provides a complete notification infrastructure supporting email, SMS, WhatsApp, and Telegram with user preferences, template rendering, and background job processing.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     @workspace/notifications                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                  NotificationService                           │ │
│  │  send() | sendBulk() | schedule() | cancel()                  │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                       │
│              ┌───────────────┼───────────────┐                      │
│              ▼               ▼               ▼                      │
│  ┌────────────────┐  ┌─────────────┐  ┌──────────────────┐        │
│  │ ProviderRegistry│  │ Templates   │  │ PreferenceService│        │
│  │ email/sms/etc  │  │ render()    │  │ check user prefs │        │
│  └────────────────┘  └─────────────┘  └──────────────────┘        │
│           │                                                          │
│  ┌────────┴────────────────────────────────────────────────────┐   │
│  │                      Providers                               │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │   │
│  │  │ Resend   │ │ Twilio   │ │ Twilio   │ │ Telegram Bot │   │   │
│  │  │ Nodemailer│ │ SMS      │ │ WhatsApp │ │              │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                   PgBoss Queue (Optional)                      │ │
│  │  Background processing with retries and scheduling            │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Exports

```typescript
// Main factory (recommended)
export { createNotificationSystem } from "@workspace/notifications";
export type { NotificationSystem, NotificationSystemConfig } from "@workspace/notifications";

// Individual services
export { createNotificationService } from "@workspace/notifications";
export { createPreferenceService } from "@workspace/notifications";
export { createProviderRegistry } from "@workspace/notifications";
export { createPgBossQueue } from "@workspace/notifications";

// Configuration helpers
export { loadEnvConfig, buildServiceConfig } from "@workspace/notifications";

// Templates
export { renderTemplate, getTemplateSubject, isValidTemplateId } from "@workspace/notifications";

// Types
export type * from "@workspace/notifications";
```

## Usage

### Quick Start

```typescript
import { createNotificationSystem } from "@workspace/notifications";

const notifications = createNotificationSystem({
  // Email provider
  email: {
    provider: "resend",
    apiKey: process.env.RESEND_API_KEY,
    fromAddress: "hello@example.com",
    fromName: "My App",
  },

  // SMS provider (optional)
  sms: {
    provider: "twilio",
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    fromNumber: "+1234567890",
  },

  // Background queue (optional)
  queue: {
    connectionString: process.env.DATABASE_URL,
    concurrency: 5,
    maxRetries: 3,
  },
});

// Start queue workers
await notifications.start();

// Send notification
await notifications.notification.send({
  userId: "user_123",
  channel: "email",
  templateId: "welcome",
  data: { name: "John" },
});

// Shutdown
await notifications.stop();
```

### Send Email

```typescript
await notifications.notification.send({
  userId: "user_123",
  channel: "email",
  templateId: "password-reset",
  data: {
    resetUrl: "https://app.example.com/reset?token=abc",
  },
});
```

### Send SMS

```typescript
await notifications.notification.send({
  userId: "user_123",
  channel: "sms",
  templateId: "verification-code",
  data: {
    code: "123456",
  },
});
```

### Send to Multiple Channels

```typescript
await notifications.notification.sendBulk([
  {
    userId: "user_123",
    channel: "email",
    templateId: "order-confirmation",
    data: { orderId: "ORD-001" },
  },
  {
    userId: "user_123",
    channel: "sms",
    templateId: "order-confirmation-sms",
    data: { orderId: "ORD-001" },
  },
]);
```

### User Preferences

```typescript
// Check if user wants email notifications
const prefs = await notifications.preferences.get("user_123");
if (prefs.email.marketing === false) {
  // Skip marketing emails
}

// Update preferences
await notifications.preferences.update("user_123", {
  email: { marketing: false, transactional: true },
  sms: { marketing: false, transactional: true },
});
```

## Providers

### Email

| Provider | Config Key | Features |
|----------|------------|----------|
| Resend | `resend` | Modern API, good DX |
| Nodemailer | `nodemailer` | SMTP, self-hosted |

### SMS

| Provider | Config Key | Features |
|----------|------------|----------|
| Twilio | `twilio` | Global reach |

### WhatsApp

| Provider | Config Key | Features |
|----------|------------|----------|
| Twilio | `twilio` | WhatsApp Business API |

### Telegram

| Provider | Config Key | Features |
|----------|------------|----------|
| Telegram Bot | `telegram` | Bot API |

## Templates

Templates are defined in `src/templates/` and use simple variable substitution:

```typescript
// Define template
const templates = {
  "welcome": {
    subject: "Welcome to {{appName}}!",
    body: "Hi {{name}}, welcome to {{appName}}. Get started at {{loginUrl}}.",
  },
  "password-reset": {
    subject: "Reset your password",
    body: "Click here to reset: {{resetUrl}}",
  },
};

// Render template
import { renderTemplate, getTemplateSubject } from "@workspace/notifications";

const subject = getTemplateSubject("welcome", { appName: "My App" });
const body = renderTemplate("welcome", {
  appName: "My App",
  name: "John",
  loginUrl: "https://app.example.com/login",
});
```

## Background Queue (PgBoss)

For production, use the queue for reliable delivery with retries:

```typescript
const notifications = createNotificationSystem({
  // ... providers

  queue: {
    connectionString: process.env.DATABASE_URL,
    concurrency: 10,     // Workers per channel
    maxRetries: 5,       // Retry failed sends
  },
});

// Queue processes notifications in background
await notifications.notification.send({
  userId: "user_123",
  channel: "email",
  templateId: "welcome",
  data: { name: "John" },
  // Options
  priority: 1,           // Higher = sooner
  retryDelay: 60,        // Seconds between retries
  scheduledFor: new Date("2024-12-25"), // Delayed send
});
```

## Environment Variables

```bash
# Email (Resend)
RESEND_API_KEY=re_xxxxx
EMAIL_FROM_ADDRESS=hello@example.com
EMAIL_FROM_NAME="My App"

# Email (SMTP/Nodemailer)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user
SMTP_PASS=pass

# SMS (Twilio)
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_FROM_NUMBER=+1234567890

# WhatsApp (Twilio)
TWILIO_WHATSAPP_FROM=+1234567890

# Telegram
TELEGRAM_BOT_TOKEN=xxxxx

# Queue
DATABASE_URL=postgres://...
```

## Dependencies

- `pg-boss` - Background job queue
- `resend` - Email provider
- `nodemailer` - SMTP email
- `twilio` - SMS/WhatsApp
- `@workspace/db` - Database (preferences, logs)

## Related Packages

- `@workspace/db` - Notification preferences table
