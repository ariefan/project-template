import PgBoss from "pg-boss";
import type { ProviderRegistry } from "../providers/types";
import type {
  EmailPayload,
  SmsPayload,
  TelegramPayload,
  WhatsAppPayload,
} from "../types";
import type {
  EnqueueOptions,
  NotificationJobData,
  NotificationJobResult,
  NotificationQueue,
  QueueStats,
} from "./types";

const QUEUE_NAME = "notifications";

const PRIORITY_MAP = {
  urgent: 1,
  high: 2,
  normal: 3,
  low: 4,
};

export type PgBossQueueConfig = {
  connectionString: string;
  concurrency?: number;
  maxRetries?: number;
  retryBackoff?: boolean;
};

function processJobData(
  data: NotificationJobData,
  providers: ProviderRegistry
): Promise<NotificationJobResult> {
  switch (data.channel) {
    case "email": {
      if (!providers.email) {
        return Promise.resolve({
          success: false,
          error: {
            code: "providerNotConfigured",
            message: "Email provider not configured",
            retryable: false,
          },
        });
      }
      return providers.email.send(data.payload as EmailPayload);
    }

    case "sms": {
      if (!providers.sms) {
        return Promise.resolve({
          success: false,
          error: {
            code: "providerNotConfigured",
            message: "SMS provider not configured",
            retryable: false,
          },
        });
      }
      return providers.sms.send(data.payload as SmsPayload);
    }

    case "whatsapp": {
      if (!providers.whatsapp) {
        return Promise.resolve({
          success: false,
          error: {
            code: "providerNotConfigured",
            message: "WhatsApp provider not configured",
            retryable: false,
          },
        });
      }
      return providers.whatsapp.send(data.payload as WhatsAppPayload);
    }

    case "telegram": {
      if (!providers.telegram) {
        return Promise.resolve({
          success: false,
          error: {
            code: "providerNotConfigured",
            message: "Telegram provider not configured",
            retryable: false,
          },
        });
      }
      return providers.telegram.send(data.payload as TelegramPayload);
    }

    case "push": {
      return Promise.resolve({
        success: false,
        error: {
          code: "providerNotConfigured",
          message: "Push provider not configured",
          retryable: false,
        },
      });
    }

    default: {
      return Promise.resolve({
        success: false,
        error: {
          code: "unknownChannel",
          message: `Unknown notification channel: ${data.channel}`,
          retryable: false,
        },
      });
    }
  }
}

export function createPgBossQueue(
  config: PgBossQueueConfig,
  providers: ProviderRegistry
): NotificationQueue {
  const boss = new PgBoss(config.connectionString);
  const concurrency = config.concurrency ?? 10;
  const maxRetries = config.maxRetries ?? 3;

  return {
    async start(): Promise<void> {
      await boss.start();

      await boss.work<NotificationJobData>(
        QUEUE_NAME,
        { batchSize: concurrency },
        async (jobs) => {
          for (const job of jobs) {
            const result = await processJobData(job.data, providers);

            if (
              !result.success &&
              result.error?.retryable &&
              job.data.retryCount < (job.data.maxRetries ?? maxRetries)
            ) {
              throw new Error(result.error.message);
            }
          }
        }
      );
    },

    async stop(): Promise<void> {
      await boss.stop();
    },

    async enqueue(
      job: NotificationJobData,
      options?: EnqueueOptions
    ): Promise<string> {
      const jobId = await boss.send(QUEUE_NAME, job, {
        priority: PRIORITY_MAP[job.priority],
        startAfter: options?.startAfter,
        retryLimit: options?.retryLimit ?? job.maxRetries,
        retryDelay: options?.retryDelay ?? 5,
        retryBackoff: config.retryBackoff ?? true,
        expireInMinutes: options?.expireIn ? undefined : 60,
      });

      if (!jobId) {
        throw new Error("Failed to enqueue notification job");
      }

      return jobId;
    },

    async enqueueBatch(
      jobs: NotificationJobData[],
      options?: EnqueueOptions
    ): Promise<string[]> {
      const jobIds: string[] = [];

      for (const job of jobs) {
        const id = await this.enqueue(job, options);
        jobIds.push(id);
      }

      return jobIds;
    },

    async getStats(): Promise<QueueStats> {
      const [pending, active, completed, failed] = await Promise.all([
        boss.getQueueSize(QUEUE_NAME, { before: "active" }),
        boss.getQueueSize(QUEUE_NAME, { before: "completed" }),
        boss.getQueueSize(QUEUE_NAME, { before: "failed" }),
        boss.getQueueSize(QUEUE_NAME, { before: "cancelled" }),
      ]);

      return {
        pending,
        active: active - pending,
        completed: completed - active,
        failed,
      };
    },

    async retryFailed(jobId: string): Promise<void> {
      await boss.resume(QUEUE_NAME, jobId);
    },
  };
}
