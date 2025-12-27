import type {
  CreateExamplePostRequest,
  ErrorResponse,
  ExamplePost,
  ExamplePostCursorListResponse,
  ExamplePostListResponse,
  ExamplePostResponse,
  SoftDeleteResponse,
  UpdateExamplePostRequest,
} from "@workspace/contracts";
import {
  zCreateExamplePostRequest,
  zUpdateExamplePostRequest,
} from "@workspace/contracts/zod";
import type { FastifyInstance } from "fastify";
import { handleError, ValidationError } from "../../../lib/errors";
import { createMeta } from "../../../lib/response";
import { requirePermission } from "../../auth/authorization-middleware";
import * as postsService from "../services/posts.service";

export function postsRoutes(app: FastifyInstance) {
  // List posts
  app.get<{
    Params: { orgId: string };
    Querystring: {
      page?: number;
      pageSize?: number;
      orderBy?: string;
      fields?: string;
      include?: string;
      search?: string;
      status?: string;
      statusNe?: string;
      statusIn?: string;
      authorId?: string;
      titleContains?: string;
      contentContains?: string;
      createdAfter?: string;
      createdBefore?: string;
      publishedAfter?: string;
      publishedBefore?: string;
    };
  }>(
    "/:orgId/example-posts",
    { preHandler: [requirePermission("posts", "read")] },
    async (request): Promise<ExamplePostListResponse> => {
      const { orgId } = request.params;
      const page = request.query.page ?? 1;
      const pageSize = Math.min(request.query.pageSize ?? 50, 100);

      const result = await postsService.listExamplePosts(orgId, {
        page,
        pageSize,
        orderBy: request.query.orderBy,
        fields: request.query.fields,
        search: request.query.search,
        status: request.query.status,
        statusNe: request.query.statusNe,
        statusIn: request.query.statusIn,
        authorId: request.query.authorId,
        titleContains: request.query.titleContains,
        contentContains: request.query.contentContains,
        createdAfter: request.query.createdAfter,
        createdBefore: request.query.createdBefore,
        publishedAfter: request.query.publishedAfter,
        publishedBefore: request.query.publishedBefore,
      });

      return {
        data: result.posts as ExamplePost[],
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
    }
  );

  // List posts (cursor-based pagination)
  // As documented in docs/api-guide/02-data-operations/01-pagination.md
  // Best for large datasets (>100K records) or real-time data
  app.get<{
    Params: { orgId: string };
    Querystring: {
      cursor?: string;
      limit?: number;
      orderBy?: string;
      status?: string;
      authorId?: string;
      search?: string;
    };
  }>(
    "/:orgId/example-posts/cursor",
    { preHandler: [requirePermission("posts", "read")] },
    async (request): Promise<ExamplePostCursorListResponse | ErrorResponse> => {
      const { orgId } = request.params;
      const limit = Math.min(request.query.limit ?? 50, 100);

      const result = await postsService.listExamplePostsCursor(orgId, {
        cursor: request.query.cursor,
        limit,
        orderBy: request.query.orderBy,
        status: request.query.status,
        authorId: request.query.authorId,
        search: request.query.search,
      });

      return {
        data: result.posts,
        pagination: {
          limit: result.limit,
          hasNext: result.hasNext,
          nextCursor: result.nextCursor,
          previousCursor: result.previousCursor,
        },
        meta: createMeta(request.id),
      };
    }
  );

  // Create post
  app.post<{
    Params: { orgId: string };
    Body: CreateExamplePostRequest;
  }>(
    "/:orgId/example-posts",
    { preHandler: [requirePermission("posts", "create")] },
    async (request, reply): Promise<ExamplePostResponse | ErrorResponse> => {
      const parseResult = zCreateExamplePostRequest.safeParse(request.body);
      if (!parseResult.success) {
        const error = new ValidationError(
          "Invalid request body",
          parseResult.error.issues.map((e) => ({
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
        const post = await postsService.createExamplePost(
          request.params.orgId,
          parseResult.data
        );
        reply.status(201);
        reply.header(
          "Location",
          `/v1/orgs/${request.params.orgId}/example-posts/${post.id}`
        );
        return { data: post, meta: createMeta(request.id) };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  // Get post by ID
  app.get<{
    Params: { orgId: string; id: string };
    Querystring: { fields?: string; include?: string };
  }>(
    "/:orgId/example-posts/:id",
    { preHandler: [requirePermission("posts", "read")] },
    async (request, reply): Promise<ExamplePostResponse | ErrorResponse> => {
      try {
        const post = await postsService.getExamplePostById(
          request.params.id,
          request.params.orgId
        );
        return { data: post, meta: createMeta(request.id) };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  // Update post
  app.patch<{
    Params: { orgId: string; id: string };
    Body: UpdateExamplePostRequest;
  }>(
    "/:orgId/example-posts/:id",
    { preHandler: [requirePermission("posts", "update")] },
    async (request, reply): Promise<ExamplePostResponse | ErrorResponse> => {
      const parseResult = zUpdateExamplePostRequest.safeParse(request.body);
      if (!parseResult.success) {
        const error = new ValidationError(
          "Invalid request body",
          parseResult.error.issues.map((e) => ({
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
        const post = await postsService.updateExamplePost(
          request.params.id,
          request.params.orgId,
          parseResult.data
        );
        return { data: post, meta: createMeta(request.id) };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  // Soft delete post
  app.delete<{
    Params: { orgId: string; id: string };
  }>(
    "/:orgId/example-posts/:id",
    { preHandler: [requirePermission("posts", "delete")] },
    async (request, reply): Promise<SoftDeleteResponse | ErrorResponse> => {
      try {
        const result = await postsService.softDeleteExamplePost(
          request.params.id,
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

  // Hard delete post
  app.delete<{
    Params: { orgId: string; id: string };
  }>(
    "/:orgId/example-posts/:id/permanent",
    { preHandler: [requirePermission("posts", "delete")] },
    async (request, reply) => {
      try {
        await postsService.permanentDeleteExamplePost(
          request.params.id,
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

  // Restore post
  app.post<{
    Params: { orgId: string; id: string };
  }>(
    "/:orgId/example-posts/:id/restore",
    { preHandler: [requirePermission("posts", "update")] },
    async (request, reply): Promise<ExamplePostResponse | ErrorResponse> => {
      try {
        const post = await postsService.restoreExamplePost(
          request.params.id,
          request.params.orgId
        );
        return { data: post, meta: createMeta(request.id) };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  // Batch create posts
  app.post<{
    Params: { orgId: string };
    Body: {
      items: CreateExamplePostRequest[];
      options?: { atomic?: boolean };
    };
  }>(
    "/:orgId/example-posts/batch",
    { preHandler: [requirePermission("posts", "create")] },
    async (request, reply) => {
      try {
        const result = await postsService.batchCreateExamplePosts(
          request.params.orgId,
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

  // Batch update posts
  app.patch<{
    Params: { orgId: string };
    Body: {
      items: Array<{ id: string; updates: UpdateExamplePostRequest }>;
      options?: { atomic?: boolean };
    };
  }>(
    "/:orgId/example-posts/batch",
    { preHandler: [requirePermission("posts", "update")] },
    async (request, reply) => {
      try {
        const result = await postsService.batchUpdateExamplePosts(
          request.params.orgId,
          request.body.items,
          request.body.options
        );
        return { ...result, meta: createMeta(request.id) };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  // Batch soft delete posts
  app.post<{
    Params: { orgId: string };
    Body: {
      ids: string[];
      options?: { atomic?: boolean };
    };
  }>(
    "/:orgId/example-posts/batch/soft-delete",
    { preHandler: [requirePermission("posts", "delete")] },
    async (request, reply) => {
      try {
        const result = await postsService.batchSoftDeleteExamplePosts(
          request.params.orgId,
          request.body.ids,
          "system", // TODO: Get from authenticated user
          request.body.options
        );
        return { ...result, meta: createMeta(request.id) };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  // Batch restore posts
  // As documented in docs/api-guide/05-advanced-operations/05-restore.md
  app.post<{
    Params: { orgId: string };
    Body: {
      ids: string[];
      options?: { atomic?: boolean };
    };
  }>(
    "/:orgId/example-posts/batch/restore",
    { preHandler: [requirePermission("posts", "update")] },
    async (request, reply) => {
      try {
        const result = await postsService.batchRestoreExamplePosts(
          request.params.orgId,
          request.body.ids,
          request.body.options
        );
        return { ...result, meta: createMeta(request.id) };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  // List deleted posts
  // As documented in docs/api-guide/05-advanced-operations/04-soft-delete.md
  app.get<{
    Params: { orgId: string };
    Querystring: {
      page?: number;
      pageSize?: number;
    };
  }>(
    "/:orgId/example-posts/deleted",
    { preHandler: [requirePermission("posts", "read")] },
    async (
      request,
      reply
    ): Promise<ExamplePostListResponse | ErrorResponse> => {
      const { orgId } = request.params;
      const page = request.query.page ?? 1;
      const pageSize = Math.min(request.query.pageSize ?? 50, 100);

      try {
        const result = await postsService.listDeletedExamplePosts(orgId, {
          page,
          pageSize,
        });

        return {
          data: result.posts as ExamplePost[],
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
}
