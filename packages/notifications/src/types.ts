import type {
  NotificationCategory,
  NotificationChannel,
  NotificationPriority,
} from "@workspace/db/schema";

// ============ SEND RESULT ============

export interface SendResult {
  success: boolean;
  messageId?: string;
  provider: string;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

// ============ PAYLOAD TYPES ============

export interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  html?: string;
  from?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface SmsPayload {
  to: string;
  body: string;
  from?: string;
}

export interface WhatsAppPayload {
  to: string;
  body: string;
  templateName?: string;
  templateParams?: string[];
}

export interface TelegramPayload {
  chatId: string;
  text: string;
  parseMode?: "HTML" | "Markdown" | "MarkdownV2";
  disableNotification?: boolean;
}

export interface PushPayload {
  deviceToken: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export type NotificationPayload =
  | EmailPayload
  | SmsPayload
  | WhatsAppPayload
  | TelegramPayload
  | PushPayload;

// ============ SEND REQUEST ============

export interface Recipient {
  email?: string;
  phone?: string;
  telegramId?: string;
  deviceToken?: string;
}

export interface SendNotificationRequest {
  channel: NotificationChannel;
  category: NotificationCategory;
  priority?: NotificationPriority;
  userId?: string | null;
  recipient: Recipient;
  templateId?: string;
  templateData?: Record<string, unknown>;
  subject?: string;
  body?: string;
  bodyHtml?: string;
  campaignId?: string;
  metadata?: Record<string, unknown>;
  scheduledFor?: Date;
}

export interface SendBulkRequest {
  channel: NotificationChannel;
  category: NotificationCategory;
  priority?: NotificationPriority;
  userIds: string[];
  templateId: string;
  templateData?: Record<string, unknown>;
  campaignId?: string;
  scheduledFor?: Date;
}

// ============ NOTIFICATION SERVICE ============

export interface NotificationServiceConfig {
  email?: {
    provider: "resend" | "nodemailer";
    resend?: { apiKey: string };
    nodemailer?: {
      host: string;
      port: number;
      secure: boolean;
      auth?: { user: string; pass: string };
    };
    defaultFrom?: string;
  };
  sms?: {
    provider: "twilio";
    twilio: {
      accountSid: string;
      authToken: string;
      fromNumber: string;
    };
  };
  whatsapp?: {
    provider: "twilio";
    twilio: {
      accountSid: string;
      authToken: string;
      fromNumber: string;
    };
  };
  telegram?: {
    botToken: string;
  };
  queue?: {
    concurrency: number;
    maxRetries: number;
  };
}
