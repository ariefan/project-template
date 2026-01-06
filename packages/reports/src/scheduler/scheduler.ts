/**
 * Report Scheduler
 *
 * pg-boss integration for scheduled report generation
 */

import PgBoss from "pg-boss";
import { CronParser } from "./cron";
import type { ScheduleJobData, SchedulerConfig } from "./types";

const QUEUE_NAME = "reports";

export interface ReportSchedulerOptions {
  config: SchedulerConfig;
  onProcess: (data: ScheduleJobData) => Promise<void>;
  onError?: (error: Error, data: ScheduleJobData) => void;
  onComplete?: (data: ScheduleJobData) => void;
}

export class ReportScheduler {
  private readonly boss: PgBoss;
  private readonly options: ReportSchedulerOptions;
  private isRunning = false;

  constructor(options: ReportSchedulerOptions) {
    this.options = options;
    this.boss = new PgBoss({
      connectionString: options.config.connectionString,
      retryLimit: options.config.maxRetries ?? 3,
      retryDelay: 60, // 1 minute between retries
      expireInSeconds: 3600, // 1 hour job expiry
      archiveCompletedAfterSeconds:
        86_400 * (options.config.retentionDays ?? 7),
    });
  }

  /**
   * Start the scheduler
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    await this.boss.start();

    // Register job handler
    await this.boss.work<ScheduleJobData>(QUEUE_NAME, async (jobs) => {
      // pg-boss passes an array of jobs
      const jobArray = Array.isArray(jobs) ? jobs : [jobs];

      for (const job of jobArray) {
        const data = job.data;

        try {
          await this.options.onProcess(data);
          this.options.onComplete?.(data);
        } catch (error) {
          this.options.onError?.(error as Error, data);
          throw error; // Re-throw for pg-boss retry handling
        }
      }
    });

    this.isRunning = true;
  }

  /**
   * Stop the scheduler
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    await this.boss.stop();
    this.isRunning = false;
  }

  /**
   * Schedule a one-time report job
   */
  async scheduleOnce(
    data: ScheduleJobData,
    options?: { startAfter?: Date; singletonKey?: string }
  ): Promise<string> {
    const jobId = await this.boss.send(QUEUE_NAME, data, {
      startAfter: options?.startAfter,
      singletonKey: options?.singletonKey,
    });

    if (!jobId) {
      throw new Error("Failed to schedule job");
    }

    return jobId;
  }

  /**
   * Schedule a recurring report using cron expression
   */
  async scheduleRecurring(
    scheduleId: string,
    data: ScheduleJobData,
    cronExpression: string
  ): Promise<void> {
    // Validate cron expression
    const validation = CronParser.validate(cronExpression);
    if (!validation.valid) {
      throw new Error(`Invalid cron expression: ${validation.error}`);
    }

    // Create pg-boss schedule
    await this.boss.schedule(QUEUE_NAME, cronExpression, data, {
      singletonKey: scheduleId,
    });
  }

  /**
   * Cancel a recurring schedule
   */
  async cancelRecurring(scheduleId: string): Promise<void> {
    // pg-boss schedule name format: queueName__scheduleId
    await this.boss.unschedule(`${QUEUE_NAME}__${scheduleId}`);
  }

  /**
   * Cancel a pending job
   */
  async cancelJob(jobId: string): Promise<void> {
    await this.boss.cancel(QUEUE_NAME, jobId);
  }

  /**
   * Get job status
   */
  async getJobStatus(
    jobId: string
  ): Promise<{ state: string; data?: ScheduleJobData } | null> {
    const job = await this.boss.getJobById(QUEUE_NAME, jobId);

    if (!job) {
      return null;
    }

    return {
      state: job.state,
      data: job.data as ScheduleJobData,
    };
  }

  /**
   * Trigger a scheduled report immediately
   */
  async triggerNow(data: ScheduleJobData): Promise<string> {
    return await this.scheduleOnce(data);
  }

  /**
   * Get next run time for a cron expression
   */
  getNextRunTime(cronExpression: string): Date {
    return CronParser.getNextRun(cronExpression);
  }

  /**
   * Get next N run times for a cron expression
   */
  getNextRunTimes(cronExpression: string, count: number): Date[] {
    return CronParser.getNextRuns(cronExpression, count);
  }

  /**
   * Check if the scheduler is running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}

/**
 * Create a new report scheduler
 */
export function createReportScheduler(
  options: ReportSchedulerOptions
): ReportScheduler {
  return new ReportScheduler(options);
}
