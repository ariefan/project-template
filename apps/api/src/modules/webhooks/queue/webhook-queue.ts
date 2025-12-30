/**
 * Webhook Delivery Queue using pg-boss
 *
 * Provides async processing of webhook deliveries with:
 * - Retry with exponential backoff per API Guide
 * - Concurrent delivery processing
 * - Delivery status tracking
 */

import PgBoss, { type Job } from "pg-boss";
import * as webhookDeliveryRepository from "../repositories/webhook-delivery.repository";
import { executeDelivery } from "../services/webhook-delivery.service";

const QUEUE_NAME = "webhook-delivery";

export interface WebhookQueueConfig {
  connectionString: string;
  concurrency?: number;
}

export interface WebhookJobData {
  deliveryId: string;
}

export interface WebhookQueue {
  start(): Promise<void>;
  stop(): Promise<void>;
  enqueue(deliveryId: string): Promise<string>;
  getStats(): Promise<{
    pending: number;
    active: number;
    completed: number;
    failed: number;
  }>;
}

async function scheduleRetryIfNeeded(
  boss: PgBoss,
  deliveryId: string
): Promise<void> {
  const delivery = await webhookDeliveryRepository.findByIdOnly(deliveryId);
  const shouldRetry =
    delivery &&
    delivery.attempts < delivery.maxAttempts &&
    delivery.nextRetryAt;

  if (shouldRetry && delivery.nextRetryAt) {
    await boss.send(
      QUEUE_NAME,
      { deliveryId },
      { startAfter: delivery.nextRetryAt }
    );
  }
}

async function processJob(boss: PgBoss, deliveryId: string): Promise<void> {
  try {
    const result = await executeDelivery(deliveryId);
    if (!result.success) {
      await scheduleRetryIfNeeded(boss, deliveryId);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Webhook delivery ${deliveryId} failed:`, message);
  }
}

export function createWebhookQueue(config: WebhookQueueConfig): WebhookQueue {
  const boss = new PgBoss(config.connectionString);
  const concurrency = config.concurrency ?? 5;
  let retryInterval: ReturnType<typeof setInterval> | null = null;

  async function startRetryProcessor(): Promise<void> {
    const checkInterval = 30_000;

    const processRetries = async () => {
      try {
        const pendingRetries =
          await webhookDeliveryRepository.findPendingRetries();
        for (const delivery of pendingRetries) {
          await boss.send(QUEUE_NAME, { deliveryId: delivery.id });
        }
      } catch (error) {
        console.error("Error processing webhook retries:", error);
      }
    };

    await processRetries();
    retryInterval = setInterval(processRetries, checkInterval);
  }

  return {
    async start(): Promise<void> {
      await boss.start();

      await boss.work<WebhookJobData>(
        QUEUE_NAME,
        { batchSize: concurrency },
        async (jobs: Job<WebhookJobData>[]) => {
          for (const job of jobs) {
            await processJob(boss, job.data.deliveryId);
          }
        }
      );

      await startRetryProcessor();
    },

    async stop(): Promise<void> {
      if (retryInterval) {
        clearInterval(retryInterval);
        retryInterval = null;
      }
      await boss.stop();
    },

    async enqueue(deliveryId: string): Promise<string> {
      const jobId = await boss.send(QUEUE_NAME, { deliveryId });

      if (!jobId) {
        throw new Error("Failed to enqueue webhook delivery job");
      }

      return jobId;
    },

    async getStats() {
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
  };
}
