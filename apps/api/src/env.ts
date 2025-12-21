import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().url(),
  CORS_ORIGIN: z.string().url().default("http://localhost:3000"),

  // Auth (better-auth reads these automatically)
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3001"),

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
});

function validateEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("Invalid environment variables:");
    for (const error of parsed.error.errors) {
      console.error(`  ${error.path.join(".")}: ${error.message}`);
    }
    process.exit(1);
  }

  return parsed.data;
}

export const env = validateEnv();
