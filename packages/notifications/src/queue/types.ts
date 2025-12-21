import type {
  NotificationCategory,
  NotificationChannel,
  NotificationPriority,
} from "@workspace/db/schema";
import type {
  EmailPayload,
  PushPayload,
  SmsPayload,
  TelegramPayload,
  WhatsAppPayload,
} from "../types";

export type { NotificationChannel } from "@workspace/db/schema";

export type NotificationJobData = {
  id: string;
  channel: NotificationChannel;
  userId?: string | null;
  templateId?: string;
  templateData?: Record<string, unknown>;
  payload:
    | EmailPayload
    | SmsPayload
    | WhatsAppPayload
    | TelegramPayload
    | PushPayload;
  priority: NotificationPriority;
  category: NotificationCategory;
  campaignId?: string;
  retryCount: number;
  maxRetries: number;
};

export type NotificationJobResult = {
  success: boolean;
  messageId?: string;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
};

export type QueueStats = {
  pending: number;
  active: number;
  completed: number;
  failed: number;
};

export type NotificationQueue = {
  start(): Promise<void>;
  stop(): Promise<void>;
  enqueue(job: NotificationJobData, options?: EnqueueOptions): Promise<string>;
  enqueueBatch(
    jobs: NotificationJobData[],
    options?: EnqueueOptions
  ): Promise<string[]>;
  getStats(): Promise<QueueStats>;
  retryFailed(jobId: string): Promise<void>;
};

export type EnqueueOptions = {
  startAfter?: Date;
  retryLimit?: number;
  retryDelay?: number;
  expireIn?: string;
};
