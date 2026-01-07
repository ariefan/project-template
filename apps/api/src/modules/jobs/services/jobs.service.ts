import { randomBytes } from "node:crypto";
import type { JobMetadata, JobRow, JobStatus } from "@workspace/db/schema";
import type { JobQueue } from "../queue/job-queue";
import * as jobsRepository from "../repositories/jobs.repository";

// Module-level queue reference
let jobQueue: JobQueue | null = null;

/**
 * Initialize the job queue reference
 */
export function initQueue(queue: JobQueue): void {
  jobQueue = queue;
}

/**
 * Get the job queue (throws if not initialized)
 */
export function getQueue(): JobQueue {
  if (!jobQueue) {
    throw new Error("Job queue not initialized. Call initQueue() first.");
  }
  return jobQueue;
}

/**
 * Check if queue is available
 */
export function isQueueEnabled(): boolean {
  return jobQueue !== null;
}

/**
 * Generate a unique job ID
 */
function generateJobId(): string {
  return `job_${randomBytes(12).toString("hex")}`;
}

export interface CreateJobInput {
  orgId: string;
  type: string;
  createdBy: string;
  input?: Record<string, unknown>;
  metadata?: JobMetadata;
  estimatedCompletion?: Date;
}

export interface ListJobsInput {
  page?: number;
  pageSize?: number;
  status?: JobStatus;
  type?: string;
  format?: string;
  templateId?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

/**
 * Create a new job
 */
export async function createJob(input: CreateJobInput): Promise<JobRow> {
  const job = await jobsRepository.createJob({
    id: generateJobId(),
    orgId: input.orgId,
    type: input.type,
    status: "pending",
    createdBy: input.createdBy,
    input: input.input ?? null,
    metadata: input.metadata ?? null,
    estimatedCompletion: input.estimatedCompletion ?? null,
  });

  return job;
}

/**
 * Get a job by ID
 */
export function getJob(orgId: string, jobId: string): Promise<JobRow | null> {
  return jobsRepository.getJobById(orgId, jobId);
}

/**
 * List jobs with pagination and filtering
 */
export function listJobs(
  orgId: string,
  options: ListJobsInput = {}
): Promise<jobsRepository.ListJobsResult> {
  // Cap page size at 100
  const pageSize = Math.min(options.pageSize ?? 50, 100);

  return jobsRepository.listJobs(orgId, {
    ...options,
    pageSize,
  });
}

/**
 * Cancel a job
 * Only pending or processing jobs can be cancelled
 */
export async function cancelJob(
  orgId: string,
  jobId: string
): Promise<{ success: boolean; job?: JobRow; error?: string }> {
  const job = await jobsRepository.getJobById(orgId, jobId);

  if (!job) {
    return { success: false, error: "Job not found" };
  }

  if (job.status !== "pending" && job.status !== "processing") {
    return {
      success: false,
      error: `Cannot cancel job with status: ${job.status}`,
    };
  }

  const updated = await jobsRepository.cancelJob(jobId);

  if (!updated) {
    return { success: false, error: "Failed to cancel job" };
  }

  return { success: true, job: updated };
}

/**
 * Start processing a job
 */
export function startJob(jobId: string): Promise<JobRow | null> {
  return jobsRepository.updateJobStatus(jobId, "processing", {
    startedAt: new Date(),
    progress: 0,
  });
}

/**
 * Update job progress
 */
export function updateProgress(
  jobId: string,
  progress: number,
  message?: string
): Promise<JobRow | null> {
  return jobsRepository.updateJobProgress(jobId, progress, message);
}

/**
 * Complete a job successfully
 */
export function completeJob(
  jobId: string,
  output: Record<string, unknown>
): Promise<JobRow | null> {
  return jobsRepository.completeJob(jobId, output);
}

/**
 * Fail a job with error
 */
export function failJob(
  jobId: string,
  error: { code: string; message: string; retryable?: boolean }
): Promise<JobRow | null> {
  return jobsRepository.failJob(jobId, error);
}

/**
 * Update pg-boss queue job ID
 */
export function updateQueueJobId(
  jobId: string,
  queueJobId: string
): Promise<JobRow | null> {
  return jobsRepository.updateQueueJobId(jobId, queueJobId);
}

/**
 * Update processed items count
 */
export function updateProcessedItems(
  jobId: string,
  processed: number,
  total?: number
): Promise<JobRow | null> {
  return jobsRepository.updateProcessedItems(jobId, processed, total);
}

/**
 * Get a job by ID (internal - no org check, for queue processing)
 */
export function getJobInternal(jobId: string): Promise<JobRow | null> {
  return jobsRepository.getJobByIdInternal(jobId);
}

/**
 * Retry a failed job
 * Creates a new job with the same parameters
 */
export async function retryJob(
  orgId: string,
  jobId: string,
  userId: string
): Promise<{ success: boolean; job?: JobRow; error?: string }> {
  const originalJob = await jobsRepository.getJobById(orgId, jobId);

  if (!originalJob) {
    return { success: false, error: "Job not found" };
  }

  if (originalJob.status !== "failed") {
    return { success: false, error: "Only failed jobs can be retried" };
  }

  // Create new job with same parameters
  const newJob = await createJob({
    orgId,
    type: originalJob.type,
    createdBy: userId,
    input: originalJob.input as Record<string, unknown> | undefined,
    metadata: {
      ...originalJob.metadata,
      parentJobId: originalJob.id,
      retryCount: ((originalJob.metadata?.retryCount ?? 0) as number) + 1,
    },
  });

  return { success: true, job: newJob };
}

/**
 * Get job owner ID (for authorization)
 */
export async function getJobOwnerId(
  orgId: string,
  jobId: string
): Promise<string | null> {
  const job = await jobsRepository.getJobById(orgId, jobId);
  return job?.createdBy ?? null;
}

/**
 * Enqueue a job for processing
 * Sends the job to pg-boss for async processing
 */
export async function enqueueJob(
  jobId: string,
  type: string,
  delay?: number
): Promise<string> {
  const queue = getQueue();
  return await queue.enqueue(jobId, type, delay);
}

/**
 * Create and enqueue a job in one operation
 */
export async function createAndEnqueueJob(
  input: CreateJobInput,
  delay?: number
): Promise<JobRow> {
  const job = await createJob(input);
  await enqueueJob(job.id, input.type, delay);
  return job;
}
