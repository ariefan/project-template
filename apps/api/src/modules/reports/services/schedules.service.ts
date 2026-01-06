import type {
  DayOfWeek,
  DeliveryConfig,
  DeliveryMethod,
  ScheduledReportRow,
  ScheduleFrequency,
} from "@workspace/db/schema";
import { NotFoundError } from "../../../lib/errors";
import * as schedulesRepo from "../repositories/schedules.repository";
import * as templatesRepo from "../repositories/templates.repository";

export interface CreateScheduleInput {
  templateId: string;
  name: string;
  description?: string;
  frequency: ScheduleFrequency;
  cronExpression?: string;
  dayOfWeek?: DayOfWeek;
  dayOfMonth?: number;
  hour?: number;
  minute?: number;
  timezone?: string;
  startDate: Date;
  endDate?: Date;
  deliveryMethod: DeliveryMethod;
  deliveryConfig?: DeliveryConfig;
  parameters?: Record<string, unknown>;
  isActive?: boolean;
}

export interface UpdateScheduleInput {
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
  deliveryMethod?: DeliveryMethod;
  deliveryConfig?: DeliveryConfig;
  parameters?: Record<string, unknown>;
  isActive?: boolean;
}

/**
 * Calculate the next run time for a schedule
 */
function calculateNextRunAt(
  schedule: CreateScheduleInput | UpdateScheduleInput,
  fromDate: Date = new Date()
): Date | null {
  const now = fromDate;
  const hour = schedule.hour ?? 0;
  const minute = schedule.minute ?? 0;

  switch (schedule.frequency) {
    case "once": {
      // For one-time runs, use startDate
      return schedule.startDate ?? null;
    }
    case "daily": {
      // Next occurrence at the specified time
      const next = new Date(now);
      next.setHours(hour, minute, 0, 0);
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      return next;
    }
    case "weekly": {
      // Next occurrence on the specified day
      const dayMap: Record<DayOfWeek, number> = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
      };
      const targetDay = schedule.dayOfWeek
        ? dayMap[schedule.dayOfWeek]
        : now.getDay();
      const next = new Date(now);
      const daysUntilTarget = (targetDay - now.getDay() + 7) % 7 || 7;
      next.setDate(now.getDate() + daysUntilTarget);
      next.setHours(hour, minute, 0, 0);
      if (next <= now) {
        next.setDate(next.getDate() + 7);
      }
      return next;
    }
    case "monthly": {
      // Next occurrence on the specified day of month
      const day = schedule.dayOfMonth ?? 1;
      const next = new Date(
        now.getFullYear(),
        now.getMonth(),
        day,
        hour,
        minute,
        0,
        0
      );
      if (next <= now) {
        next.setMonth(next.getMonth() + 1);
      }
      return next;
    }
    case "custom": {
      // For custom, we'd need to parse the cron expression
      // This is a simplified implementation
      return null;
    }
    default:
      return null;
  }
}

/**
 * List scheduled reports for an organization
 */
export function listSchedules(
  orgId: string,
  params: schedulesRepo.ListSchedulesParams = {}
) {
  return schedulesRepo.listSchedules(orgId, params);
}

/**
 * Get a scheduled report by ID
 */
export async function getSchedule(
  scheduleId: string,
  orgId: string
): Promise<ScheduledReportRow> {
  const schedule = await schedulesRepo.getScheduleById(scheduleId, orgId);

  if (!schedule) {
    throw new NotFoundError(`Schedule not found: ${scheduleId}`);
  }

  return schedule;
}

/**
 * Create a new scheduled report
 */
export async function createSchedule(
  orgId: string,
  userId: string,
  input: CreateScheduleInput
): Promise<ScheduledReportRow> {
  // Verify template exists
  const template = await templatesRepo.getTemplateById(input.templateId, orgId);
  if (!template) {
    throw new NotFoundError(`Template not found: ${input.templateId}`);
  }

  const nextRunAt = calculateNextRunAt(input);

  return schedulesRepo.createSchedule({
    organizationId: orgId,
    templateId: input.templateId,
    name: input.name,
    description: input.description,
    frequency: input.frequency,
    cronExpression: input.cronExpression,
    dayOfWeek: input.dayOfWeek,
    dayOfMonth: input.dayOfMonth,
    hour: input.hour,
    minute: input.minute,
    timezone: input.timezone ?? "UTC",
    startDate: input.startDate,
    endDate: input.endDate,
    deliveryMethod: input.deliveryMethod,
    deliveryConfig: input.deliveryConfig,
    parameters: input.parameters,
    isActive: input.isActive ?? true,
    nextRunAt,
    createdBy: userId,
  });
}

/**
 * Update a scheduled report
 */
export async function updateSchedule(
  scheduleId: string,
  orgId: string,
  input: UpdateScheduleInput
): Promise<ScheduledReportRow> {
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

  const updateData: Partial<typeof input & { nextRunAt: Date | null }> = {
    ...input,
  };

  if (needsRecalc) {
    // Convert null values from DB to undefined for the input type
    const mergedInput: UpdateScheduleInput = {
      frequency: input.frequency ?? existing.frequency,
      hour: input.hour ?? existing.hour ?? undefined,
      minute: input.minute ?? existing.minute ?? undefined,
      dayOfWeek: input.dayOfWeek ?? existing.dayOfWeek ?? undefined,
      dayOfMonth: input.dayOfMonth ?? existing.dayOfMonth ?? undefined,
      startDate: input.startDate ?? existing.startDate,
    };
    updateData.nextRunAt = calculateNextRunAt(mergedInput);
  }

  const updated = await schedulesRepo.updateSchedule(
    scheduleId,
    orgId,
    updateData
  );

  if (!updated) {
    throw new NotFoundError(`Schedule not found: ${scheduleId}`);
  }

  return updated;
}

/**
 * Delete a scheduled report (soft delete)
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
 * Pause a scheduled report
 */
export function pauseSchedule(
  scheduleId: string,
  orgId: string
): Promise<ScheduledReportRow> {
  return updateSchedule(scheduleId, orgId, { isActive: false });
}

/**
 * Resume a scheduled report
 */
export async function resumeSchedule(
  scheduleId: string,
  orgId: string
): Promise<ScheduledReportRow> {
  const schedule = await getSchedule(scheduleId, orgId);
  // Convert null values from DB to undefined for the input type
  const scheduleInput: UpdateScheduleInput = {
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
 * Get schedule owner ID (for authorization checks)
 */
export async function getScheduleOwnerId(
  scheduleId: string,
  orgId: string
): Promise<string | undefined> {
  const schedule = await schedulesRepo.getScheduleById(scheduleId, orgId);
  return schedule?.createdBy;
}
