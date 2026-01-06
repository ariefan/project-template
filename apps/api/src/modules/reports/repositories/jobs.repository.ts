import { db } from "@workspace/db";
import {
  type NewReportJobRow,
  type ReportFormat,
  type ReportJobError,
  type ReportJobResult,
  type ReportJobRow,
  type ReportJobStatus,
  type ReportJobType,
  reportJobs,
} from "@workspace/db/schema";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface ListJobsParams {
  page?: number;
  pageSize?: number;
  orderBy?: string;
  templateId?: string;
  scheduledReportId?: string;
  type?: ReportJobType;
  status?: ReportJobStatus;
  format?: ReportFormat;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface ListJobsResult {
  jobs: ReportJobRow[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Generate a unique job ID
 */
export function generateJobId(): string {
  return `report_${nanoid(12)}`;
}

/**
 * List report jobs for an organization
 */
export async function listJobs(
  orgId: string,
  params: ListJobsParams = {}
): Promise<ListJobsResult> {
  const page = params.page ?? 1;
  const pageSize = Math.min(params.pageSize ?? 50, 100);
  const offset = (page - 1) * pageSize;

  const conditions = [eq(reportJobs.organizationId, orgId)];

  if (params.templateId) {
    conditions.push(eq(reportJobs.templateId, params.templateId));
  }

  if (params.scheduledReportId) {
    conditions.push(eq(reportJobs.scheduledReportId, params.scheduledReportId));
  }

  if (params.type) {
    conditions.push(eq(reportJobs.type, params.type));
  }

  if (params.status) {
    conditions.push(eq(reportJobs.status, params.status));
  }

  if (params.format) {
    conditions.push(eq(reportJobs.format, params.format));
  }

  if (params.createdAfter) {
    conditions.push(gte(reportJobs.createdAt, params.createdAfter));
  }

  if (params.createdBefore) {
    conditions.push(lte(reportJobs.createdAt, params.createdBefore));
  }

  const whereClause = and(...conditions);

  // Get total count
  const countResult = await db
    .select({ count: reportJobs.id })
    .from(reportJobs)
    .where(whereClause);

  const totalCount = countResult.length;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Get jobs
  const jobs = await db
    .select()
    .from(reportJobs)
    .where(whereClause)
    .orderBy(desc(reportJobs.createdAt))
    .limit(pageSize)
    .offset(offset);

  return {
    jobs,
    page,
    pageSize,
    totalCount,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
  };
}

/**
 * Get a job by ID
 */
export async function getJobById(
  jobId: string,
  orgId: string
): Promise<ReportJobRow | null> {
  const result = await db
    .select()
    .from(reportJobs)
    .where(and(eq(reportJobs.id, jobId), eq(reportJobs.organizationId, orgId)))
    .limit(1);

  return result[0] ?? null;
}

/**
 * Create a new job
 */
export async function createJob(
  data: Omit<NewReportJobRow, "id">
): Promise<ReportJobRow> {
  const id = generateJobId();

  const result = await db
    .insert(reportJobs)
    .values({ ...data, id })
    .returning();

  return result[0] as ReportJobRow;
}

/**
 * Update job status
 */
export async function updateJobStatus(
  jobId: string,
  status: ReportJobStatus,
  additionalData?: {
    progress?: number;
    processedRows?: number;
    totalRows?: number;
    startedAt?: Date;
    completedAt?: Date;
    estimatedCompletion?: Date;
  }
): Promise<ReportJobRow | null> {
  const result = await db
    .update(reportJobs)
    .set({ status, ...additionalData })
    .where(eq(reportJobs.id, jobId))
    .returning();

  return result[0] ?? null;
}

/**
 * Update job progress
 */
export async function updateJobProgress(
  jobId: string,
  progress: number,
  processedRows: number,
  estimatedCompletion?: Date
): Promise<void> {
  await db
    .update(reportJobs)
    .set({ progress, processedRows, estimatedCompletion })
    .where(eq(reportJobs.id, jobId));
}

/**
 * Complete a job with result
 */
export async function completeJob(
  jobId: string,
  result: ReportJobResult
): Promise<ReportJobRow | null> {
  const updated = await db
    .update(reportJobs)
    .set({
      status: "completed",
      progress: 100,
      result,
      completedAt: new Date(),
    })
    .where(eq(reportJobs.id, jobId))
    .returning();

  return updated[0] ?? null;
}

/**
 * Fail a job with error
 */
export async function failJob(
  jobId: string,
  error: ReportJobError
): Promise<ReportJobRow | null> {
  const updated = await db
    .update(reportJobs)
    .set({
      status: "failed",
      error,
      completedAt: new Date(),
    })
    .where(eq(reportJobs.id, jobId))
    .returning();

  return updated[0] ?? null;
}

/**
 * Cancel a job
 */
export async function cancelJob(
  jobId: string,
  orgId: string
): Promise<boolean> {
  const result = await db
    .update(reportJobs)
    .set({
      status: "cancelled",
      completedAt: new Date(),
    })
    .where(
      and(
        eq(reportJobs.id, jobId),
        eq(reportJobs.organizationId, orgId),
        // Can only cancel pending or processing jobs
        eq(reportJobs.status, "pending")
      )
    )
    .returning({ id: reportJobs.id });

  return result.length > 0;
}

/**
 * Get jobs for a scheduled report
 */
export async function getJobsBySchedule(
  scheduleId: string,
  params: { page?: number; pageSize?: number; status?: ReportJobStatus }
): Promise<ListJobsResult> {
  const page = params.page ?? 1;
  const pageSize = Math.min(params.pageSize ?? 20, 100);
  const offset = (page - 1) * pageSize;

  const conditions = [eq(reportJobs.scheduledReportId, scheduleId)];

  if (params.status) {
    conditions.push(eq(reportJobs.status, params.status));
  }

  const whereClause = and(...conditions);

  const countResult = await db
    .select({ count: reportJobs.id })
    .from(reportJobs)
    .where(whereClause);

  const totalCount = countResult.length;
  const totalPages = Math.ceil(totalCount / pageSize);

  const jobs = await db
    .select()
    .from(reportJobs)
    .where(whereClause)
    .orderBy(desc(reportJobs.createdAt))
    .limit(pageSize)
    .offset(offset);

  return {
    jobs,
    page,
    pageSize,
    totalCount,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
  };
}
