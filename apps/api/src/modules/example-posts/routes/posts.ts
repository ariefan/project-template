import type {
  CreateExamplePostRequest,
  ErrorResponse,
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
        data: result.posts,
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

  // Create post
  app.post<{
    Params: { orgId: string };
    Body: CreateExamplePostRequest;
  }>(
    "/:orgId/example-posts",
    async (request, reply): Promise<ExamplePostResponse | ErrorResponse> => {
      const parseResult = zCreateExamplePostRequest.safeParse(request.body);
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
    async (request, reply): Promise<ExamplePostResponse | ErrorResponse> => {
      const parseResult = zUpdateExamplePostRequest.safeParse(request.body);
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
  }>("/:orgId/example-posts/:id/permanent", async (request, reply) => {
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
  });

  // Restore post
  app.post<{
    Params: { orgId: string; id: string };
  }>(
    "/:orgId/example-posts/:id/restore",
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
  }>("/:orgId/example-posts/batch", async (request, reply) => {
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
  });

  // Batch update posts
  app.patch<{
    Params: { orgId: string };
    Body: {
      items: Array<{ id: string; updates: UpdateExamplePostRequest }>;
      options?: { atomic?: boolean };
    };
  }>("/:orgId/example-posts/batch", async (request, reply) => {
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
  });

  // Batch soft delete posts
  app.post<{
    Params: { orgId: string };
    Body: {
      ids: string[];
      options?: { atomic?: boolean };
    };
  }>("/:orgId/example-posts/batch/soft-delete", async (request, reply) => {
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
  });
}
