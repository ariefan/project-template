/**
 * Scheduled Job Worker
 *
 * Polls the database for scheduled jobs that are due to run
 * and automatically creates jobs for them.
 *
 * Runs every minute to check for due schedules.
 */

import { and, db, eq, lte, scheduledJobs } from "@workspace/db";
import { calculateNextRunAt } from "@workspace/utils";
import { lt } from "drizzle-orm";

export interface SchedulerConfig {
  /** Poll interval in milliseconds (default: 60 seconds) */
  intervalMs?: number;
  /** Maximum number of schedules to process per batch */
  batchSize?: number;
  /** Whether to start automatically */
  autoStart?: boolean;
}

export interface SchedulerDeps {
  /** Function to create and enqueue a job */
  createAndEnqueueJob: (opts: {
    orgId: string;
    type: string;
    createdBy: string;
    input?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }) => Promise<{ id: string }>;
}

const MAX_FAILURE_COUNT = 5;
const DEFAULT_INTERVAL_MS = 60_000; // 1 minute
const DEFAULT_BATCH_SIZE = 50;

/**
 * Process a single schedule that is due
 */
async function processSchedule(
  schedule: typeof scheduledJobs.$inferSelect,
  deps: SchedulerDeps
): Promise<{ success: boolean; error?: string; jobId?: string }> {
  try {
    // Create and enqueue the job
    const job = await deps.createAndEnqueueJob({
      orgId: schedule.organizationId,
      type: schedule.jobType,
      createdBy: schedule.createdBy,
      input: (schedule.jobConfig as Record<string, unknown>) ?? undefined,
      metadata: {
        scheduleId: schedule.id,
        triggeredBy: "scheduler",
        scheduledTime: schedule.nextRunAt?.toISOString(),
      } as Record<string, unknown>,
    });

    // Calculate next run time
    const nextRunAt = calculateNextRunAt({
      frequency: schedule.frequency,
      hour: schedule.hour,
      minute: schedule.minute,
      dayOfWeek: schedule.dayOfWeek,
      dayOfMonth: schedule.dayOfMonth,
      cronExpression: schedule.cronExpression,
      timezone: schedule.timezone,
      startDate: schedule.startDate,
    });

    // Update the schedule
    await db
      .update(scheduledJobs)
      .set({
        lastRunAt: new Date(),
        lastJobId: job.id,
        nextRunAt,
        failureCount: 0, // Reset failure count on success
        updatedAt: new Date(),
      })
      .where(eq(scheduledJobs.id, schedule.id));

    return { success: true, jobId: job.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // Increment failure count
    const newFailureCount = (schedule.failureCount ?? 0) + 1;

    await db
      .update(scheduledJobs)
      .set({
        failureCount: newFailureCount,
        updatedAt: new Date(),
      })
      .where(eq(scheduledJobs.id, schedule.id));

    // Disable schedule if too many failures
    if (newFailureCount >= MAX_FAILURE_COUNT) {
      await db
        .update(scheduledJobs)
        .set({ isActive: false })
        .where(eq(scheduledJobs.id, schedule.id));
    }

    return { success: false, error: message };
  }
}

/**
 * Find and process all schedules that are due to run
 */
async function processDueSchedules(
  deps: SchedulerDeps,
  batchSize: number = DEFAULT_BATCH_SIZE
): Promise<{ processed: number; succeeded: number; failed: number }> {
  const now = new Date();

  // Find schedules that are due
  const dueSchedules = await db.query.scheduledJobs.findMany({
    where: and(
      eq(scheduledJobs.isActive, true),
      lte(scheduledJobs.nextRunAt, now),
      lt(scheduledJobs.failureCount, MAX_FAILURE_COUNT)
    ),
    limit: batchSize,
    orderBy: (scheduledJobs, { asc }) => [asc(scheduledJobs.nextRunAt)],
  });

  if (dueSchedules.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  console.log(`[Scheduler] Processing ${dueSchedules.length} due schedule(s)`);

  let succeeded = 0;
  let failed = 0;

  for (const schedule of dueSchedules) {
    const result = await processSchedule(schedule, deps);
    if (result.success) {
      succeeded++;
      console.log(
        `[Scheduler] ✓ Executed schedule ${schedule.id} (${schedule.name}), job: ${result.jobId}`
      );
    } else {
      failed++;
      console.error(
        `[Scheduler] ✗ Failed schedule ${schedule.id} (${schedule.name}): ${result.error}`
      );
    }
  }

  return { processed: dueSchedules.length, succeeded, failed };
}

/**
 * Scheduler worker that polls for due schedules
 */
export function createScheduler(
  deps: SchedulerDeps,
  config: SchedulerConfig = {}
) {
  const intervalMs = config.intervalMs ?? DEFAULT_INTERVAL_MS;
  const batchSize = config.batchSize ?? DEFAULT_BATCH_SIZE;
  let isRunning = false;
  let isStopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Run a single iteration of the scheduler
   */
  async function tick(): Promise<void> {
    if (isStopped) {
      return;
    }

    const startTime = Date.now();

    try {
      const result = await processDueSchedules(deps, batchSize);

      if (result.processed > 0) {
        console.log(
          `[Scheduler] Batch complete: ${result.succeeded} succeeded, ${result.failed} failed (${Date.now() - startTime}ms)`
        );
      }
    } catch (error) {
      console.error("[Scheduler] Error processing due schedules:", error);
    }

    // Schedule next tick
    if (!isStopped) {
      const elapsed = Date.now() - startTime;
      const delay = Math.max(0, intervalMs - elapsed);
      timer = setTimeout(tick, delay);
    }
  }

  return {
    /**
     * Start the scheduler
     */
    start(): void {
      if (isRunning) {
        console.log("[Scheduler] Already running");
        return;
      }

      isStopped = false;
      isRunning = true;
      console.log(
        `[Scheduler] Started (interval: ${intervalMs}ms, batch size: ${batchSize})`
      );

      // Start the tick loop
      tick().catch((error) => {
        console.error("[Scheduler] Error in main loop:", error);
      });
    },

    /**
     * Stop the scheduler gracefully
     */
    stop(): void {
      isStopped = true;
      isRunning = false;

      if (timer) {
        clearTimeout(timer);
        timer = null;
      }

      console.log("[Scheduler] Stopped");
    },

    /**
     * Check if scheduler is running
     */
    isRunning(): boolean {
      return isRunning;
    },

    /**
     * Process schedules immediately (for testing)
     */
    processNow(): Promise<{
      processed: number;
      succeeded: number;
      failed: number;
    }> {
      return processDueSchedules(deps, batchSize);
    },
  };
}

export type Scheduler = ReturnType<typeof createScheduler>;
