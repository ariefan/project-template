import type {
  ErrorResponse,
  ReportFormat,
  ReportJobListResponse,
  ReportJobResponse,
  ReportJobStatus,
  ReportJobType,
} from "@workspace/contracts";
import type { FastifyInstance } from "fastify";
import {
  handleError,
  NotFoundError,
  ValidationError,
} from "../../../lib/errors";
import { createMeta } from "../../../lib/response";
import {
  requireOwnershipOrPermission,
  requirePermission,
} from "../../auth/authorization-middleware";
import * as jobsService from "../services/jobs.service";

function mapJobToResponse(job: Awaited<ReturnType<typeof jobsService.getJob>>) {
  return {
    id: job.id,
    orgId: job.organizationId,
    templateId: job.templateId ?? undefined,
    scheduledReportId: job.scheduledReportId ?? undefined,
    type: job.type,
    status: job.status,
    format: job.format,
    progress: job.progress ?? undefined,
    totalRows: job.totalRows ?? undefined,
    processedRows: job.processedRows ?? undefined,
    parameters: job.parameters ?? undefined,
    result: job.result ?? undefined,
    error: job.error ?? undefined,
    queueJobId: job.queueJobId ?? undefined,
    createdBy: job.createdBy,
    createdAt: job.createdAt.toISOString(),
    startedAt: job.startedAt?.toISOString(),
    completedAt: job.completedAt?.toISOString(),
    estimatedCompletion: job.estimatedCompletion?.toISOString(),
  };
}

export function jobsRoutes(app: FastifyInstance) {
  // List jobs
  app.get<{
    Params: { orgId: string };
    Querystring: {
      page?: number;
      pageSize?: number;
      orderBy?: string;
      templateId?: string;
      scheduledReportId?: string;
      type?: ReportJobType;
      status?: ReportJobStatus;
      format?: ReportFormat;
      createdAfter?: string;
      createdBefore?: string;
    };
  }>(
    "/:orgId/reports/jobs",
    { preHandler: [requirePermission("reports", "read")] },
    async (request, reply): Promise<ReportJobListResponse | ErrorResponse> => {
      try {
        const { orgId } = request.params;
        const page = Number(request.query.page) || 1;
        const pageSize = Math.min(Number(request.query.pageSize) || 50, 100);

        const result = await jobsService.listJobs(orgId, {
          page,
          pageSize,
          orderBy: request.query.orderBy,
          templateId: request.query.templateId,
          scheduledReportId: request.query.scheduledReportId,
          type: request.query.type,
          status: request.query.status,
          format: request.query.format,
          createdAfter: request.query.createdAfter
            ? new Date(request.query.createdAfter)
            : undefined,
          createdBefore: request.query.createdBefore
            ? new Date(request.query.createdBefore)
            : undefined,
        });

        return {
          data: result.jobs.map(mapJobToResponse),
          pagination: {
            page: result.page,
            pageSize: result.pageSize,
            totalCount: result.totalCount,
            totalPages: result.totalPages,
            hasNext: result.hasNext,
            hasPrevious: result.hasPrevious,
          },
          meta: createMeta(request.id),
        };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  // Get job by ID
  app.get<{
    Params: { orgId: string; jobId: string };
  }>(
    "/:orgId/reports/jobs/:jobId",
    { preHandler: [requirePermission("reports", "read")] },
    async (request, reply): Promise<ReportJobResponse | ErrorResponse> => {
      try {
        const { orgId, jobId } = request.params;

        const job = await jobsService.getJob(jobId, orgId);

        return {
          data: mapJobToResponse(job),
          meta: createMeta(request.id),
        };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  // Cancel job
  app.delete<{
    Params: { orgId: string; jobId: string };
  }>(
    "/:orgId/reports/jobs/:jobId",
    {
      preHandler: [
        requireOwnershipOrPermission("reports", "delete", (request) => {
          const { jobId, orgId } = request.params as {
            jobId: string;
            orgId: string;
          };
          return jobsService.getJobOwnerId(jobId, orgId);
        }),
      ],
    },
    async (request, reply): Promise<undefined | ErrorResponse> => {
      try {
        const { orgId, jobId } = request.params;

        await jobsService.cancelJob(jobId, orgId);

        reply.status(204);
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  // Retry failed job
  app.post<{
    Params: { orgId: string; jobId: string };
  }>(
    "/:orgId/reports/jobs/:jobId/retry",
    {
      preHandler: [
        requireOwnershipOrPermission("reports", "create", (request) => {
          const { jobId, orgId } = request.params as {
            jobId: string;
            orgId: string;
          };
          return jobsService.getJobOwnerId(jobId, orgId);
        }),
      ],
    },
    async (request, reply): Promise<ReportJobResponse | ErrorResponse> => {
      try {
        const { orgId, jobId } = request.params;
        const userId = request.user?.id;

        if (!userId) {
          throw new ValidationError("User not authenticated");
        }

        const newJob = await jobsService.retryJob(jobId, orgId, userId);

        return {
          data: mapJobToResponse(newJob),
          meta: createMeta(request.id),
        };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  // Download job result
  app.get<{
    Params: { orgId: string; jobId: string };
  }>(
    "/:orgId/reports/jobs/:jobId/download",
    { preHandler: [requirePermission("reports", "read")] },
    async (request, reply): Promise<undefined | ErrorResponse> => {
      try {
        const { orgId, jobId } = request.params;

        const job = await jobsService.getJob(jobId, orgId);

        if (job.status !== "completed") {
          throw new ValidationError("Job is not completed yet");
        }

        if (!job.result?.filePath) {
          throw new NotFoundError("Job result file not found");
        }

        const mimeType = job.result.mimeType ?? "application/octet-stream";
        const extensions: Record<string, string> = {
          csv: "csv",
          excel: "xlsx",
          pdf: "pdf",
          thermal: "bin",
          dotmatrix: "txt",
        };
        const extension = extensions[job.format] ?? "bin";
        const filename = `report-${job.id}.${extension}`;

        // Read file from storage
        const fs = await import("node:fs/promises");
        const fileBuffer = await fs.readFile(job.result.filePath);

        reply.header("Content-Type", mimeType);
        reply.header(
          "Content-Disposition",
          `attachment; filename="${filename}"`
        );
        reply.header("Content-Length", fileBuffer.length);

        reply.send(fileBuffer);
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );
}
