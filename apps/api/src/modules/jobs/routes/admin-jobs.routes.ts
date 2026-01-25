import type {
  ErrorResponse,
  JobListResponse,
  JobsListData,
} from "@workspace/contracts";
import { SystemRoles } from "@workspace/db/schema";
import type { FastifyInstance } from "fastify";
import { handleError } from "../../../lib/errors";
import { createMeta } from "../../../lib/response";
import { requireAuth } from "../../auth/middleware";
import * as schedulesService from "../../schedules/services/schedules.service";
import { formatJobResponse } from "../lib/formatters";
import * as jobsService from "../services/jobs.service";

/**
 * Administrative Jobs Routes
 */
export function adminJobsRoutes(app: FastifyInstance) {
  console.log("🛠️ Registering Admin Jobs Routes...");

  app.addHook("preHandler", async (request, reply) => {
    await requireAuth(request, reply);
    if (reply.sent) {
      return;
    }

    // Use assertion or check since base user type might not have role
    // biome-ignore lint/suspicious/noExplicitAny: user role extension
    const userRole = (request.user as any)?.role;
    if (
      userRole !== SystemRoles.SUPER_ADMIN &&
      userRole !== SystemRoles.SUPPORT
    ) {
      reply.status(403).send({
        error: {
          code: "forbidden",
          message: "Administrative access required",
          requestId: request.id,
        },
      });
    }
  });

  app.get<{ Querystring: NonNullable<JobsListData["query"]> }>(
    "/admin/system/jobs",
    async (request, reply): Promise<JobListResponse | ErrorResponse> => {
      try {
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

        const result = await jobsService.listJobs(null, {
          page: page ? Number(page) : undefined,
          pageSize: pageSize ? Number(pageSize) : undefined,
          // biome-ignore lint/suspicious/noExplicitAny: enum conversion
          status: status as any,
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
   * GET /admin/system/schedules - List ALL schedules globally
   */
  app.get("/admin/system/schedules", async (request, reply) => {
    try {
      const result = await schedulesService.listSchedules(
        null,
        // biome-ignore lint/suspicious/noExplicitAny: query typing
        request.query as any
      );
      return {
        data: result.data,
        pagination: result.pagination,
        meta: createMeta(request.id),
      };
    } catch (error) {
      const { statusCode, response } = handleError(error, request.id);
      reply.status(statusCode);
      return response;
    }
  });
}
