import type { NotificationServiceConfig } from "./types";

export type NotificationEnvConfig = {
  EMAIL_PROVIDER: "resend" | "nodemailer";
  RESEND_API_KEY?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_SECURE?: boolean;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  EMAIL_FROM: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_SMS_FROM?: string;
  TWILIO_WHATSAPP_FROM?: string;
  TELEGRAM_BOT_TOKEN?: string;
  QUEUE_CONCURRENCY: number;
  QUEUE_MAX_RETRIES: number;
};

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
