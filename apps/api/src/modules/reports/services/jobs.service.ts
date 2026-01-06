import type {
  ReportFormat,
  ReportJobError,
  ReportJobResult,
  ReportJobRow,
  ReportJobStatus,
} from "@workspace/db/schema";
import { BadRequestError, NotFoundError } from "../../../lib/errors";
import type { ReportQueue } from "../queue/report-queue";
import * as jobsRepo from "../repositories/jobs.repository";

// Optional queue instance - set via initQueue()
let reportQueue: ReportQueue | null = null;

/**
 * Initialize the report queue for async processing
 */
export function initQueue(queue: ReportQueue): void {
  reportQueue = queue;
}

/**
 * Enqueue a job for processing
 */
export async function enqueueJob(
  jobId: string,
  orgId: string,
  options: {
    templateId?: string;
    format: string;
    parameters?: Record<string, unknown>;
  }
): Promise<void> {
  if (!reportQueue) {
    console.warn("Report queue not initialized, job will remain pending");
    return;
  }

  await reportQueue.enqueue({
    jobId,
    orgId,
    templateId: options.templateId,
    format: options.format,
    parameters: options.parameters,
  });
}

export interface CreateJobInput {
  templateId?: string;
  scheduledReportId?: string;
  type: "manual" | "scheduled";
  format: ReportFormat;
  parameters?: Record<string, unknown>;
  totalRows?: number;
  queueJobId?: string;
}

/**
 * List jobs for an organization
 */
export function listJobs(orgId: string, params: jobsRepo.ListJobsParams = {}) {
  return jobsRepo.listJobs(orgId, params);
}

/**
 * Get a job by ID
 */
export async function getJob(
  jobId: string,
  orgId: string
): Promise<ReportJobRow> {
  const job = await jobsRepo.getJobById(jobId, orgId);

  if (!job) {
    throw new NotFoundError(`Job not found: ${jobId}`);
  }

  return job;
}

/**
 * Create a new job
 */
export function createJob(
  orgId: string,
  userId: string,
  input: CreateJobInput
): Promise<ReportJobRow> {
  return jobsRepo.createJob({
    organizationId: orgId,
    templateId: input.templateId,
    scheduledReportId: input.scheduledReportId,
    type: input.type,
    format: input.format,
    status: "pending",
    progress: 0,
    totalRows: input.totalRows,
    processedRows: 0,
    parameters: input.parameters,
    queueJobId: input.queueJobId,
    createdBy: userId,
  });
}

/**
 * Start processing a job
 */
export async function startJob(jobId: string): Promise<ReportJobRow> {
  const updated = await jobsRepo.updateJobStatus(jobId, "processing", {
    startedAt: new Date(),
    progress: 0,
  });

  if (!updated) {
    throw new NotFoundError(`Job not found: ${jobId}`);
  }

  return updated;
}

/**
 * Update job progress
 */
export async function updateJobProgress(
  jobId: string,
  processedRows: number,
  totalRows?: number
): Promise<void> {
  const progress = totalRows
    ? Math.round((processedRows / totalRows) * 100)
    : undefined;

  // Estimate completion based on current progress
  let estimatedCompletion: Date | undefined;
  if (progress && progress > 0 && progress < 100) {
    const job = await jobsRepo.getJobById(jobId, "");
    if (job?.startedAt) {
      const elapsed = Date.now() - job.startedAt.getTime();
      const estimatedTotal = (elapsed / progress) * 100;
      estimatedCompletion = new Date(job.startedAt.getTime() + estimatedTotal);
    }
  }

  await jobsRepo.updateJobProgress(
    jobId,
    progress ?? 0,
    processedRows,
    estimatedCompletion
  );
}

/**
 * Complete a job successfully
 */
export async function completeJob(
  jobId: string,
  result: ReportJobResult
): Promise<ReportJobRow> {
  const updated = await jobsRepo.completeJob(jobId, result);

  if (!updated) {
    throw new NotFoundError(`Job not found: ${jobId}`);
  }

  return updated;
}

/**
 * Fail a job with an error
 */
export async function failJob(
  jobId: string,
  error: ReportJobError
): Promise<ReportJobRow> {
  const updated = await jobsRepo.failJob(jobId, error);

  if (!updated) {
    throw new NotFoundError(`Job not found: ${jobId}`);
  }

  return updated;
}

/**
 * Cancel a job
 */
export async function cancelJob(jobId: string, orgId: string): Promise<void> {
  const job = await jobsRepo.getJobById(jobId, orgId);

  if (!job) {
    throw new NotFoundError(`Job not found: ${jobId}`);
  }

  if (job.status !== "pending" && job.status !== "processing") {
    throw new BadRequestError(`Cannot cancel job with status: ${job.status}`);
  }

  const cancelled = await jobsRepo.cancelJob(jobId, orgId);

  if (!cancelled) {
    throw new BadRequestError("Failed to cancel job");
  }
}

/**
 * Retry a failed job
 */
export async function retryJob(
  jobId: string,
  orgId: string,
  userId: string
): Promise<ReportJobRow> {
  const originalJob = await jobsRepo.getJobById(jobId, orgId);

  if (!originalJob) {
    throw new NotFoundError(`Job not found: ${jobId}`);
  }

  if (originalJob.status !== "failed") {
    throw new BadRequestError("Can only retry failed jobs");
  }

  // Create a new job with the same parameters
  return jobsRepo.createJob({
    organizationId: orgId,
    templateId: originalJob.templateId,
    scheduledReportId: originalJob.scheduledReportId,
    type: originalJob.type,
    format: originalJob.format,
    status: "pending",
    parameters: originalJob.parameters,
    createdBy: userId,
  });
}

/**
 * Get job history for a scheduled report
 */
export function getJobHistory(
  scheduleId: string,
  params: { page?: number; pageSize?: number; status?: ReportJobStatus }
) {
  return jobsRepo.getJobsBySchedule(scheduleId, params);
}

/**
 * Get job owner ID (for authorization checks)
 */
export async function getJobOwnerId(
  jobId: string,
  orgId: string
): Promise<string | undefined> {
  const job = await jobsRepo.getJobById(jobId, orgId);
  return job?.createdBy;
}
