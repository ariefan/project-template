import { randomBytes } from "node:crypto";
import type { JobRow, JobStatus } from "@workspace/db/schema";
import * as jobsRepository from "../repositories/jobs.repository";

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
  estimatedCompletion?: Date;
}

export interface ListJobsInput {
  page?: number;
  pageSize?: number;
  status?: JobStatus;
  type?: string;
  createdAfter?: Date;
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
  result: unknown
): Promise<JobRow | null> {
  return jobsRepository.completeJob(jobId, result);
}

/**
 * Fail a job with error
 */
export function failJob(
  jobId: string,
  errorCode: string,
  errorMessage: string
): Promise<JobRow | null> {
  return jobsRepository.failJob(jobId, errorCode, errorMessage);
}

/**
 * Job processor helpers for use in job handlers
 */
export interface JobHelpers {
  updateProgress: (progress: number, message?: string) => Promise<void>;
  log: (message: string) => Promise<void>;
}

/**
 * Create job helpers for a specific job
 */
export function createJobHelpers(jobId: string): JobHelpers {
  return {
    async updateProgress(progress: number, message?: string) {
      await jobsRepository.updateJobProgress(jobId, progress, message);
    },
    async log(message: string) {
      await jobsRepository.updateJobProgress(
        jobId,
        -1, // Don't update progress, just message
        message
      );
    },
  };
}
