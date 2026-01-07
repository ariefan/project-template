import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { JobStatus } from "@workspace/db/schema";
import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../auth/middleware";
import * as jobsService from "../services/jobs.service";

// MIME type mapping for file downloads
const MIME_TYPES: Record<string, string> = {
  csv: "text/csv",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
  thermal: "application/octet-stream",
  dotmatrix: "text/plain",
};

interface JobParams {
  orgId: string;
  jobId: string;
}

interface ListJobsQuery {
  page?: number;
  pageSize?: number;
  status?: JobStatus;
  type?: string;
  format?: string;
  templateId?: string;
  createdAfter?: string;
  createdBefore?: string;
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
    const {
      page,
      pageSize,
      status,
      type,
      format,
      templateId,
      createdAfter,
      createdBefore,
    } = request.query;

    const result = await jobsService.listJobs(orgId, {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      status,
      type,
      format,
      templateId,
      createdAfter: createdAfter ? new Date(createdAfter) : undefined,
      createdBefore: createdBefore ? new Date(createdBefore) : undefined,
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

  /**
   * POST /:orgId/jobs/:jobId/retry - Retry a failed job
   */
  app.post<{ Params: JobParams }>(
    "/:orgId/jobs/:jobId/retry",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { orgId, jobId } = request.params;
      const userId = request.user?.id;

      if (!userId) {
        return reply.status(401).send({
          error: {
            code: "unauthorized",
            message: "User not authenticated",
            requestId: request.id,
          },
        });
      }

      const result = await jobsService.retryJob(orgId, jobId, userId);

      if (!result.job) {
        const statusCode = result.error === "Job not found" ? 404 : 400;
        return reply.status(statusCode).send({
          error: {
            code: statusCode === 404 ? "notFound" : "badRequest",
            message: result.error ?? "Retry failed",
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

  /**
   * GET /:orgId/jobs/:jobId/download - Download job result file
   */
  app.get<{ Params: JobParams }>(
    "/:orgId/jobs/:jobId/download",
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

      if (job.status !== "completed") {
        return reply.status(400).send({
          error: {
            code: "badRequest",
            message: "Job is not completed",
            requestId: request.id,
          },
        });
      }

      const output = job.output as {
        filePath?: string;
        mimeType?: string;
      } | null;
      const filePath = output?.filePath;

      if (!filePath) {
        return reply.status(404).send({
          error: {
            code: "notFound",
            message: "No file available for download",
            requestId: request.id,
          },
        });
      }

      try {
        const fileBuffer = await fs.readFile(filePath);
        const fileName = path.basename(filePath);
        const mimeType =
          output?.mimeType ??
          MIME_TYPES[path.extname(fileName).slice(1)] ??
          "application/octet-stream";

        return reply
          .header("Content-Type", mimeType)
          .header("Content-Disposition", `attachment; filename="${fileName}"`)
          .send(fileBuffer);
      } catch {
        return reply.status(404).send({
          error: {
            code: "notFound",
            message: "File not found on server",
            requestId: request.id,
          },
        });
      }
    }
  );
}

/**
 * Format job for API response
 */
function formatJobResponse(job: import("@workspace/db/schema").JobRow) {
  return {
    jobId: job.id,
    tenantId: job.orgId,
    type: job.type,
    status: job.status,
    progress: job.progress ?? undefined,
    message: job.message ?? undefined,
    totalItems: job.totalItems ?? undefined,
    processedItems: job.processedItems ?? undefined,
    input: job.input ?? undefined,
    output: job.output ?? undefined,
    metadata: job.metadata ?? undefined,
    error: job.error ?? undefined,
    createdBy: job.createdBy,
    createdAt: job.createdAt.toISOString(),
    startedAt: job.startedAt?.toISOString(),
    completedAt: job.completedAt?.toISOString(),
    estimatedCompletion: job.estimatedCompletion?.toISOString(),
  };
}
