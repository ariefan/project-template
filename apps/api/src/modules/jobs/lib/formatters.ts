import type { JobError, JobResponse, JobStatus } from "@workspace/contracts";
import type { JobRow } from "@workspace/db/schema";

/**
 * Format job for API response
 */
export function formatJobResponse(job: JobRow): JobResponse["data"] {
  return {
    jobId: job.id,
    tenantId: job.orgId,
    type: job.type,
    status: job.status as JobStatus,
    progress: job.progress ?? undefined,
    message: job.message ?? undefined,
    totalItems: job.totalItems ?? undefined,
    processedItems: job.processedItems ?? undefined,
    input: (job.input as Record<string, unknown>) ?? undefined,
    output: (job.output as Record<string, unknown>) ?? undefined,
    metadata: (job.metadata as Record<string, unknown>) ?? undefined,
    error: (job.error as JobError) ?? undefined,
    createdBy: job.createdBy,
    createdAt: job.createdAt.toISOString(),
    startedAt: job.startedAt?.toISOString(),
    completedAt: job.completedAt?.toISOString(),
    estimatedCompletion: job.estimatedCompletion?.toISOString(),
  };
}
