import { db } from "@workspace/db";
import {
  type JobRow,
  type JobStatus,
  jobs,
  type NewJobRow,
} from "@workspace/db/schema";
import { and, desc, eq, gte } from "drizzle-orm";

export interface ListJobsOptions {
  page?: number;
  pageSize?: number;
  status?: JobStatus;
  type?: string;
  createdAfter?: Date;
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
 * List jobs with pagination and filtering
 */
export async function listJobs(
  orgId: string,
  options: ListJobsOptions = {}
): Promise<ListJobsResult> {
  const { page = 1, pageSize = 50, status, type, createdAfter } = options;

  // Build where conditions
  const conditions = [eq(jobs.orgId, orgId)];

  if (status) {
    conditions.push(eq(jobs.status, status));
  }
  if (type) {
    conditions.push(eq(jobs.type, type));
  }
  if (createdAfter) {
    conditions.push(gte(jobs.createdAt, createdAfter));
  }

  const whereClause = and(...conditions);

  // Get total count
  const allJobs = await db.select().from(jobs).where(whereClause);
  const totalCount = allJobs.length;

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
 * Complete a job with result
 */
export async function completeJob(
  jobId: string,
  result: unknown
): Promise<JobRow | null> {
  const [updated] = await db
    .update(jobs)
    .set({
      status: "completed",
      result,
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
  errorCode: string,
  errorMessage: string
): Promise<JobRow | null> {
  const [updated] = await db
    .update(jobs)
    .set({
      status: "failed",
      errorCode,
      errorMessage,
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
  const [updated] = await db
    .update(jobs)
    .set({
      progress: Math.min(100, Math.max(0, progress)),
      message,
    })
    .where(eq(jobs.id, jobId))
    .returning();

  return updated ?? null;
}
