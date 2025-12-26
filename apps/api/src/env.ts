import { DEFAULT_URLS } from "@workspace/utils";
import { config } from "dotenv";
import { z } from "zod";

// Load .env from apps/api directory (runtime config lives here, not root)
config();

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: z.coerce.number().default(3001),
    DATABASE_URL: z.string().url(),
    // Default URLs are DEV-ONLY - production MUST provide explicit values
    CORS_ORIGIN: z
      .string()
      .url()
      .default(process.env.NODE_ENV === "production" ? "" : DEFAULT_URLS.WEB),

    // Auth (better-auth reads these automatically)
    BETTER_AUTH_SECRET: z.string().min(32),
    // Default URL is DEV-ONLY - production MUST provide explicit value
    BETTER_AUTH_URL: z
      .string()
      .url()
      .default(process.env.NODE_ENV === "production" ? "" : DEFAULT_URLS.API),

    // OAuth Providers
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),

    // Passkey (WebAuthn)
    PASSKEY_RP_ID: z.string().optional(),
    PASSKEY_RP_NAME: z.string().optional(),

    // Email
    EMAIL_PROVIDER: z.enum(["resend", "nodemailer"]).default("resend"),
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().email().optional(),

    // SMTP (for nodemailer)
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_SECURE: z.coerce.boolean().default(false),

    // Twilio (SMS + WhatsApp)
    TWILIO_ACCOUNT_SID: z.string().optional(),
    TWILIO_AUTH_TOKEN: z.string().optional(),
    TWILIO_SMS_FROM: z.string().optional(),
    TWILIO_WHATSAPP_FROM: z.string().optional(),

    // Telegram
    TELEGRAM_BOT_TOKEN: z.string().optional(),

    // Notification Queue
    QUEUE_ENABLED: z.coerce.boolean().default(false),
    QUEUE_CONCURRENCY: z.coerce.number().default(10),
    QUEUE_MAX_RETRIES: z.coerce.number().default(3),

    // Cache Configuration
    CACHE_PROVIDER: z.enum(["memory", "redis"]).default("memory"),
    CACHE_TTL: z.coerce.number().default(300), // 5 minutes in seconds
    CACHE_MAX_SIZE: z.coerce.number().default(1000), // For in-memory provider

    // Redis Configuration (only needed if CACHE_PROVIDER=redis)
    REDIS_URL: z.string().url().optional(),
    REDIS_KEY_PREFIX: z.string().default("authz:"),

    // Rate Limiting (Tier-Based)
    RATE_LIMIT_ENABLED: z.coerce.boolean().default(true),
    RATE_LIMIT_WINDOW: z.string().default("1 hour"), // Time window
    // Tier limits (requests per hour as documented)
    RATE_LIMIT_FREE: z.coerce.number().default(100),
    RATE_LIMIT_BASIC: z.coerce.number().default(1000),
    RATE_LIMIT_PRO: z.coerce.number().default(10_000),
    RATE_LIMIT_ENTERPRISE: z.coerce.number().default(100_000),

    // Idempotency
    IDEMPOTENCY_ENABLED: z.coerce.boolean().default(true),
    IDEMPOTENCY_TTL: z.coerce.number().default(86_400), // 24 hours in seconds

    // Storage Configuration
    STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
    STORAGE_LOCAL_PATH: z.string().default("./uploads"),

    // S3/R2 Configuration (only needed if STORAGE_PROVIDER=s3)
    S3_ENDPOINT: z.string().url().optional().or(z.literal("")),
    S3_REGION: z.string().optional(),
    S3_BUCKET: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),

    // File Upload Limits
    FILE_MAX_SIZE: z.coerce.number().default(52_428_800), // 50 MB default

    // Metrics
    METRICS_ENABLED: z.coerce.boolean().default(true),
    METRICS_PREFIX: z.string().default(""),

    // HTTP Caching
    CACHING_ENABLED: z.coerce.boolean().default(true),

    // Deprecation Headers
    DEPRECATION_ENABLED: z.coerce.boolean().default(true),
  })
  .refine(
    (data) => {
      if (data.CACHE_PROVIDER === "redis" && !data.REDIS_URL) {
        return false;
      }
      return true;
    },
    {
      message: "REDIS_URL is required when CACHE_PROVIDER=redis",
      path: ["REDIS_URL"],
    }
  )
  .refine(
    (data) => {
      if (
        data.STORAGE_PROVIDER === "s3" &&
        !(data.S3_BUCKET && data.S3_ACCESS_KEY_ID && data.S3_SECRET_ACCESS_KEY)
      ) {
        return false;
      }
      return true;
    },
    {
      message:
        "S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY are required when STORAGE_PROVIDER=s3",
      path: ["STORAGE_PROVIDER"],
    }
  );

function validateEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("Invalid environment variables:");
    for (const issue of parsed.error.issues) {
      console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  return parsed.data;
}

export const env = validateEnv();
