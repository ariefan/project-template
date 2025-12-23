import type {
  CreateExampleCommentRequest,
  ErrorResponse,
  ExampleCommentListResponse,
  ExampleCommentResponse,
  SoftDeleteResponse,
  UpdateExampleCommentRequest,
} from "@workspace/contracts";
import {
  zCreateExampleCommentRequest,
  zUpdateExampleCommentRequest,
} from "@workspace/contracts/zod";
import type { FastifyInstance } from "fastify";
import { handleError, ValidationError } from "../../../lib/errors";
import { createMeta } from "../../../lib/response";
import { requirePermission } from "../../auth/authorization-middleware";
import * as commentsService from "../services/comments.service";

export function commentsRoutes(app: FastifyInstance) {
  // List comments for a post
  app.get<{
    Params: { orgId: string; postId: string };
    Querystring: {
      page?: number;
      pageSize?: number;
      orderBy?: string;
      fields?: string;
      authorId?: string;
      contentContains?: string;
      createdAfter?: string;
      createdBefore?: string;
    };
  }>(
    "/:orgId/example-posts/:postId/example-comments",
    { preHandler: [requirePermission("comments", "read")] },
    async (
      request,
      reply
    ): Promise<ExampleCommentListResponse | ErrorResponse> => {
      const { orgId, postId } = request.params;
      const page = request.query.page ?? 1;
      const pageSize = Math.min(request.query.pageSize ?? 50, 100);

      try {
        const result = await commentsService.listExampleComments(
          orgId,
          postId,
          {
            page,
            pageSize,
            orderBy: request.query.orderBy,
            authorId: request.query.authorId,
            contentContains: request.query.contentContains,
            createdAfter: request.query.createdAfter,
            createdBefore: request.query.createdBefore,
          }
        );

        return {
          data: result.comments,
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

  // Create comment
  app.post<{
    Params: { orgId: string; postId: string };
    Body: CreateExampleCommentRequest;
  }>(
    "/:orgId/example-posts/:postId/example-comments",
    { preHandler: [requirePermission("comments", "create")] },
    async (request, reply): Promise<ExampleCommentResponse | ErrorResponse> => {
      const parseResult = zCreateExampleCommentRequest.safeParse(request.body);
      if (!parseResult.success) {
        const error = new ValidationError(
          "Invalid request body",
          parseResult.error.errors.map((e) => ({
            field: e.path.join("."),
            code: e.code,
            message: e.message,
          }))
        );
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }

      try {
        const comment = await commentsService.createExampleComment(
          request.params.orgId,
          request.params.postId,
          parseResult.data
        );
        reply.status(201);
        reply.header(
          "Location",
          `/v1/orgs/${request.params.orgId}/example-posts/${request.params.postId}/example-comments/${comment.id}`
        );
        return { data: comment, meta: createMeta(request.id) };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  // Get comment by ID
  app.get<{
    Params: { orgId: string; postId: string; id: string };
    Querystring: { fields?: string };
  }>(
    "/:orgId/example-posts/:postId/example-comments/:id",
    { preHandler: [requirePermission("comments", "read")] },
    async (request, reply): Promise<ExampleCommentResponse | ErrorResponse> => {
      try {
        const comment = await commentsService.getExampleCommentById(
          request.params.id,
          request.params.postId,
          request.params.orgId
        );
        return { data: comment, meta: createMeta(request.id) };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  // Update comment
  app.patch<{
    Params: { orgId: string; postId: string; id: string };
    Body: UpdateExampleCommentRequest;
  }>(
    "/:orgId/example-posts/:postId/example-comments/:id",
    { preHandler: [requirePermission("comments", "update")] },
    async (request, reply): Promise<ExampleCommentResponse | ErrorResponse> => {
      const parseResult = zUpdateExampleCommentRequest.safeParse(request.body);
      if (!parseResult.success) {
        const error = new ValidationError(
          "Invalid request body",
          parseResult.error.errors.map((e) => ({
            field: e.path.join("."),
            code: e.code,
            message: e.message,
          }))
        );
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }

      try {
        const comment = await commentsService.updateExampleComment(
          request.params.id,
          request.params.postId,
          request.params.orgId,
          parseResult.data
        );
        return { data: comment, meta: createMeta(request.id) };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  // Soft delete comment
  app.delete<{
    Params: { orgId: string; postId: string; id: string };
  }>(
    "/:orgId/example-posts/:postId/example-comments/:id",
    { preHandler: [requirePermission("comments", "delete")] },
    async (request, reply): Promise<SoftDeleteResponse | ErrorResponse> => {
      try {
        const result = await commentsService.softDeleteExampleComment(
          request.params.id,
          request.params.postId,
          request.params.orgId,
          "system" // TODO: Get from authenticated user
        );
        return { data: result, meta: createMeta(request.id) };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  // Hard delete comment
  app.delete<{
    Params: { orgId: string; postId: string; id: string };
  }>(
    "/:orgId/example-posts/:postId/example-comments/:id/permanent",
    { preHandler: [requirePermission("comments", "delete")] },
    async (request, reply) => {
      try {
        await commentsService.permanentDeleteExampleComment(
          request.params.id,
          request.params.postId,
          request.params.orgId
        );
        reply.status(204);
        return;
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  // Restore comment
  app.post<{
    Params: { orgId: string; postId: string; id: string };
  }>(
    "/:orgId/example-posts/:postId/example-comments/:id/restore",
    { preHandler: [requirePermission("comments", "update")] },
    async (request, reply): Promise<ExampleCommentResponse | ErrorResponse> => {
      try {
        const comment = await commentsService.restoreExampleComment(
          request.params.id,
          request.params.postId,
          request.params.orgId
        );
        return { data: comment, meta: createMeta(request.id) };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  // Batch create comments
  app.post<{
    Params: { orgId: string; postId: string };
    Body: {
      items: CreateExampleCommentRequest[];
      options?: { atomic?: boolean };
    };
  }>(
    "/:orgId/example-posts/:postId/example-comments/batch",
    { preHandler: [requirePermission("comments", "create")] },
    async (request, reply) => {
      try {
        const result = await commentsService.batchCreateExampleComments(
          request.params.orgId,
          request.params.postId,
          request.body.items,
          request.body.options
        );
        reply.status(201);
        return { ...result, meta: createMeta(request.id) };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  // Batch soft delete comments
  app.post<{
    Params: { orgId: string; postId: string };
    Body: {
      ids: string[];
      options?: { atomic?: boolean };
    };
  }>(
    "/:orgId/example-posts/:postId/example-comments/batch/soft-delete",
    { preHandler: [requirePermission("comments", "delete")] },
    async (request, reply) => {
      try {
        const result = await commentsService.batchSoftDeleteExampleComments({
          orgId: request.params.orgId,
          postId: request.params.postId,
          ids: request.body.ids,
          deletedBy: "system", // TODO: Get from authenticated user
          atomic: request.body.options?.atomic,
        });
        return { ...result, meta: createMeta(request.id) };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );
}
