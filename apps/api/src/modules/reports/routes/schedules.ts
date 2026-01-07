import type {
  CreateScheduledReportRequest,
  DeliveryMethod,
  ErrorResponse,
  ScheduledReportListResponse,
  ScheduledReportResponse,
  ScheduleFrequency,
  SoftDeleteResponse,
  UpdateScheduledReportRequest,
} from "@workspace/contracts";
import {
  zCreateScheduledReportRequest,
  zUpdateScheduledReportRequest,
} from "@workspace/contracts/zod";
import type { FastifyInstance } from "fastify";
import { handleError, ValidationError } from "../../../lib/errors";
import { createMeta } from "../../../lib/response";
import {
  requireOwnershipOrPermission,
  requirePermission,
} from "../../auth/authorization-middleware";
import { jobsService } from "../../jobs";
import * as schedulesService from "../services/schedules.service";

function mapScheduleToResponse(
  schedule: Awaited<ReturnType<typeof schedulesService.getSchedule>>
) {
  return {
    id: schedule.id,
    orgId: schedule.organizationId,
    templateId: schedule.templateId,
    name: schedule.name,
    description: schedule.description ?? undefined,
    frequency: schedule.frequency,
    cronExpression: schedule.cronExpression ?? undefined,
    dayOfWeek: schedule.dayOfWeek ?? undefined,
    dayOfMonth: schedule.dayOfMonth ?? undefined,
    hour: schedule.hour ?? undefined,
    minute: schedule.minute ?? undefined,
    timezone: schedule.timezone,
    startDate: schedule.startDate.toISOString(),
    endDate: schedule.endDate?.toISOString(),
    deliveryMethod: schedule.deliveryMethod,
    deliveryConfig: schedule.deliveryConfig ?? undefined,
    parameters: schedule.parameters ?? undefined,
    isActive: schedule.isActive,
    lastRunAt: schedule.lastRunAt?.toISOString(),
    nextRunAt: schedule.nextRunAt?.toISOString(),
    failureCount: schedule.failureCount,
    createdBy: schedule.createdBy,
    createdAt: schedule.createdAt.toISOString(),
    updatedAt: schedule.updatedAt.toISOString(),
    deletedAt: schedule.deletedAt?.toISOString(),
  };
}

export function schedulesRoutes(app: FastifyInstance) {
  // List schedules
  app.get<{
    Params: { orgId: string };
    Querystring: {
      page?: number;
      pageSize?: number;
      orderBy?: string;
      templateId?: string;
      frequency?: ScheduleFrequency;
      deliveryMethod?: DeliveryMethod;
      isActive?: boolean;
      search?: string;
    };
  }>(
    "/:orgId/reports/schedules",
    { preHandler: [requirePermission("reports", "read")] },
    async (
      request,
      reply
    ): Promise<ScheduledReportListResponse | ErrorResponse> => {
      try {
        const { orgId } = request.params;
        const page = Number(request.query.page) || 1;
        const pageSize = Math.min(Number(request.query.pageSize) || 50, 100);

        const result = await schedulesService.listSchedules(orgId, {
          page,
          pageSize,
          orderBy: request.query.orderBy,
          templateId: request.query.templateId,
          frequency: request.query.frequency,
          deliveryMethod: request.query.deliveryMethod,
          isActive: request.query.isActive,
          search: request.query.search,
        });

        return {
          data: result.schedules.map(mapScheduleToResponse),
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

  // Get schedule by ID
  app.get<{
    Params: { orgId: string; scheduleId: string };
  }>(
    "/:orgId/reports/schedules/:scheduleId",
    { preHandler: [requirePermission("reports", "read")] },
    async (
      request,
      reply
    ): Promise<ScheduledReportResponse | ErrorResponse> => {
      try {
        const { orgId, scheduleId } = request.params;

        const schedule = await schedulesService.getSchedule(scheduleId, orgId);

        return {
          data: mapScheduleToResponse(schedule),
          meta: createMeta(request.id),
        };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  // Create schedule
  app.post<{
    Params: { orgId: string };
    Body: CreateScheduledReportRequest;
  }>(
    "/:orgId/reports/schedules",
    { preHandler: [requirePermission("reports", "create")] },
    async (
      request,
      reply
    ): Promise<ScheduledReportResponse | ErrorResponse> => {
      try {
        const { orgId } = request.params;
        const userId = request.user?.id;

        if (!userId) {
          throw new ValidationError("User not authenticated");
        }

        const validatedBody = zCreateScheduledReportRequest.parse(request.body);

        if (!validatedBody.startDate) {
          throw new ValidationError("startDate is required");
        }

        if (!validatedBody.deliveryMethod) {
          throw new ValidationError("deliveryMethod is required");
        }

        const schedule = await schedulesService.createSchedule(orgId, userId, {
          templateId: validatedBody.templateId,
          name: validatedBody.name,
          description: validatedBody.description,
          frequency: validatedBody.frequency,
          cronExpression: validatedBody.cronExpression,
          dayOfWeek: validatedBody.dayOfWeek,
          dayOfMonth: validatedBody.dayOfMonth,
          hour: validatedBody.hour,
          minute: validatedBody.minute,
          timezone: validatedBody.timezone,
          startDate: new Date(validatedBody.startDate),
          endDate: validatedBody.endDate
            ? new Date(validatedBody.endDate)
            : undefined,
          deliveryMethod: validatedBody.deliveryMethod,
          deliveryConfig:
            validatedBody.deliveryConfig as schedulesService.CreateScheduleInput["deliveryConfig"],
          parameters: validatedBody.parameters,
          isActive: validatedBody.isActive,
        });

        reply.status(201);
        reply.header(
          "Location",
          `/v1/orgs/${orgId}/reports/schedules/${schedule.id}`
        );

        return {
          data: mapScheduleToResponse(schedule),
          meta: createMeta(request.id),
        };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  // Update schedule
  app.patch<{
    Params: { orgId: string; scheduleId: string };
    Body: UpdateScheduledReportRequest;
  }>(
    "/:orgId/reports/schedules/:scheduleId",
    {
      preHandler: [
        requireOwnershipOrPermission("reports", "update", (request) => {
          const { scheduleId, orgId } = request.params as {
            scheduleId: string;
            orgId: string;
          };
          return schedulesService.getScheduleOwnerId(scheduleId, orgId);
        }),
      ],
    },
    async (
      request,
      reply
    ): Promise<ScheduledReportResponse | ErrorResponse> => {
      try {
        const { orgId, scheduleId } = request.params;

        const validatedBody = zUpdateScheduledReportRequest.parse(request.body);

        const schedule = await schedulesService.updateSchedule(
          scheduleId,
          orgId,
          {
            name: validatedBody.name,
            description: validatedBody.description,
            frequency: validatedBody.frequency,
            cronExpression: validatedBody.cronExpression,
            dayOfWeek: validatedBody.dayOfWeek,
            dayOfMonth: validatedBody.dayOfMonth,
            hour: validatedBody.hour,
            minute: validatedBody.minute,
            timezone: validatedBody.timezone,
            startDate: validatedBody.startDate
              ? new Date(validatedBody.startDate)
              : undefined,
            endDate: validatedBody.endDate
              ? new Date(validatedBody.endDate)
              : undefined,
            deliveryMethod: validatedBody.deliveryMethod,
            deliveryConfig:
              validatedBody.deliveryConfig as schedulesService.UpdateScheduleInput["deliveryConfig"],
            parameters: validatedBody.parameters,
            isActive: validatedBody.isActive,
          }
        );

        return {
          data: mapScheduleToResponse(schedule),
          meta: createMeta(request.id),
        };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  // Delete schedule
  app.delete<{
    Params: { orgId: string; scheduleId: string };
  }>(
    "/:orgId/reports/schedules/:scheduleId",
    {
      preHandler: [
        requireOwnershipOrPermission("reports", "delete", (request) => {
          const { scheduleId, orgId } = request.params as {
            scheduleId: string;
            orgId: string;
          };
          return schedulesService.getScheduleOwnerId(scheduleId, orgId);
        }),
      ],
    },
    async (request, reply): Promise<SoftDeleteResponse | ErrorResponse> => {
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
        };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  // Pause schedule
  app.post<{
    Params: { orgId: string; scheduleId: string };
  }>(
    "/:orgId/reports/schedules/:scheduleId/pause",
    {
      preHandler: [
        requireOwnershipOrPermission("reports", "update", (request) => {
          const { scheduleId, orgId } = request.params as {
            scheduleId: string;
            orgId: string;
          };
          return schedulesService.getScheduleOwnerId(scheduleId, orgId);
        }),
      ],
    },
    async (
      request,
      reply
    ): Promise<ScheduledReportResponse | ErrorResponse> => {
      try {
        const { orgId, scheduleId } = request.params;

        const schedule = await schedulesService.pauseSchedule(
          scheduleId,
          orgId
        );

        return {
          data: mapScheduleToResponse(schedule),
          meta: createMeta(request.id),
        };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  // Resume schedule
  app.post<{
    Params: { orgId: string; scheduleId: string };
  }>(
    "/:orgId/reports/schedules/:scheduleId/resume",
    {
      preHandler: [
        requireOwnershipOrPermission("reports", "update", (request) => {
          const { scheduleId, orgId } = request.params as {
            scheduleId: string;
            orgId: string;
          };
          return schedulesService.getScheduleOwnerId(scheduleId, orgId);
        }),
      ],
    },
    async (
      request,
      reply
    ): Promise<ScheduledReportResponse | ErrorResponse> => {
      try {
        const { orgId, scheduleId } = request.params;

        const schedule = await schedulesService.resumeSchedule(
          scheduleId,
          orgId
        );

        return {
          data: mapScheduleToResponse(schedule),
          meta: createMeta(request.id),
        };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  // Get schedule run history
  app.get<{
    Params: { orgId: string; scheduleId: string };
    Querystring: {
      page?: number;
      pageSize?: number;
      status?: string;
    };
  }>(
    "/:orgId/reports/schedules/:scheduleId/history",
    { preHandler: [requirePermission("reports", "read")] },
    async (request, reply) => {
      try {
        const { orgId, scheduleId } = request.params;
        const page = Number(request.query.page) || 1;
        const pageSize = Math.min(Number(request.query.pageSize) || 20, 100);

        // Use generic jobs service with filter by type=report
        // Jobs with this scheduleId will have it in metadata.scheduledReportId
        const result = await jobsService.listJobs(orgId, {
          page,
          pageSize,
          type: "report",
          status: request.query.status as
            | "pending"
            | "processing"
            | "completed"
            | "failed"
            | "cancelled"
            | undefined,
        });

        // Filter by scheduleId in metadata (in-memory filter since we don't have a direct query)
        const filteredJobs = result.data.filter(
          (job) => job.metadata?.scheduledReportId === scheduleId
        );

        return {
          data: filteredJobs.map((job) => ({
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
          })),
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
