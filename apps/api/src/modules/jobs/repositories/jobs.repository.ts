import { db } from "@workspace/db";
import {
  type JobRow,
  type JobStatus,
  jobs,
  type NewJobRow,
} from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";

export interface ListJobsOptions {
  page?: number;
  pageSize?: number;
  status?: JobStatus;
  type?: string;
  format?: string;
  templateId?: string;
  scheduleId?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface ListJobsResult {
  data: JobRow[];
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
 * Create a new job
 */
export async function createJob(data: NewJobRow): Promise<JobRow> {
  const [job] = await db.insert(jobs).values(data).returning();
  if (!job) {
    throw new Error("Failed to create job record");
  }
  return job;
}

/**
 * Get a job by ID
 */
export async function getJobById(
  orgId: string,
  jobId: string
): Promise<JobRow | null> {
  const [job] = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.id, jobId), eq(jobs.orgId, orgId)))
    .limit(1);

  return job ?? null;
}

/**
 * Get a job by ID (internal - no org check)
 */
export async function getJobByIdInternal(
  jobId: string
): Promise<JobRow | null> {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);

  return job ?? null;
}

/**
 * List jobs with pagination and filtering
 */
export async function listJobs(
  orgId: string | null | undefined,
  options: ListJobsOptions = {}
): Promise<ListJobsResult> {
  const {
    page = 1,
    pageSize = 50,
    status,
    type,
    format,
    templateId,
    scheduleId,
    createdAfter,
    createdBefore,
  } = options;

  const { sql, and, eq, gte, lte, desc, count } = await import("drizzle-orm");

  // Build where conditions
  // biome-ignore lint/suspicious/noExplicitAny: complex SQL conditions
  const conditions: any[] = [];

  if (orgId) {
    conditions.push(eq(jobs.orgId, orgId));
  }

  if (status) {
    conditions.push(eq(jobs.status, status));
  }
  if (type) {
    conditions.push(eq(jobs.type, type));
  }
  if (createdAfter) {
    conditions.push(gte(jobs.createdAt, createdAfter));
  }
  if (createdBefore) {
    conditions.push(lte(jobs.createdAt, createdBefore));
  }

  // Filter by metadata fields using JSONB operators
  if (format) {
    conditions.push(sql`${jobs.metadata}->>'format' = ${format}`);
  }
  if (templateId) {
    conditions.push(sql`${jobs.metadata}->>'templateId' = ${templateId}`);
  }
  if (scheduleId) {
    conditions.push(sql`${jobs.metadata}->>'scheduleId' = ${scheduleId}`);
  }

  const whereClause = and(...conditions);

  // Get total count
  const [countResult] = await db
    .select({ count: count() })
    .from(jobs)
    .where(whereClause);
  const totalCount = Number(countResult?.count ?? 0);

  // Get paginated results
  const offset = (page - 1) * pageSize;
  const data = await db
    .select()
    .from(jobs)
    .where(whereClause)
    .orderBy(desc(jobs.createdAt))
    .limit(pageSize)
    .offset(offset);

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    data,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
  };
}

/**
 * Update job status
 */
export async function updateJobStatus(
  jobId: string,
  status: JobStatus,
  updates: Partial<Pick<JobRow, "progress" | "message" | "startedAt">> = {}
): Promise<JobRow | null> {
  const [updated] = await db
    .update(jobs)
    .set({
      status,
      ...updates,
    })
    .where(eq(jobs.id, jobId))
    .returning();

  return updated ?? null;
}

/**
 * Complete a job with output
 */
export async function completeJob(
  jobId: string,
  output: Record<string, unknown>
): Promise<JobRow | null> {
  const [updated] = await db
    .update(jobs)
    .set({
      status: "completed",
      output,
      completedAt: new Date(),
      progress: 100,
    })
    .where(eq(jobs.id, jobId))
    .returning();

  return updated ?? null;
}

/**
 * Fail a job with error
 */
export async function failJob(
  jobId: string,
  error: { code: string; message: string; retryable?: boolean }
): Promise<JobRow | null> {
  const [updated] = await db
    .update(jobs)
    .set({
      status: "failed",
      error,
      completedAt: new Date(),
    })
    .where(eq(jobs.id, jobId))
    .returning();

  return updated ?? null;
}

/**
 * Cancel a job
 */
export async function cancelJob(jobId: string): Promise<JobRow | null> {
  // Only pending or processing jobs can be cancelled
  const [updated] = await db
    .update(jobs)
    .set({
      status: "cancelled",
      completedAt: new Date(),
    })
    .where(eq(jobs.id, jobId))
    .returning();

  return updated ?? null;
}

/**
 * Update job progress
 */
export async function updateJobProgress(
  jobId: string,
  progress: number,
  message?: string
): Promise<JobRow | null> {
  // If progress is -1, only update message
  const updates =
    progress < 0
      ? { message }
      : { progress: Math.min(100, Math.max(0, progress)), message };

  const [updated] = await db
    .update(jobs)
    .set(updates)
    .where(eq(jobs.id, jobId))
    .returning();

  return updated ?? null;
}

/**
 * Update queue job ID
 */
export async function updateQueueJobId(
  jobId: string,
  queueJobId: string
): Promise<JobRow | null> {
  const [updated] = await db
    .update(jobs)
    .set({ queueJobId })
    .where(eq(jobs.id, jobId))
    .returning();

  return updated ?? null;
}

/**
 * Update processed items count
 */
export async function updateProcessedItems(
  jobId: string,
  processed: number,
  total?: number
): Promise<JobRow | null> {
  const updates: { processedItems: number; totalItems?: number } = {
    processedItems: processed,
  };

  if (total !== undefined) {
    updates.totalItems = total;
  }

  const [updated] = await db
    .update(jobs)
    .set(updates)
    .where(eq(jobs.id, jobId))
    .returning();

  return updated ?? null;
}
