/**
 * Generic Job Queue using pg-boss
 *
 * Provides async job processing with:
 * - Handler registry for different job types
 * - Progress tracking
 * - Concurrent processing per job type
 * - Automatic retry on failure
 */

import PgBoss, { type Job } from "pg-boss";
import { jobHandlerRegistry } from "../handlers/registry";
import type { JobContext, JobHelpers } from "../handlers/types";
import * as jobsService from "../services/jobs.service";

const QUEUE_PREFIX = "jobs";

export interface JobQueueConfig {
  /** PostgreSQL connection string */
  connectionString: string;
  /** Default concurrency for job types without specific config */
  defaultConcurrency?: number;
}

export interface JobQueue {
  /** Start the queue and register workers */
  start(): Promise<void>;
  /** Stop the queue gracefully */
  stop(): Promise<void>;
  /** Enqueue a job for processing */
  enqueue(jobId: string, type: string, delay?: number): Promise<string>;
  /** Schedule a recurring job using cron expression */
  schedule(
    type: string,
    cron: string,
    data?: Record<string, unknown>
  ): Promise<void>;
  /** Get queue statistics by job type */
  getStats(): Promise<Record<string, QueueStats>>;
}

export interface QueueStats {
  pending: number;
  active: number;
  completed: number;
  failed: number;
}

/**
 * Create job helpers for a specific job
 */
function createJobHelpers(jobId: string): JobHelpers {
  return {
    async updateProgress(progress: number, message?: string): Promise<void> {
      await jobsService.updateProgress(jobId, progress, message);
    },
    async updateProcessedItems(
      processed: number,
      total?: number
    ): Promise<void> {
      await jobsService.updateProcessedItems(jobId, processed, total);
    },
    async log(message: string): Promise<void> {
      await jobsService.updateProgress(jobId, -1, message);
    },
  };
}

/**
 * Process a single job using its registered handler
 */
async function processJob(jobId: string): Promise<void> {
  const job = await jobsService.getJobInternal(jobId);
  if (!job) {
    console.error(`Job not found: ${jobId}`);
    return;
  }

  const handler = jobHandlerRegistry.get(job.type);
  if (!handler) {
    console.error(`No handler registered for job type: ${job.type}`);
    await jobsService.failJob(jobId, {
      code: "NO_HANDLER",
      message: `No handler registered for job type: ${job.type}`,
      retryable: false,
    });
    return;
  }

  // Mark job as processing
  await jobsService.startJob(jobId);

  const helpers = createJobHelpers(jobId);

  const context: JobContext = {
    jobId: job.id,
    orgId: job.orgId,
    type: job.type,
    input: (job.input as Record<string, unknown>) ?? {},
    metadata: job.metadata ?? {},
    helpers,
  };

  try {
    const result = await handler.handler(context);

    if (result.error) {
      await jobsService.failJob(jobId, result.error);
    } else {
      await jobsService.completeJob(jobId, result.output ?? {});
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Job ${jobId} threw error:`, message);

    await jobsService.failJob(jobId, {
      code: "HANDLER_ERROR",
      message,
      retryable: true,
    });
  }
}

/**
 * Create a job queue instance
 */
export function createJobQueue(config: JobQueueConfig): JobQueue {
  const boss = new PgBoss(config.connectionString);
  const defaultConcurrency = config.defaultConcurrency ?? 3;
  let isStarted = false;

  return {
    async start(): Promise<void> {
      await boss.start();

      // Register workers for each handler type
      const types = jobHandlerRegistry.getTypes();

      for (const type of types) {
        const handlerConfig = jobHandlerRegistry.get(type);
        if (!handlerConfig) {
          continue;
        }

        const queueName = `${QUEUE_PREFIX}:${type}`;
        const concurrency = handlerConfig.concurrency ?? defaultConcurrency;

        // Create the queue
        await boss.createQueue(queueName);

        // Register worker
        await boss.work<{ jobId: string }>(
          queueName,
          { batchSize: concurrency },
          async (jobs: Job<{ jobId: string }>[]) => {
            for (const job of jobs) {
              await processJob(job.data.jobId);
            }
          }
        );

        console.log(
          `Job queue worker registered: ${queueName} (concurrency: ${concurrency})`
        );
      }

      isStarted = true;
      console.log(`Job queue started with ${types.length} handler(s)`);
    },

    async stop(): Promise<void> {
      await boss.stop();
      isStarted = false;
      console.log("Job queue stopped");
    },

    async enqueue(
      jobId: string,
      type: string,
      delay?: number
    ): Promise<string> {
      if (!isStarted) {
        throw new Error("Job queue not started");
      }

      const handlerConfig = jobHandlerRegistry.get(type);
      if (!handlerConfig) {
        throw new Error(`No handler registered for job type: ${type}`);
      }

      const queueName = `${QUEUE_PREFIX}:${type}`;

      const queueJobId = await boss.send(
        queueName,
        { jobId },
        {
          startAfter: delay ? new Date(Date.now() + delay) : undefined,
          expireInSeconds: handlerConfig.expireInSeconds ?? 3600,
          retryLimit: handlerConfig.retryLimit ?? 3,
        }
      );

      if (!queueJobId) {
        throw new Error("Failed to enqueue job - pg-boss returned null");
      }

      // Update job with queue reference
      await jobsService.updateQueueJobId(jobId, queueJobId);

      console.log(`Job ${jobId} enqueued as ${queueJobId} on ${queueName}`);
      return queueJobId;
    },

    async schedule(
      type: string,
      cron: string,
      data: Record<string, unknown> = {}
    ): Promise<void> {
      const queueName = `${QUEUE_PREFIX}:${type}`;
      await boss.schedule(queueName, cron, data);
      console.log(`Job type ${type} scheduled with cron: ${cron}`);
    },

    async getStats(): Promise<Record<string, QueueStats>> {
      const stats: Record<string, QueueStats> = {};

      for (const type of jobHandlerRegistry.getTypes()) {
        const queueName = `${QUEUE_PREFIX}:${type}`;

        const [pending, active, completed, failed] = await Promise.all([
          boss.getQueueSize(queueName, { before: "active" }),
          boss.getQueueSize(queueName, { before: "completed" }),
          boss.getQueueSize(queueName, { before: "failed" }),
          boss.getQueueSize(queueName, { before: "cancelled" }),
        ]);

        stats[type] = {
          pending,
          active: active - pending,
          completed: completed - active,
          failed,
        };
      }

      return stats;
    },
  };
}
