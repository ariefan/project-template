import { z } from "zod";
import type { NotificationServiceConfig } from "./types";

const envSchema = z.object({
  // Email Configuration
  EMAIL_PROVIDER: z.enum(["resend", "nodemailer"]).default("resend"),

  // Resend
  RESEND_API_KEY: z.string().optional(),

  // Nodemailer (SMTP fallback)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_SECURE: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  // Common email settings
  EMAIL_FROM: z.string().default("noreply@example.com"),

  // SMS/WhatsApp (Twilio)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_SMS_FROM: z.string().optional(),
  TWILIO_WHATSAPP_FROM: z.string().optional(),

  // Telegram
  TELEGRAM_BOT_TOKEN: z.string().optional(),

  // Queue Configuration
  DATABASE_URL: z.string(),
  QUEUE_CONCURRENCY: z.coerce.number().default(10),
  QUEUE_MAX_RETRIES: z.coerce.number().default(3),
});

export type NotificationEnvConfig = z.infer<typeof envSchema>;

export function loadEnvConfig(): NotificationEnvConfig {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("Invalid notification configuration:");
    for (const error of parsed.error.errors) {
      console.error(`  ${error.path.join(".")}: ${error.message}`);
    }
    throw new Error("Invalid notification configuration");
  }

  return parsed.data;
}

export function buildServiceConfig(
  env: NotificationEnvConfig
): NotificationServiceConfig {
  const config: NotificationServiceConfig = {
    queue: {
      concurrency: env.QUEUE_CONCURRENCY,
      maxRetries: env.QUEUE_MAX_RETRIES,
    },
  };

  // Email configuration
  if (env.EMAIL_PROVIDER === "resend" && env.RESEND_API_KEY) {
    config.email = {
      provider: "resend",
      resend: { apiKey: env.RESEND_API_KEY },
      defaultFrom: env.EMAIL_FROM,
    };
  } else if (
    env.EMAIL_PROVIDER === "nodemailer" &&
    env.SMTP_HOST &&
    env.SMTP_PORT
  ) {
    config.email = {
      provider: "nodemailer",
      nodemailer: {
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE ?? false,
        auth: {
          user: env.SMTP_USER ?? "",
          pass: env.SMTP_PASS ?? "",
        },
      },
      defaultFrom: env.EMAIL_FROM,
    };
  }

  // SMS configuration (Twilio)
  if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_SMS_FROM) {
    config.sms = {
      provider: "twilio",
      twilio: {
        accountSid: env.TWILIO_ACCOUNT_SID,
        authToken: env.TWILIO_AUTH_TOKEN,
        fromNumber: env.TWILIO_SMS_FROM,
      },
    };
  }

  // WhatsApp configuration (Twilio)
  if (
    env.TWILIO_ACCOUNT_SID &&
    env.TWILIO_AUTH_TOKEN &&
    env.TWILIO_WHATSAPP_FROM
  ) {
    config.whatsapp = {
      provider: "twilio",
      twilio: {
        accountSid: env.TWILIO_ACCOUNT_SID,
        authToken: env.TWILIO_AUTH_TOKEN,
        fromNumber: env.TWILIO_WHATSAPP_FROM,
      },
    };
  }

  // Telegram configuration
  if (env.TELEGRAM_BOT_TOKEN) {
    config.telegram = {
      botToken: env.TELEGRAM_BOT_TOKEN,
    };
  }

  return config;
}
