/**
 * Schedule Service
 *
 * CRUD operations for scheduled reports
 */

import { nanoid } from "nanoid";
import { CronParser } from "../scheduler/cron";
import type { DeliveryMethod, ScheduleFrequency } from "../types";

export interface ScheduledReport {
  id: string;
  organizationId: string;
  templateId: string;
  name: string;
  description?: string;
  frequency: ScheduleFrequency;
  cronExpression?: string;
  timezone: string;
  startDate?: Date;
  endDate?: Date;
  deliveryMethod: DeliveryMethod;
  deliveryConfig: Record<string, unknown>;
  parameters: Record<string, unknown>;
  isActive: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
  failureCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface CreateScheduleInput {
  organizationId: string;
  templateId: string;
  name: string;
  description?: string;
  frequency: ScheduleFrequency;
  cronExpression?: string;
  timezone?: string;
  startDate?: Date;
  endDate?: Date;
  deliveryMethod: DeliveryMethod;
  deliveryConfig: Record<string, unknown>;
  parameters?: Record<string, unknown>;
  createdBy: string;
}

export interface UpdateScheduleInput {
  name?: string;
  description?: string;
  frequency?: ScheduleFrequency;
  cronExpression?: string;
  timezone?: string;
  startDate?: Date;
  endDate?: Date;
  deliveryMethod?: DeliveryMethod;
  deliveryConfig?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
  isActive?: boolean;
}

export interface ScheduleFilters {
  templateId?: string;
  isActive?: boolean;
  deliveryMethod?: DeliveryMethod;
  createdBy?: string;
  includeDeleted?: boolean;
}

export interface ScheduleServiceDeps {
  db: {
    insert: (data: Omit<ScheduledReport, "id">) => Promise<ScheduledReport>;
    findById: (id: string, orgId: string) => Promise<ScheduledReport | null>;
    update: (
      id: string,
      orgId: string,
      data: Partial<ScheduledReport>
    ) => Promise<ScheduledReport>;
    softDelete: (id: string, orgId: string) => Promise<void>;
    findMany: (
      orgId: string,
      filters?: ScheduleFilters
    ) => Promise<ScheduledReport[]>;
    findDue: (before: Date) => Promise<ScheduledReport[]>;
  };
}

export class ScheduleService {
  private readonly deps: ScheduleServiceDeps;

  constructor(deps: ScheduleServiceDeps) {
    this.deps = deps;
  }

  /**
   * Create a new scheduled report
   */
  async createSchedule(input: CreateScheduleInput): Promise<ScheduledReport> {
    // Validate cron expression if provided
    if (input.cronExpression) {
      const validation = CronParser.validate(input.cronExpression);
      if (!validation.valid) {
        throw new Error(`Invalid cron expression: ${validation.error}`);
      }
    }

    // Calculate next run time
    const nextRunAt = this.calculateNextRun(
      input.frequency,
      input.cronExpression
    );

    const schedule = await this.deps.db.insert({
      organizationId: input.organizationId,
      templateId: input.templateId,
      name: input.name,
      description: input.description,
      frequency: input.frequency,
      cronExpression: input.cronExpression,
      timezone: input.timezone ?? "UTC",
      startDate: input.startDate,
      endDate: input.endDate,
      deliveryMethod: input.deliveryMethod,
      deliveryConfig: input.deliveryConfig,
      parameters: input.parameters ?? {},
      isActive: true,
      nextRunAt,
      failureCount: 0,
      createdBy: input.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return schedule;
  }

  /**
   * Get a schedule by ID
   */
  async getSchedule(
    scheduleId: string,
    organizationId: string
  ): Promise<ScheduledReport | null> {
    return await this.deps.db.findById(scheduleId, organizationId);
  }

  /**
   * Update a schedule
   */
  async updateSchedule(
    scheduleId: string,
    organizationId: string,
    updates: UpdateScheduleInput
  ): Promise<ScheduledReport> {
    // Validate cron expression if provided
    if (updates.cronExpression) {
      const validation = CronParser.validate(updates.cronExpression);
      if (!validation.valid) {
        throw new Error(`Invalid cron expression: ${validation.error}`);
      }
    }

    // Recalculate next run if frequency/cron changed
    let nextRunAt: Date | undefined;
    if (updates.frequency || updates.cronExpression) {
      const schedule = await this.getSchedule(scheduleId, organizationId);
      if (schedule) {
        nextRunAt = this.calculateNextRun(
          updates.frequency ?? schedule.frequency,
          updates.cronExpression ?? schedule.cronExpression
        );
      }
    }

    return this.deps.db.update(scheduleId, organizationId, {
      ...updates,
      ...(nextRunAt && { nextRunAt }),
      updatedAt: new Date(),
    });
  }

  /**
   * Delete a schedule (soft delete)
   */
  async deleteSchedule(
    scheduleId: string,
    organizationId: string
  ): Promise<void> {
    await this.deps.db.softDelete(scheduleId, organizationId);
  }

  /**
   * List schedules for an organization
   */
  async listSchedules(
    organizationId: string,
    filters?: ScheduleFilters
  ): Promise<ScheduledReport[]> {
    return await this.deps.db.findMany(organizationId, filters);
  }

  /**
   * Pause a schedule
   */
  async pauseSchedule(
    scheduleId: string,
    organizationId: string
  ): Promise<ScheduledReport> {
    return await this.deps.db.update(scheduleId, organizationId, {
      isActive: false,
      updatedAt: new Date(),
    });
  }

  /**
   * Resume a schedule
   */
  async resumeSchedule(
    scheduleId: string,
    organizationId: string
  ): Promise<ScheduledReport> {
    const schedule = await this.getSchedule(scheduleId, organizationId);
    if (!schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }

    const nextRunAt = this.calculateNextRun(
      schedule.frequency,
      schedule.cronExpression
    );

    return this.deps.db.update(scheduleId, organizationId, {
      isActive: true,
      nextRunAt,
      updatedAt: new Date(),
    });
  }

  /**
   * Record a successful run
   */
  async recordSuccess(
    scheduleId: string,
    organizationId: string
  ): Promise<ScheduledReport> {
    const schedule = await this.getSchedule(scheduleId, organizationId);
    if (!schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }

    const nextRunAt = this.calculateNextRun(
      schedule.frequency,
      schedule.cronExpression
    );

    return this.deps.db.update(scheduleId, organizationId, {
      lastRunAt: new Date(),
      nextRunAt,
      failureCount: 0,
      updatedAt: new Date(),
    });
  }

  /**
   * Record a failed run
   */
  async recordFailure(
    scheduleId: string,
    organizationId: string
  ): Promise<ScheduledReport> {
    const schedule = await this.getSchedule(scheduleId, organizationId);
    if (!schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }

    const nextRunAt = this.calculateNextRun(
      schedule.frequency,
      schedule.cronExpression
    );

    return this.deps.db.update(scheduleId, organizationId, {
      lastRunAt: new Date(),
      nextRunAt,
      failureCount: schedule.failureCount + 1,
      updatedAt: new Date(),
    });
  }

  /**
   * Get schedules due for execution
   */
  async getDueSchedules(): Promise<ScheduledReport[]> {
    return await this.deps.db.findDue(new Date());
  }

  /**
   * Calculate next run time based on frequency
   */
  private calculateNextRun(
    frequency: ScheduleFrequency,
    cronExpression?: string
  ): Date | undefined {
    if (frequency === "once") {
      return undefined;
    }

    if (frequency === "custom" && cronExpression) {
      return CronParser.getNextRun(cronExpression);
    }

    // Preset frequencies
    const now = new Date();
    const next = new Date(now);

    switch (frequency) {
      case "daily":
        next.setDate(next.getDate() + 1);
        next.setHours(0, 0, 0, 0);
        break;
      case "weekly":
        next.setDate(next.getDate() + 7);
        next.setHours(0, 0, 0, 0);
        break;
      case "monthly":
        next.setMonth(next.getMonth() + 1);
        next.setDate(1);
        next.setHours(0, 0, 0, 0);
        break;
      default:
        // Handle "once" and "custom" (already handled above)
        break;
    }

    return next;
  }
}

/**
 * Generate a schedule ID
 */
export function generateScheduleId(): string {
  return `sch_${nanoid(12)}`;
}

/**
 * Create a schedule service instance
 */
export function createScheduleService(
  deps: ScheduleServiceDeps
): ScheduleService {
  return new ScheduleService(deps);
}
