import * as fs from "node:fs/promises";
import * as path from "node:path";
import type {
  ErrorResponse,
  JobError,
  JobListResponse,
  JobResponse,
  JobStatus,
} from "@workspace/contracts";
import type { FastifyInstance } from "fastify";
import { handleError, ValidationError } from "../../../lib/errors";
import { createMeta } from "../../../lib/response";
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

/**
 * Format job for API response
 */
function formatJobResponse(
  job: import("@workspace/db/schema").JobRow
): JobResponse["data"] {
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
    Querystring: {
      page?: number;
      pageSize?: number;
      status?: JobStatus;
      type?: string;
      format?: string;
      templateId?: string;
      createdAfter?: string;
      createdBefore?: string;
    };
  }>(
    "/:orgId/jobs",
    { preHandler: [requireAuth] },
    async (request, reply): Promise<JobListResponse | ErrorResponse> => {
      try {
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
          status: status as import("@workspace/db/schema").JobStatus,
          type,
          format,
          templateId,
          createdAfter: createdAfter ? new Date(createdAfter) : undefined,
          createdBefore: createdBefore ? new Date(createdBefore) : undefined,
        });

        return {
          data: result.data.map(formatJobResponse),
          pagination: result.pagination,
          meta: createMeta(request.id),
        };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  /**
   * GET /:orgId/jobs/:jobId - Get job status
   */
  app.get<{ Params: { orgId: string; jobId: string } }>(
    "/:orgId/jobs/:jobId",
    { preHandler: [requireAuth] },
    async (request, reply): Promise<JobResponse | ErrorResponse> => {
      try {
        const { orgId, jobId } = request.params;

        const job = await jobsService.getJob(orgId, jobId);

        if (!job) {
          throw new ValidationError("Job not found"); // Will be caught and mapped to 404/400
        }

        return {
          data: formatJobResponse(job),
          meta: createMeta(request.id),
        };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        // Special case for not found in this service
        if (response.error.message === "Job not found") {
          reply.status(404);
          return {
            error: {
              code: "notFound",
              message: "Job not found",
              requestId: request.id,
            },
          };
        }
        reply.status(statusCode);
        return response;
      }
    }
  );

  /**
   * POST /:orgId/jobs/:jobId/cancel - Cancel a job
   */
  app.post<{ Params: { orgId: string; jobId: string } }>(
    "/:orgId/jobs/:jobId/cancel",
    { preHandler: [requireAuth] },
    async (request, reply): Promise<JobResponse | ErrorResponse> => {
      try {
        const { orgId, jobId } = request.params;

        const result = await jobsService.cancelJob(orgId, jobId);

        if (!result.job) {
          throw new ValidationError(result.error ?? "Cancel failed");
        }

        return {
          data: formatJobResponse(result.job),
          meta: createMeta(request.id),
        };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  /**
   * POST /:orgId/jobs/:jobId/retry - Retry a failed job
   */
  app.post<{ Params: { orgId: string; jobId: string } }>(
    "/:orgId/jobs/:jobId/retry",
    { preHandler: [requireAuth] },
    async (request, reply): Promise<JobResponse | ErrorResponse> => {
      try {
        const { orgId, jobId } = request.params;
        const userId = request.user?.id;

        if (!userId) {
          throw new ValidationError("User not authenticated");
        }

        const result = await jobsService.retryJob(orgId, jobId, userId);

        if (!result.job) {
          throw new ValidationError(result.error ?? "Retry failed");
        }

        return {
          data: formatJobResponse(result.job),
          meta: createMeta(request.id),
        };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  /**
   * GET /:orgId/jobs/:jobId/download - Download job result file
   */
  app.get<{ Params: { orgId: string; jobId: string } }>(
    "/:orgId/jobs/:jobId/download",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const { orgId, jobId } = request.params;

        const job = await jobsService.getJob(orgId, jobId);

        if (!job) {
          throw new ValidationError("Job not found");
        }

        if (job.status !== "completed") {
          throw new ValidationError("Job is not completed");
        }

        const output = job.output as {
          filePath?: string;
          mimeType?: string;
        } | null;
        const filePath = output?.filePath;

        if (!filePath) {
          throw new ValidationError("No file available for download");
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
          throw new ValidationError("File not found on server");
        }
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        if (response.error.message === "Job not found") {
          reply.status(404);
          return {
            error: {
              code: "notFound",
              message: "Job not found",
              requestId: request.id,
            },
          };
        }
        reply.status(statusCode);
        return response;
      }
    }
  );
}
