import type {
  DayOfWeek,
  JobDeliveryMethod,
  ScheduledJobRow,
  ScheduleFrequency,
  scheduledJobs,
} from "@workspace/db/schema";
import { calculateNextRunAt } from "@workspace/utils";
import { NotFoundError } from "../../../lib/errors";
import * as schedulesRepo from "../repositories/schedules.repository";

export interface CreateScheduleInput {
  jobType: string;
  jobConfig?: Record<string, unknown>;
  name: string;
  description?: string;
  frequency: ScheduleFrequency;
  cronExpression?: string;
  dayOfWeek?: DayOfWeek;
  dayOfMonth?: number;
  hour?: number;
  minute?: number;
  timezone?: string;
  startDate?: Date;
  endDate?: Date;
  deliveryMethod?: JobDeliveryMethod;
  deliveryConfig?: Record<string, unknown>;
  isActive?: boolean;
}

export interface UpdateScheduleInput {
  jobType?: string;
  jobConfig?: Record<string, unknown>;
  name?: string;
  description?: string;
  frequency?: ScheduleFrequency;
  cronExpression?: string;
  dayOfWeek?: DayOfWeek;
  dayOfMonth?: number;
  hour?: number;
  minute?: number;
  timezone?: string;
  startDate?: Date;
  endDate?: Date;
  deliveryMethod?: JobDeliveryMethod;
  deliveryConfig?: Record<string, unknown>;
  isActive?: boolean;
}

/**
 * List scheduled jobs for an organization
 */
export function listSchedules(
  orgId: string | null | undefined,
  params: schedulesRepo.ListSchedulesParams = {}
) {
  return schedulesRepo.listSchedules(orgId, params);
}

/**
 * Get a scheduled job by ID
 */
export async function getSchedule(
  scheduleId: string,
  orgId: string
): Promise<ScheduledJobRow> {
  const schedule = await schedulesRepo.getScheduleById(scheduleId, orgId);

  if (!schedule) {
    throw new NotFoundError(`Schedule not found: ${scheduleId}`);
  }

  return schedule;
}

/**
 * Create a new scheduled job
 */
export function createSchedule(
  orgId: string,
  userId: string,
  input: CreateScheduleInput
): Promise<ScheduledJobRow> {
  const nextRunAt = calculateNextRunAt(input);

  return schedulesRepo.createSchedule({
    id: crypto.randomUUID(),
    organizationId: orgId,
    jobType: input.jobType,
    jobConfig: input.jobConfig,
    name: input.name,
    description: input.description,
    frequency: input.frequency,
    cronExpression: input.cronExpression,
    dayOfWeek: input.dayOfWeek,
    dayOfMonth: input.dayOfMonth,
    hour: input.hour,
    minute: input.minute,
    timezone: input.timezone ?? "UTC",
    startDate: input.startDate ?? new Date(),
    endDate: input.endDate,
    deliveryMethod: input.deliveryMethod ?? "none",
    deliveryConfig: input.deliveryConfig,
    isActive: input.isActive ?? true,
    nextRunAt,
    createdBy: userId,
  });
}

/**
 * Update a scheduled job
 */
export async function updateSchedule(
  scheduleId: string,
  orgId: string,
  input: UpdateScheduleInput
): Promise<ScheduledJobRow> {
  // Check if schedule exists
  const existing = await schedulesRepo.getScheduleById(scheduleId, orgId);
  if (!existing) {
    throw new NotFoundError(`Schedule not found: ${scheduleId}`);
  }

  // Recalculate next run time if schedule changed
  const needsRecalc =
    input.frequency !== undefined ||
    input.hour !== undefined ||
    input.minute !== undefined ||
    input.dayOfWeek !== undefined ||
    input.dayOfMonth !== undefined;

  const updateData: Record<string, unknown> = { ...input };

  if (needsRecalc) {
    // Merge with existing values for calculation
    const mergedInput = {
      frequency: input.frequency ?? existing.frequency,
      hour: input.hour ?? existing.hour ?? undefined,
      minute: input.minute ?? existing.minute ?? undefined,
      dayOfWeek: input.dayOfWeek ?? existing.dayOfWeek ?? undefined,
      dayOfMonth: input.dayOfMonth ?? existing.dayOfMonth ?? undefined,
      startDate: input.startDate ?? existing.startDate,
      cronExpression: input.cronExpression ?? existing.cronExpression,
      timezone: input.timezone ?? existing.timezone,
    };
    updateData.nextRunAt = calculateNextRunAt(mergedInput);
  }

  const updated = await schedulesRepo.updateSchedule(
    scheduleId,
    orgId,
    updateData as Partial<typeof scheduledJobs.$inferInsert>
  );

  if (!updated) {
    throw new NotFoundError(`Schedule not found: ${scheduleId}`);
  }

  return updated;
}

/**
 * Delete a scheduled job (soft delete)
 */
export async function deleteSchedule(
  scheduleId: string,
  orgId: string
): Promise<void> {
  const deleted = await schedulesRepo.deleteSchedule(scheduleId, orgId);

  if (!deleted) {
    throw new NotFoundError(`Schedule not found: ${scheduleId}`);
  }
}

/**
 * Pause a scheduled job
 */
export async function pauseSchedule(
  scheduleId: string,
  orgId: string
): Promise<ScheduledJobRow> {
  const updated = await schedulesRepo.updateSchedule(scheduleId, orgId, {
    isActive: false,
  });

  if (!updated) {
    throw new NotFoundError(`Schedule not found: ${scheduleId}`);
  }

  return updated;
}

/**
 * Resume a paused scheduled job
 */
export async function resumeSchedule(
  scheduleId: string,
  orgId: string
): Promise<ScheduledJobRow> {
  const schedule = await getSchedule(scheduleId, orgId);

  // Recalculate next run time
  const scheduleInput = {
    frequency: schedule.frequency,
    hour: schedule.hour ?? undefined,
    minute: schedule.minute ?? undefined,
    dayOfWeek: schedule.dayOfWeek ?? undefined,
    dayOfMonth: schedule.dayOfMonth ?? undefined,
    startDate: schedule.startDate,
  };
  const nextRunAt = calculateNextRunAt(scheduleInput);

  const updated = await schedulesRepo.updateSchedule(scheduleId, orgId, {
    isActive: true,
    nextRunAt,
  });

  if (!updated) {
    throw new NotFoundError(`Schedule not found: ${scheduleId}`);
  }

  return updated;
}

/**
 * Run a scheduled job immediately
 * This creates a job from the schedule configuration
 */
export async function runScheduleNow(
  scheduleId: string,
  orgId: string,
  userId: string
): Promise<{ jobId: string }> {
  const schedule = await getSchedule(scheduleId, orgId);

  // Import jobsService dynamically to avoid circular dependency
  const { jobsService } = await import("../../jobs");

  // Create a job from the schedule
  const job = await jobsService.createAndEnqueueJob({
    orgId,
    type: schedule.jobType,
    createdBy: userId,
    input: schedule.jobConfig as Record<string, unknown>,
    metadata: {
      scheduleId: schedule.id,
      triggeredBy: "manual",
    } as Record<string, unknown>,
  });

  // Update the schedule's lastJobId and lastRunAt
  await schedulesRepo.updateSchedule(scheduleId, orgId, {
    lastJobId: job.id,
    lastRunAt: new Date(),
  });

  return { jobId: job.id };
}

/**
 * Get schedule owner ID (for authorization checks)
 */
export async function getScheduleOwnerId(
  scheduleId: string,
  orgId: string
): Promise<string | undefined> {
  const schedule = await schedulesRepo.getScheduleById(scheduleId, orgId);
  return schedule?.createdBy;
}
