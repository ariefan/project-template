import { db } from "@workspace/db";
import type {
  JobDeliveryMethod,
  ScheduledJobRow,
  ScheduleFrequencyV2,
} from "@workspace/db/schema";
import { scheduledJobs } from "@workspace/db/schema";
import { and, eq, sql } from "drizzle-orm";

export interface ListSchedulesParams {
  page?: number;
  pageSize?: number;
  jobType?: string;
  frequency?: ScheduleFrequencyV2;
  deliveryMethod?: JobDeliveryMethod;
  isActive?: boolean;
  search?: string;
  orderBy?: string;
}

export interface ListSchedulesResult {
  data: ScheduledJobRow[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

/**
 * List scheduled jobs for an organization with filtering and pagination
 */
export async function listSchedules(
  orgId: string,
  params: ListSchedulesParams = {}
): Promise<ListSchedulesResult> {
  const {
    page = 1,
    pageSize = 50,
    jobType,
    frequency,
    deliveryMethod,
    isActive,
    search,
    orderBy = "createdAt",
  } = params;

  const offset = (page - 1) * pageSize;

  // Build conditions
  const conditions = [eq(scheduledJobs.organizationId, orgId)];

  if (jobType) {
    conditions.push(eq(scheduledJobs.jobType, jobType));
  }

  if (frequency) {
    conditions.push(eq(scheduledJobs.frequency, frequency));
  }

  if (deliveryMethod) {
    conditions.push(eq(scheduledJobs.deliveryMethod, deliveryMethod));
  }

  if (isActive !== undefined) {
    conditions.push(eq(scheduledJobs.isActive, isActive));
  }

  if (search) {
    conditions.push(sql`${scheduledJobs.name} ILIKE ${`%${search}%`}`);
  }

  const whereClause =
    conditions.length > 1 ? and(...conditions) : conditions[0];

  // Get total count
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(scheduledJobs)
    .where(whereClause);

  const count = result[0]?.count ?? 0;
  const totalCount = Number(count);

  // Build order by clause
  const orderByColumn =
    orderBy === "name"
      ? scheduledJobs.name
      : orderBy === "nextRunAt"
        ? scheduledJobs.nextRunAt
        : orderBy === "frequency"
          ? scheduledJobs.frequency
          : scheduledJobs.createdAt;

  // Get paginated data
  const data = await db
    .select()
    .from(scheduledJobs)
    .where(whereClause)
    .orderBy(orderByColumn)
    .limit(pageSize)
    .offset(offset);

  return {
    data,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
      hasNext: offset + pageSize < totalCount,
      hasPrevious: page > 1,
    },
  };
}

/**
 * Get a scheduled job by ID
 */
export async function getScheduleById(
  scheduleId: string,
  orgId: string
): Promise<ScheduledJobRow | undefined> {
  const [schedule] = await db
    .select()
    .from(scheduledJobs)
    .where(
      and(
        eq(scheduledJobs.id, scheduleId),
        eq(scheduledJobs.organizationId, orgId)
      )
    )
    .limit(1);

  return schedule;
}

/**
 * Create a new scheduled job
 */
export async function createSchedule(
  input: typeof scheduledJobs.$inferInsert
): Promise<ScheduledJobRow> {
  const [schedule] = await db.insert(scheduledJobs).values(input).returning();

  if (!schedule) {
    throw new Error("Failed to create schedule");
  }

  return schedule;
}

/**
 * Update a scheduled job
 */
export async function updateSchedule(
  scheduleId: string,
  orgId: string,
  updates: Partial<
    Omit<
      typeof scheduledJobs.$inferInsert,
      "id" | "organizationId" | "createdAt"
    >
  >
): Promise<ScheduledJobRow | undefined> {
  const [schedule] = await db
    .update(scheduledJobs)
    .set(updates)
    .where(
      and(
        eq(scheduledJobs.id, scheduleId),
        eq(scheduledJobs.organizationId, orgId)
      )
    )
    .returning();

  return schedule;
}

/**
 * Delete a scheduled job (soft delete)
 */
export async function deleteSchedule(
  scheduleId: string,
  orgId: string
): Promise<boolean> {
  const result = await db
    .update(scheduledJobs)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(scheduledJobs.id, scheduleId),
        eq(scheduledJobs.organizationId, orgId)
      )
    );

  return (result.rowCount ?? 0) > 0;
}
