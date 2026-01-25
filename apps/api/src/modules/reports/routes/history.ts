import type { ErrorResponse, JobListResponse } from "@workspace/contracts";
import type { FastifyInstance } from "fastify";
import { handleError } from "../../../lib/errors";
import { createMeta } from "../../../lib/response";
import { requirePermission } from "../../auth/authorization-middleware";
import { jobsService } from "../../jobs";

export function historyRoutes(app: FastifyInstance) {
  /**
   * GET /:orgId/reports/history - List report jobs for an organization
   */
  app.get<{
    Params: { orgId: string };
    Querystring: {
      page?: number;
      pageSize?: number;
      status?: string;
      createdAfter?: string;
      createdBefore?: string;
    };
  }>(
    "/:orgId/reports/history",
    { preHandler: [requirePermission("reports", "read")] },
    async (request, reply): Promise<JobListResponse | ErrorResponse> => {
      try {
        const { orgId } = request.params;
        const { page, pageSize, status, createdAfter, createdBefore } =
          request.query;

        const result = await jobsService.listJobs(orgId, {
          page: page ? Number(page) : undefined,
          pageSize: pageSize ? Number(pageSize) : undefined,
          // biome-ignore lint/suspicious/noExplicitAny: status filter
          status: status as any,
          type: "report",
          createdAfter: createdAfter ? new Date(createdAfter) : undefined,
          createdBefore: createdBefore ? new Date(createdBefore) : undefined,
        });

        // Map internal JobRow to JobResponse format
        const data = result.data.map((job) => ({
          jobId: job.id,
          tenantId: job.orgId,
          type: job.type,
          // biome-ignore lint/suspicious/noExplicitAny: status conversion
          status: job.status as any,
          progress: job.progress ?? undefined,
          message: job.message ?? undefined,
          totalItems: job.totalItems ?? undefined,
          processedItems: job.processedItems ?? undefined,
          // biome-ignore lint/suspicious/noExplicitAny: complex types
          input: (job.input as any) ?? undefined,
          // biome-ignore lint/suspicious/noExplicitAny: complex types
          output: (job.output as any) ?? undefined,
          // biome-ignore lint/suspicious/noExplicitAny: complex types
          metadata: (job.metadata as any) ?? undefined,
          // biome-ignore lint/suspicious/noExplicitAny: complex types
          error: (job.error as any) ?? undefined,
          createdBy: job.createdBy,
          createdAt: job.createdAt.toISOString(),
          startedAt: job.startedAt?.toISOString(),
          completedAt: job.completedAt?.toISOString(),
          estimatedCompletion: job.estimatedCompletion?.toISOString(),
        }));

        return {
          data,
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
}
