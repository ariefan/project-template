/**
 * Job Service
 *
 * CRUD operations for report jobs
 */

import { nanoid } from "nanoid";
import type { JobError, JobResult, JobStatus, JobType } from "../types";

export interface ReportJob {
  id: string;
  organizationId: string;
  templateId?: string;
  scheduledReportId?: string;
  type: JobType;
  status: JobStatus;
  progress: number;
  totalRows?: number;
  processedRows: number;
  parameters: Record<string, unknown>;
  result?: JobResult;
  error?: JobError;
  queueJobId?: string;
  createdBy: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface CreateJobInput {
  organizationId: string;
  templateId?: string;
  scheduledReportId?: string;
  type: JobType;
  parameters?: Record<string, unknown>;
  createdBy: string;
}

export interface JobFilters {
  templateId?: string;
  scheduledReportId?: string;
  type?: JobType;
  status?: JobStatus;
  createdBy?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface JobServiceDeps {
  db: {
    insert: (data: Omit<ReportJob, "id">) => Promise<ReportJob>;
    findById: (id: string, orgId?: string) => Promise<ReportJob | null>;
    update: (id: string, data: Partial<ReportJob>) => Promise<ReportJob>;
    findMany: (orgId: string, filters?: JobFilters) => Promise<ReportJob[]>;
    delete: (id: string) => Promise<void>;
  };
}

export class JobService {
  private readonly deps: JobServiceDeps;

  constructor(deps: JobServiceDeps) {
    this.deps = deps;
  }

  /**
   * Create a new job
   */
  async createJob(input: CreateJobInput): Promise<ReportJob> {
    const job = await this.deps.db.insert({
      organizationId: input.organizationId,
      templateId: input.templateId,
      scheduledReportId: input.scheduledReportId,
      type: input.type,
      status: "pending",
      progress: 0,
      processedRows: 0,
      parameters: input.parameters ?? {},
      createdBy: input.createdBy,
      createdAt: new Date(),
    });

    return job;
  }

  /**
   * Get a job by ID
   */
  async getJob(
    jobId: string,
    organizationId?: string
  ): Promise<ReportJob | null> {
    return await this.deps.db.findById(jobId, organizationId);
  }

  /**
   * Start a job
   */
  async startJob(jobId: string, queueJobId?: string): Promise<ReportJob> {
    return await this.deps.db.update(jobId, {
      status: "processing",
      startedAt: new Date(),
      queueJobId,
    });
  }

  /**
   * Update job progress
   */
  async updateProgress(
    jobId: string,
    progress: number,
    processedRows: number,
    totalRows?: number
  ): Promise<ReportJob> {
    return await this.deps.db.update(jobId, {
      progress: Math.min(100, Math.max(0, progress)),
      processedRows,
      ...(totalRows && { totalRows }),
    });
  }

  /**
   * Complete a job successfully
   */
  async completeJob(jobId: string, result: JobResult): Promise<ReportJob> {
    return await this.deps.db.update(jobId, {
      status: "completed",
      progress: 100,
      result,
      completedAt: new Date(),
    });
  }

  /**
   * Fail a job
   */
  async failJob(jobId: string, error: JobError): Promise<ReportJob> {
    return await this.deps.db.update(jobId, {
      status: "failed",
      error,
      completedAt: new Date(),
    });
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<ReportJob> {
    const job = await this.getJob(jobId);

    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    if (job.status === "completed" || job.status === "failed") {
      throw new Error(`Cannot cancel job in ${job.status} status`);
    }

    return await this.deps.db.update(jobId, {
      status: "cancelled",
      completedAt: new Date(),
    });
  }

  /**
   * List jobs for an organization
   */
  async listJobs(
    organizationId: string,
    filters?: JobFilters
  ): Promise<ReportJob[]> {
    return await this.deps.db.findMany(organizationId, filters);
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string, createdBy: string): Promise<ReportJob> {
    const originalJob = await this.getJob(jobId);

    if (!originalJob) {
      throw new Error(`Job not found: ${jobId}`);
    }

    if (originalJob.status !== "failed") {
      throw new Error("Can only retry failed jobs");
    }

    // Create a new job with the same parameters
    return await this.createJob({
      organizationId: originalJob.organizationId,
      templateId: originalJob.templateId,
      scheduledReportId: originalJob.scheduledReportId,
      type: originalJob.type,
      parameters: originalJob.parameters,
      createdBy,
    });
  }

  /**
   * Clean up old completed jobs
   */
  async cleanupOldJobs(retentionDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const jobs = await this.deps.db.findMany("", {
      status: "completed",
      createdBefore: cutoffDate,
    });

    for (const job of jobs) {
      await this.deps.db.delete(job.id);
    }

    return jobs.length;
  }

  /**
   * Get job statistics for an organization
   */
  async getJobStats(
    organizationId: string,
    period?: { start: Date; end: Date }
  ): Promise<JobStats> {
    const filters: JobFilters = {};

    if (period) {
      filters.createdAfter = period.start;
      filters.createdBefore = period.end;
    }

    const jobs = await this.listJobs(organizationId, filters);

    return {
      total: jobs.length,
      pending: jobs.filter((j) => j.status === "pending").length,
      processing: jobs.filter((j) => j.status === "processing").length,
      completed: jobs.filter((j) => j.status === "completed").length,
      failed: jobs.filter((j) => j.status === "failed").length,
      cancelled: jobs.filter((j) => j.status === "cancelled").length,
    };
  }
}

export interface JobStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  cancelled: number;
}

/**
 * Generate a job ID
 */
export function generateJobId(): string {
  return `job_${nanoid(12)}`;
}

/**
 * Create a job service instance
 */
export function createJobService(deps: JobServiceDeps): JobService {
  return new JobService(deps);
}
