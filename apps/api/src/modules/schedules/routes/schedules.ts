import type {
  CreateScheduledJobRequest,
  ErrorResponse,
  JobResponse,
  JobStatus,
  ScheduledJobHistoryResponse,
  ScheduledJobListResponse,
  ScheduledJobResponse,
} from "@workspace/contracts";
import {
  zCreateScheduledJobRequest,
  zUpdateScheduledJobRequest,
} from "@workspace/contracts/zod";
import type { FastifyInstance } from "fastify";
import { handleError, ValidationError } from "../../../lib/errors";
import { createMeta } from "../../../lib/response";
import {
  requireOwnershipOrPermission,
  requirePermission,
} from "../../auth/authorization-middleware";
import * as jobsService from "../../jobs/services/jobs.service";
import * as schedulesService from "../services/schedules.service";

/**
 * Format scheduled job for API response
 */
function formatScheduledJobResponse(
  schedule: import("@workspace/db/schema").ScheduledJobRow
): ScheduledJobResponse["data"] {
  return {
    id: schedule.id,
    orgId: schedule.organizationId,
    jobType: schedule.jobType,
    jobConfig: (schedule.jobConfig as Record<string, unknown>) ?? undefined,
    name: schedule.name,
    description: schedule.description ?? undefined,
    frequency: schedule.frequency as any,
    cronExpression: schedule.cronExpression ?? undefined,
    dayOfWeek: schedule.dayOfWeek ?? undefined,
    dayOfMonth: schedule.dayOfMonth ?? undefined,
    hour: schedule.hour ?? undefined,
    minute: schedule.minute ?? undefined,
    timezone: schedule.timezone,
    startDate: schedule.startDate.toISOString(),
    endDate: schedule.endDate?.toISOString(),
    deliveryMethod: schedule.deliveryMethod as any,
    deliveryConfig:
      (schedule.deliveryConfig as Record<string, unknown>) ?? undefined,
    isActive: schedule.isActive,
    lastRunAt: schedule.lastRunAt?.toISOString(),
    nextRunAt: schedule.nextRunAt?.toISOString(),
    failureCount: schedule.failureCount,
    lastJobId: schedule.lastJobId ?? undefined,
    createdBy: schedule.createdBy,
    createdAt: schedule.createdAt.toISOString(),
    updatedAt: schedule.updatedAt.toISOString(),
    deletedAt: schedule.deletedAt?.toISOString(),
  };
}

/**
 * Scheduled Jobs routes
 * Generic job scheduling system for any job type
 */
export function schedulesRoutes(app: FastifyInstance) {
  /**
   * GET /:orgId/schedules - List scheduled jobs
   */
  app.get<{
    Params: { orgId: string };
    Querystring: {
      page?: number;
      pageSize?: number;
      orderBy?: string;
      jobType?: string;
      frequency?: string;
      deliveryMethod?: string;
      isActive?: boolean;
      search?: string;
    };
  }>(
    "/:orgId/schedules",
    { preHandler: [requirePermission("schedules", "read")] },
    async (
      request,
      reply
    ): Promise<ScheduledJobListResponse | ErrorResponse> => {
      try {
        const { orgId } = request.params;
        const {
          page,
          pageSize,
          orderBy,
          jobType,
          frequency,
          deliveryMethod,
          isActive,
          search,
        } = request.query;

        const result = await schedulesService.listSchedules(orgId, {
          page: page ? Number(page) : undefined,
          pageSize: pageSize ? Number(pageSize) : undefined,
          orderBy,
          jobType,
          frequency: frequency as any,
          deliveryMethod: deliveryMethod as any,
          isActive,
          search,
        });

        return {
          data: result.data.map(formatScheduledJobResponse),
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
   * POST /:orgId/schedules - Create a scheduled job
   */
  app.post<{
    Params: { orgId: string };
    Body: CreateScheduledJobRequest;
  }>(
    "/:orgId/schedules",
    { preHandler: [requirePermission("schedules", "create")] },
    async (request, reply) => {
      try {
        const { orgId } = request.params;
        const userId = request.user?.id;

        if (!userId) {
          throw new ValidationError("User not authenticated");
        }

        // Validate request body
        const validatedBody = zCreateScheduledJobRequest.parse(request.body);

        // Create schedule
        const schedule = await schedulesService.createSchedule(orgId, userId, {
          ...validatedBody,
          startDate: validatedBody.startDate
            ? new Date(validatedBody.startDate)
            : undefined,
          endDate: validatedBody.endDate
            ? new Date(validatedBody.endDate)
            : undefined,
        });

        reply.status(201);
        reply.header("Location", `/v1/orgs/${orgId}/schedules/${schedule.id}`);

        return {
          data: formatScheduledJobResponse(schedule),
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
   * GET /:orgId/schedules/:scheduleId - Get a scheduled job
   */
  app.get<{ Params: { orgId: string; scheduleId: string } }>(
    "/:orgId/schedules/:scheduleId",
    { preHandler: [requirePermission("schedules", "read")] },
    async (request, reply): Promise<ScheduledJobResponse | ErrorResponse> => {
      try {
        const { orgId, scheduleId } = request.params;

        const schedule = await schedulesService.getSchedule(scheduleId, orgId);

        return {
          data: formatScheduledJobResponse(schedule),
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
   * PATCH /:orgId/schedules/:scheduleId - Update a scheduled job
   */
  app.patch<{
    Params: { orgId: string; scheduleId: string };
    Body: CreateScheduledJobRequest;
  }>(
    "/:orgId/schedules/:scheduleId",
    {
      preHandler: [
        requireOwnershipOrPermission("schedules", "update", (request) => {
          const { scheduleId, orgId } = request.params as {
            scheduleId: string;
            orgId: string;
          };
          return schedulesService.getScheduleOwnerId(scheduleId, orgId);
        }),
      ],
    },
    async (request, reply): Promise<ScheduledJobResponse | ErrorResponse> => {
      try {
        const { orgId, scheduleId } = request.params;

        // Validate request body
        const validatedBody = zUpdateScheduledJobRequest.parse(request.body);

        const updateData: Parameters<
          typeof schedulesService.updateSchedule
        >[2] = {
          ...validatedBody,
          startDate: validatedBody.startDate
            ? new Date(validatedBody.startDate)
            : undefined,
          endDate: validatedBody.endDate
            ? new Date(validatedBody.endDate)
            : undefined,
        };

        const schedule = await schedulesService.updateSchedule(
          scheduleId,
          orgId,
          updateData
        );

        return {
          data: formatScheduledJobResponse(schedule),
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
   * DELETE /:orgId/schedules/:scheduleId - Delete a scheduled job
   */
  app.delete<{ Params: { orgId: string; scheduleId: string } }>(
    "/:orgId/schedules/:scheduleId",
    {
      preHandler: [
        requireOwnershipOrPermission("schedules", "delete", (request) => {
          const { scheduleId, orgId } = request.params as {
            scheduleId: string;
            orgId: string;
          };
          return schedulesService.getScheduleOwnerId(scheduleId, orgId);
        }),
      ],
    },
    async (request, reply): Promise<ScheduledJobResponse | ErrorResponse> => {
      try {
        const { orgId, scheduleId } = request.params;
        const userId = request.user?.id;

        if (!userId) {
          throw new ValidationError("User not authenticated");
        }

        await schedulesService.deleteSchedule(scheduleId, orgId);

        return {
          data: {
            id: scheduleId,
            deletedAt: new Date().toISOString(),
            deletedBy: userId,
            canRestore: true,
          },
          meta: createMeta(request.id),
        } as any;
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  /**
   * POST /:orgId/schedules/:scheduleId/run - Run a scheduled job immediately
   */
  app.post<{ Params: { orgId: string; scheduleId: string } }>(
    "/:orgId/schedules/:scheduleId/run",
    { preHandler: [requirePermission("schedules", "update")] },
    async (request, reply): Promise<JobResponse | ErrorResponse> => {
      try {
        const { orgId, scheduleId } = request.params;
        const userId = request.user?.id;

        if (!userId) {
          throw new ValidationError("User not authenticated");
        }

        const { jobId } = await schedulesService.runScheduleNow(
          scheduleId,
          orgId,
          userId
        );

        const job = await jobsService.getJob(orgId, jobId);

        if (!job) {
          reply.status(404);
          return {
            error: {
              code: "notFound",
              message: "Job not found",
              requestId: request.id,
            },
          } as ErrorResponse;
        }

        return {
          data: {
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
            error: (job.error as any) ?? undefined,
            createdBy: job.createdBy,
            createdAt: job.createdAt.toISOString(),
            startedAt: job.startedAt?.toISOString(),
            completedAt: job.completedAt?.toISOString(),
            estimatedCompletion: job.estimatedCompletion?.toISOString(),
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

  /**
   * POST /:orgId/schedules/:scheduleId/pause - Pause a scheduled job
   */
  app.post<{ Params: { orgId: string; scheduleId: string } }>(
    "/:orgId/schedules/:scheduleId/pause",
    { preHandler: [requirePermission("schedules", "update")] },
    async (request, reply): Promise<ScheduledJobResponse | ErrorResponse> => {
      try {
        const { orgId, scheduleId } = request.params;

        const schedule = await schedulesService.pauseSchedule(
          scheduleId,
          orgId
        );

        return {
          data: formatScheduledJobResponse(schedule),
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
   * POST /:orgId/schedules/:scheduleId/resume - Resume a paused scheduled job
   */
  app.post<{ Params: { orgId: string; scheduleId: string } }>(
    "/:orgId/schedules/:scheduleId/resume",
    { preHandler: [requirePermission("schedules", "update")] },
    async (request, reply): Promise<ScheduledJobResponse | ErrorResponse> => {
      try {
        const { orgId, scheduleId } = request.params;

        const schedule = await schedulesService.resumeSchedule(
          scheduleId,
          orgId
        );

        return {
          data: formatScheduledJobResponse(schedule),
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
   * GET /:orgId/schedules/:scheduleId/history - Get run history
   */
  app.get<{
    Params: { orgId: string; scheduleId: string };
    Querystring: { limit?: number };
  }>(
    "/:orgId/schedules/:scheduleId/history",
    { preHandler: [requirePermission("schedules", "read")] },
    async (
      request,
      reply
    ): Promise<ScheduledJobHistoryResponse | ErrorResponse> => {
      try {
        const { orgId, scheduleId } = request.params;
        const limit = Number(request.query.limit ?? 10);

        // Get the schedule to check lastJobId
        const schedule = await schedulesService.getSchedule(scheduleId, orgId);

        // Get jobs for this schedule
        const jobs = await jobsService.listJobs(orgId, {
          pageSize: limit,
          // Filter by metadata.scheduleId = scheduleId
          // Note: This would require a JSON query on metadata
        });

        // For now, return the filtered jobs
        const filteredJobs = (jobs.data as any[]).filter(
          (job: any) =>
            job.metadata?.scheduleId === scheduleId ||
            job.id === schedule.lastJobId
        );

        return {
          data: {
            scheduleId,
            jobs: filteredJobs.map((job: any) => ({
              jobId: job.id,
              status: job.status,
              createdAt: job.createdAt,
              completedAt: job.completedAt,
              success: job.status === "completed",
              error: job.error?.message,
            })),
          },
          meta: createMeta(request.id),
        } as ScheduledJobHistoryResponse;
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );
}
