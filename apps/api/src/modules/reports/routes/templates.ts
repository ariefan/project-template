import type {
  CreateReportTemplateRequest,
  ErrorResponse,
  ReportFormat,
  ReportTemplateListResponse,
  ReportTemplateResponse,
  SoftDeleteResponse,
  UpdateReportTemplateRequest,
} from "@workspace/contracts";
import {
  zCreateReportTemplateRequest,
  zUpdateReportTemplateRequest,
} from "@workspace/contracts/zod";
import type { FastifyInstance } from "fastify";
import { handleError, ValidationError } from "../../../lib/errors";
import { createMeta } from "../../../lib/response";
import {
  requireOwnershipOrPermission,
  requirePermission,
} from "../../auth/authorization-middleware";
import * as templatesService from "../services/templates.service";

export function templatesRoutes(app: FastifyInstance) {
  // List templates
  app.get<{
    Params: { orgId: string };
    Querystring: {
      page?: number;
      pageSize?: number;
      orderBy?: string;
      format?: ReportFormat;
      isPublic?: boolean;
      search?: string;
      createdBy?: string;
    };
  }>(
    "/:orgId/reports/templates",
    { preHandler: [requirePermission("reports", "read")] },
    async (
      request,
      reply
    ): Promise<ReportTemplateListResponse | ErrorResponse> => {
      try {
        const { orgId } = request.params;
        const page = Number(request.query.page) || 1;
        const pageSize = Math.min(Number(request.query.pageSize) || 50, 100);

        const result = await templatesService.listTemplates(orgId, {
          page,
          pageSize,
          orderBy: request.query.orderBy,
          format: request.query.format,
          isPublic: request.query.isPublic,
          search: request.query.search,
          createdBy: request.query.createdBy,
        });

        return {
          data: result.templates.map((t) => ({
            id: t.id,
            orgId: t.organizationId,
            name: t.name,
            description: t.description ?? undefined,
            format: t.format,
            templateEngine: t.templateEngine,
            templateContent: t.templateContent,
            options: t.options ?? undefined,
            dataSource: t.dataSource ?? undefined,
            columns: t.columns,
            isPublic: t.isPublic,
            createdBy: t.createdBy,
            createdAt: t.createdAt.toISOString(),
            updatedAt: t.updatedAt.toISOString(),
            deletedAt: t.deletedAt?.toISOString(),
          })),
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

  // Get template by ID
  app.get<{
    Params: { orgId: string; templateId: string };
  }>(
    "/:orgId/reports/templates/:templateId",
    { preHandler: [requirePermission("reports", "read")] },
    async (request, reply): Promise<ReportTemplateResponse | ErrorResponse> => {
      try {
        const { orgId, templateId } = request.params;

        const template = await templatesService.getTemplate(templateId, orgId);

        return {
          data: {
            id: template.id,
            orgId: template.organizationId,
            name: template.name,
            description: template.description ?? undefined,
            format: template.format,
            templateEngine: template.templateEngine,
            templateContent: template.templateContent,
            options: template.options ?? undefined,
            dataSource: template.dataSource ?? undefined,
            columns: template.columns,
            isPublic: template.isPublic,
            createdBy: template.createdBy,
            createdAt: template.createdAt.toISOString(),
            updatedAt: template.updatedAt.toISOString(),
            deletedAt: template.deletedAt?.toISOString(),
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

  // Create template
  app.post<{
    Params: { orgId: string };
    Body: CreateReportTemplateRequest;
  }>(
    "/:orgId/reports/templates",
    { preHandler: [requirePermission("reports", "create")] },
    async (request, reply): Promise<ReportTemplateResponse | ErrorResponse> => {
      try {
        const { orgId } = request.params;
        const userId = request.user?.id;

        if (!userId) {
          throw new ValidationError("User not authenticated");
        }

        // Validate request body
        const validatedBody = zCreateReportTemplateRequest.parse(request.body);

        const template = await templatesService.createTemplate(
          orgId,
          userId,
          validatedBody
        );

        reply.status(201);
        reply.header(
          "Location",
          `/v1/orgs/${orgId}/reports/templates/${template.id}`
        );

        return {
          data: {
            id: template.id,
            orgId: template.organizationId,
            name: template.name,
            description: template.description ?? undefined,
            format: template.format,
            templateEngine: template.templateEngine,
            templateContent: template.templateContent,
            options: template.options ?? undefined,
            dataSource: template.dataSource ?? undefined,
            columns: template.columns,
            isPublic: template.isPublic,
            createdBy: template.createdBy,
            createdAt: template.createdAt.toISOString(),
            updatedAt: template.updatedAt.toISOString(),
            deletedAt: template.deletedAt?.toISOString(),
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

  // Update template
  app.patch<{
    Params: { orgId: string; templateId: string };
    Body: UpdateReportTemplateRequest;
  }>(
    "/:orgId/reports/templates/:templateId",
    {
      preHandler: [
        requireOwnershipOrPermission("reports", "update", (request) => {
          const { templateId, orgId } = request.params as {
            templateId: string;
            orgId: string;
          };
          return templatesService.getTemplateOwnerId(templateId, orgId);
        }),
      ],
    },
    async (request, reply): Promise<ReportTemplateResponse | ErrorResponse> => {
      try {
        const { orgId, templateId } = request.params;

        // Validate request body
        const validatedBody = zUpdateReportTemplateRequest.parse(request.body);

        const template = await templatesService.updateTemplate(
          templateId,
          orgId,
          {
            name: validatedBody.name,
            description: validatedBody.description,
            format: validatedBody.format,
            templateContent: validatedBody.templateContent,
            options:
              validatedBody.options as templatesService.UpdateTemplateInput["options"],
            dataSource:
              validatedBody.dataSource as templatesService.UpdateTemplateInput["dataSource"],
            columns:
              validatedBody.columns as templatesService.UpdateTemplateInput["columns"],
            isPublic: validatedBody.isPublic,
          }
        );

        return {
          data: {
            id: template.id,
            orgId: template.organizationId,
            name: template.name,
            description: template.description ?? undefined,
            format: template.format,
            templateEngine: template.templateEngine,
            templateContent: template.templateContent,
            options: template.options ?? undefined,
            dataSource: template.dataSource ?? undefined,
            columns: template.columns,
            isPublic: template.isPublic,
            createdBy: template.createdBy,
            createdAt: template.createdAt.toISOString(),
            updatedAt: template.updatedAt.toISOString(),
            deletedAt: template.deletedAt?.toISOString(),
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

  // Delete template
  app.delete<{
    Params: { orgId: string; templateId: string };
  }>(
    "/:orgId/reports/templates/:templateId",
    {
      preHandler: [
        requireOwnershipOrPermission("reports", "delete", (request) => {
          const { templateId, orgId } = request.params as {
            templateId: string;
            orgId: string;
          };
          return templatesService.getTemplateOwnerId(templateId, orgId);
        }),
      ],
    },
    async (request, reply): Promise<SoftDeleteResponse | ErrorResponse> => {
      try {
        const { orgId, templateId } = request.params;
        const userId = request.user?.id;

        if (!userId) {
          throw new ValidationError("User not authenticated");
        }

        await templatesService.deleteTemplate(templateId, orgId);

        return {
          data: {
            id: templateId,
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

  // Clone template
  app.post<{
    Params: { orgId: string; templateId: string };
    Body: { name: string; description?: string };
  }>(
    "/:orgId/reports/templates/:templateId/clone",
    { preHandler: [requirePermission("reports", "create")] },
    async (request, reply): Promise<ReportTemplateResponse | ErrorResponse> => {
      try {
        const { orgId, templateId } = request.params;
        const userId = request.user?.id;
        const { name, description } = request.body;

        if (!userId) {
          throw new ValidationError("User not authenticated");
        }

        const template = await templatesService.cloneTemplate(
          templateId,
          orgId,
          userId,
          name,
          description
        );

        reply.status(201);
        reply.header(
          "Location",
          `/v1/orgs/${orgId}/reports/templates/${template.id}`
        );

        return {
          data: {
            id: template.id,
            orgId: template.organizationId,
            name: template.name,
            description: template.description ?? undefined,
            format: template.format,
            templateEngine: template.templateEngine,
            templateContent: template.templateContent,
            options: template.options ?? undefined,
            dataSource: template.dataSource ?? undefined,
            columns: template.columns,
            isPublic: template.isPublic,
            createdBy: template.createdBy,
            createdAt: template.createdAt.toISOString(),
            updatedAt: template.updatedAt.toISOString(),
            deletedAt: template.deletedAt?.toISOString(),
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

  // Test report template
  app.post<{
    Params: { orgId: string; templateId: string };
    Body: { parameters?: Record<string, unknown> };
  }>(
    "/:orgId/reports/templates/:templateId/test",
    { preHandler: [requirePermission("reports", "create")] },
    async (request, reply) => {
      try {
        const { orgId, templateId } = request.params;
        const userId = request.user?.id;
        const { parameters } = request.body ?? {};

        if (!userId) {
          throw new ValidationError("User not authenticated");
        }

        // Verify template exists and get its format
        const template = await templatesService.getTemplate(templateId, orgId);

        // Import jobsService to avoid circular dependency
        const { jobsService } = await import("../../jobs");

        // Create and enqueue job
        const job = await jobsService.createAndEnqueueJob({
          orgId,
          type: "report",
          createdBy: userId,
          input: { templateId, parameters },
          metadata: { templateId, format: template.format },
        });

        // Return AsyncExportResponse (includes meta field)
        return {
          jobId: job.id,
          status: job.status as import("@workspace/db/schema").JobStatus,
          statusUrl: `/v1/orgs/${orgId}/jobs/${job.id}`,
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
