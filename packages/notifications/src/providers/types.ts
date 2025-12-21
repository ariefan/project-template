import type { NotificationChannel } from "@workspace/db/schema";
import type {
  EmailPayload,
  NotificationPayload,
  SendResult,
  SmsPayload,
  TelegramPayload,
  WhatsAppPayload,
} from "../types";

// Provider type - all providers must implement this
export type NotificationProvider<
  T extends NotificationPayload = NotificationPayload,
> = {
  readonly name: string;
  readonly channel: NotificationChannel;

  send(payload: T): Promise<SendResult>;
  validatePayload(payload: T): boolean;

  // Optional methods for advanced features
  checkDeliveryStatus?(messageId: string): Promise<{
    status: "pending" | "delivered" | "failed" | "unknown";
    updatedAt: Date;
  }>;
};

// Typed provider interfaces
export type EmailProvider = NotificationProvider<EmailPayload>;
export type SmsProvider = NotificationProvider<SmsPayload>;
export type WhatsAppProvider = NotificationProvider<WhatsAppPayload>;
export type TelegramProvider = NotificationProvider<TelegramPayload>;

// Provider registry
export type ProviderRegistry = {
  email: EmailProvider | null;
  sms: SmsProvider | null;
  whatsapp: WhatsAppProvider | null;
  telegram: TelegramProvider | null;
};
