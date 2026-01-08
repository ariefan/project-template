import { db } from "@workspace/db";
import {
  type DeliveryMethod,
  type NewScheduledReportRow,
  type ScheduledReportRow,
  type ScheduleFrequency,
  scheduledReports,
} from "@workspace/db/schema";
import { and, desc, eq, ilike, isNull, or } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface ListSchedulesParams {
  page?: number;
  pageSize?: number;
  orderBy?: string;
  templateId?: string;
  frequency?: ScheduleFrequency;
  deliveryMethod?: DeliveryMethod;
  isActive?: boolean;
  search?: string;
  includeDeleted?: boolean;
}

export interface ListSchedulesResult {
  schedules: ScheduledReportRow[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Generate a unique schedule ID
 */
export function generateScheduleId(): string {
  return `sched_${nanoid(12)}`;
}

/**
 * List scheduled reports for an organization
 */
export async function listSchedules(
  orgId: string,
  params: ListSchedulesParams = {}
): Promise<ListSchedulesResult> {
  const page = params.page ?? 1;
  const pageSize = Math.min(params.pageSize ?? 50, 100);
  const offset = (page - 1) * pageSize;

  const conditions = [eq(scheduledReports.organizationId, orgId)];

  if (!params.includeDeleted) {
    conditions.push(isNull(scheduledReports.deletedAt));
  }

  if (params.templateId) {
    conditions.push(eq(scheduledReports.templateId, params.templateId));
  }

  if (params.frequency) {
    conditions.push(eq(scheduledReports.frequency, params.frequency));
  }

  if (params.deliveryMethod) {
    conditions.push(eq(scheduledReports.deliveryMethod, params.deliveryMethod));
  }

  if (params.isActive !== undefined) {
    conditions.push(eq(scheduledReports.isActive, params.isActive));
  }

  if (params.search) {
    const searchTerm = `%${params.search}%`;
    const searchCondition = or(
      ilike(scheduledReports.name, searchTerm),
      ilike(scheduledReports.description, searchTerm)
    );
    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  const whereClause = and(...conditions);

  // Get total count
  const countResult = await db
    .select({ count: scheduledReports.id })
    .from(scheduledReports)
    .where(whereClause);

  const totalCount = countResult.length;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Get schedules
  const schedules = await db
    .select()
    .from(scheduledReports)
    .where(whereClause)
    .orderBy(desc(scheduledReports.createdAt))
    .limit(pageSize)
    .offset(offset);

  return {
    schedules,
    page,
    pageSize,
    totalCount,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
  };
}

/**
 * Get a scheduled report by ID
 */
export async function getScheduleById(
  scheduleId: string,
  orgId: string
): Promise<ScheduledReportRow | null> {
  const result = await db
    .select()
    .from(scheduledReports)
    .where(
      and(
        eq(scheduledReports.id, scheduleId),
        eq(scheduledReports.organizationId, orgId),
        isNull(scheduledReports.deletedAt)
      )
    )
    .limit(1);

  return result[0] ?? null;
}

/**
 * Create a new scheduled report
 */
export async function createSchedule(
  data: Omit<NewScheduledReportRow, "id">
): Promise<ScheduledReportRow> {
  const id = generateScheduleId();

  const result = await db
    .insert(scheduledReports)
    .values({ ...data, id })
    .returning();

  return result[0] as ScheduledReportRow;
}

/**
 * Update a scheduled report
 */
export async function updateSchedule(
  scheduleId: string,
  orgId: string,
  data: Partial<NewScheduledReportRow>
): Promise<ScheduledReportRow | null> {
  const result = await db
    .update(scheduledReports)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(
        eq(scheduledReports.id, scheduleId),
        eq(scheduledReports.organizationId, orgId),
        isNull(scheduledReports.deletedAt)
      )
    )
    .returning();

  return result[0] ?? null;
}

/**
 * Soft delete a scheduled report
 */
export async function deleteSchedule(
  scheduleId: string,
  orgId: string
): Promise<boolean> {
  const result = await db
    .update(scheduledReports)
    .set({ deletedAt: new Date(), isActive: false })
    .where(
      and(
        eq(scheduledReports.id, scheduleId),
        eq(scheduledReports.organizationId, orgId),
        isNull(scheduledReports.deletedAt)
      )
    )
    .returning({ id: scheduledReports.id });

  return result.length > 0;
}

/**
 * Update last run time and next run time
 */
export async function updateRunTimes(
  scheduleId: string,
  lastRunAt: Date,
  nextRunAt: Date | null
): Promise<void> {
  await db
    .update(scheduledReports)
    .set({ lastRunAt, nextRunAt, updatedAt: new Date() })
    .where(eq(scheduledReports.id, scheduleId));
}

/**
 * Increment failure count
 */
export async function incrementFailureCount(scheduleId: string): Promise<void> {
  const schedule = await db
    .select({ failureCount: scheduledReports.failureCount })
    .from(scheduledReports)
    .where(eq(scheduledReports.id, scheduleId))
    .limit(1);

  if (schedule[0]) {
    await db
      .update(scheduledReports)
      .set({
        failureCount: schedule[0].failureCount + 1,
        updatedAt: new Date(),
      })
      .where(eq(scheduledReports.id, scheduleId));
  }
}

/**
 * Reset failure count
 */
export async function resetFailureCount(scheduleId: string): Promise<void> {
  await db
    .update(scheduledReports)
    .set({ failureCount: 0, updatedAt: new Date() })
    .where(eq(scheduledReports.id, scheduleId));
}

/**
 * Get all active schedules that need to run
 */
export function getSchedulesDueForRun(
  _beforeTime: Date
): Promise<ScheduledReportRow[]> {
  return db
    .select()
    .from(scheduledReports)
    .where(
      and(
        eq(scheduledReports.isActive, true),
        isNull(scheduledReports.deletedAt)
        // nextRunAt <= beforeTime would be checked here
      )
    );
}
