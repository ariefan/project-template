import type { JobStatus } from "@workspace/db/schema";
import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../auth/middleware";
import * as jobsService from "../services/jobs.service";

interface JobParams {
  orgId: string;
  jobId: string;
}

interface ListJobsQuery {
  page?: number;
  pageSize?: number;
  status?: JobStatus;
  type?: string;
  createdAfter?: string;
}

/**
 * Jobs routes
 * Provides endpoints for listing and managing async jobs
 */
export function jobsRoutes(app: FastifyInstance) {
  /**
   * GET /:orgId/jobs - List jobs
   */
  app.get<{
    Params: { orgId: string };
    Querystring: ListJobsQuery;
  }>("/:orgId/jobs", { preHandler: [requireAuth] }, async (request, reply) => {
    const { orgId } = request.params;
    const { page, pageSize, status, type, createdAfter } = request.query;

    const result = await jobsService.listJobs(orgId, {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      status,
      type,
      createdAfter: createdAfter ? new Date(createdAfter) : undefined,
    });

    return reply.status(200).send({
      data: result.data.map(formatJobResponse),
      pagination: result.pagination,
      meta: {
        requestId: request.id,
        timestamp: new Date().toISOString(),
      },
    });
  });

  /**
   * GET /:orgId/jobs/:jobId - Get job status
   */
  app.get<{ Params: JobParams }>(
    "/:orgId/jobs/:jobId",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { orgId, jobId } = request.params;

      const job = await jobsService.getJob(orgId, jobId);

      if (!job) {
        return reply.status(404).send({
          error: {
            code: "notFound",
            message: "Job not found",
            requestId: request.id,
          },
        });
      }

      return reply.status(200).send({
        data: formatJobResponse(job),
        meta: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
        },
      });
    }
  );

  /**
   * POST /:orgId/jobs/:jobId/cancel - Cancel a job
   */
  app.post<{ Params: JobParams }>(
    "/:orgId/jobs/:jobId/cancel",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { orgId, jobId } = request.params;

      const result = await jobsService.cancelJob(orgId, jobId);

      if (!result.job) {
        const statusCode = result.error === "Job not found" ? 404 : 400;
        return reply.status(statusCode).send({
          error: {
            code: statusCode === 404 ? "notFound" : "badRequest",
            message: result.error ?? "Cancel failed",
            requestId: request.id,
          },
        });
      }

      return reply.status(200).send({
        data: formatJobResponse(result.job),
        meta: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
        },
      });
    }
  );
}

/**
 * Format job for API response
 */
function formatJobResponse(job: {
  id: string;
  orgId: string;
  type: string;
  status: string;
  progress: number | null;
  message: string | null;
  result: unknown;
  errorCode: string | null;
  errorMessage: string | null;
  createdBy: string;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  estimatedCompletion: Date | null;
}) {
  return {
    jobId: job.id,
    tenantId: job.orgId,
    type: job.type,
    status: job.status,
    progress: job.progress,
    message: job.message,
    result: job.result,
    error:
      job.errorCode || job.errorMessage
        ? { code: job.errorCode, message: job.errorMessage }
        : undefined,
    createdBy: job.createdBy,
    createdAt: job.createdAt.toISOString(),
    startedAt: job.startedAt?.toISOString(),
    completedAt: job.completedAt?.toISOString(),
    estimatedCompletion: job.estimatedCompletion?.toISOString(),
  };
}
