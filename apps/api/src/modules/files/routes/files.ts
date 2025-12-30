import type { FileAccess } from "@workspace/db/schema";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { requireAuth } from "../../auth/middleware";
import * as filesService from "../services/files.service";

interface FileParams {
  orgId: string;
  fileId: string;
}

interface UploadParams {
  orgId: string;
  uploadId: string;
}

interface ListFilesQuery {
  page?: number;
  pageSize?: number;
  mimeType?: string;
  access?: FileAccess;
}

interface InitiateUploadBody {
  filename: string;
  contentType: string;
  size: number;
  metadata?: Record<string, unknown>;
}

interface UpdateAccessBody {
  access: FileAccess;
}

/**
 * Files routes
 * Provides endpoints for file uploads and management
 */
export function filesRoutes(app: FastifyInstance) {
  /**
   * GET /:orgId/files - List files
   */
  app.get<{
    Params: { orgId: string };
    Querystring: ListFilesQuery;
  }>("/:orgId/files", { preHandler: [requireAuth] }, async (request, reply) => {
    const { orgId } = request.params;
    const { page, pageSize, mimeType, access } = request.query;

    const result = await filesService.listFiles(orgId, {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      mimeType,
      access,
    });

    return reply.status(200).send({
      data: result.data.map(formatFileResponse),
      pagination: result.pagination,
      meta: {
        requestId: request.id,
        timestamp: new Date().toISOString(),
      },
    });
  });

  /**
   * GET /:orgId/files/:fileId - Get file metadata
   */
  app.get<{ Params: FileParams }>(
    "/:orgId/files/:fileId",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { orgId, fileId } = request.params;

      const file = await filesService.getFile(orgId, fileId);

      if (!file) {
        return reply.status(404).send({
          error: {
            code: "notFound",
            message: "File not found",
            requestId: request.id,
          },
        });
      }

      return reply.status(200).send({
        data: formatFileResponse(file),
        meta: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
        },
      });
    }
  );

  /**
   * GET /:orgId/files/:fileId/download - Get download URL (redirect)
   */
  app.get<{ Params: FileParams }>(
    "/:orgId/files/:fileId/download",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { orgId, fileId } = request.params;

      const result = await filesService.getDownloadUrl(orgId, fileId);

      if (!result) {
        return reply.status(404).send({
          error: {
            code: "notFound",
            message: "File not found",
            requestId: request.id,
          },
        });
      }

      // Redirect to presigned download URL
      return reply.status(302).redirect(result.url);
    }
  );

  /**
   * POST /:orgId/files/uploads - Initiate presigned upload
   */
  app.post<{
    Params: { orgId: string };
    Body: InitiateUploadBody;
  }>(
    "/:orgId/files/uploads",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { orgId } = request.params;
      const { filename, contentType, size, metadata } = request.body;
      const userId = getUserId(request);

      try {
        const result = await filesService.initiateUpload({
          orgId,
          filename,
          contentType,
          size,
          metadata,
          createdBy: userId,
        });

        return reply.status(201).send({
          data: {
            uploadId: result.uploadId,
            uploadUrl: result.url,
            method: result.method,
            headers: result.headers,
            expiresAt: result.expiresAt.toISOString(),
          },
          meta: {
            requestId: request.id,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Upload failed";
        return reply.status(400).send({
          error: {
            code: "badRequest",
            message,
            requestId: request.id,
          },
        });
      }
    }
  );

  /**
   * POST /:orgId/files/uploads/:uploadId/confirm - Confirm upload
   */
  app.post<{ Params: UploadParams }>(
    "/:orgId/files/uploads/:uploadId/confirm",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { orgId, uploadId } = request.params;

      const result = await filesService.confirmUpload(orgId, uploadId);

      if (!result.file) {
        const statusCode = result.error?.includes("not found") ? 404 : 400;
        return reply.status(statusCode).send({
          error: {
            code: statusCode === 404 ? "notFound" : "badRequest",
            message: result.error ?? "Upload confirmation failed",
            requestId: request.id,
          },
        });
      }

      return reply.status(200).send({
        data: formatFileResponse(result.file),
        meta: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
        },
      });
    }
  );

  /**
   * POST /:orgId/files - Direct upload (multipart, <10MB)
   */
  app.post<{ Params: { orgId: string } }>(
    "/:orgId/files",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { orgId } = request.params;
      const userId = getUserId(request);

      // Get multipart file
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({
          error: {
            code: "badRequest",
            message: "No file provided",
            requestId: request.id,
          },
        });
      }

      try {
        // Read file data
        const chunks: Buffer[] = [];
        for await (const chunk of data.file) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        const file = await filesService.directUpload({
          orgId,
          filename: data.filename,
          contentType: data.mimetype,
          data: buffer,
          uploadedBy: userId,
        });

        return reply.status(201).send({
          data: formatFileResponse(file),
          meta: {
            requestId: request.id,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Upload failed";
        return reply.status(400).send({
          error: {
            code: "badRequest",
            message,
            requestId: request.id,
          },
        });
      }
    }
  );

  /**
   * PATCH /:orgId/files/:fileId - Update file (access level)
   */
  app.patch<{
    Params: FileParams;
    Body: UpdateAccessBody;
  }>(
    "/:orgId/files/:fileId",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { orgId, fileId } = request.params;
      const { access } = request.body;

      const file = await filesService.updateFileAccess(orgId, fileId, access);

      if (!file) {
        return reply.status(404).send({
          error: {
            code: "notFound",
            message: "File not found",
            requestId: request.id,
          },
        });
      }

      return reply.status(200).send({
        data: formatFileResponse(file),
        meta: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
        },
      });
    }
  );

  /**
   * DELETE /:orgId/files/:fileId - Soft delete
   */
  app.delete<{ Params: FileParams }>(
    "/:orgId/files/:fileId",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { orgId, fileId } = request.params;
      const userId = getUserId(request);

      const result = await filesService.softDeleteFile(orgId, fileId, userId);

      if (!result.file) {
        return reply.status(404).send({
          error: {
            code: "notFound",
            message: result.error ?? "File not found",
            requestId: request.id,
          },
        });
      }

      return reply.status(200).send({
        data: formatFileResponse(result.file),
        meta: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
        },
      });
    }
  );

  /**
   * DELETE /:orgId/files/:fileId/permanent - Hard delete
   */
  app.delete<{ Params: FileParams }>(
    "/:orgId/files/:fileId/permanent",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { orgId, fileId } = request.params;

      const result = await filesService.hardDeleteFile(orgId, fileId);

      if (!result.success) {
        return reply.status(404).send({
          error: {
            code: "notFound",
            message: result.error,
            requestId: request.id,
          },
        });
      }

      return reply.status(204).send();
    }
  );
}

/**
 * Get user ID from request
 */
function getUserId(request: FastifyRequest): string {
  // User is attached by auth middleware
  const user = (request as FastifyRequest & { user?: { id: string } }).user;
  return user?.id ?? "unknown";
}

/**
 * Format file for API response
 */
function formatFileResponse(file: {
  id: string;
  orgId: string;
  filename: string;
  size: number;
  mimeType: string;
  metadata: Record<string, unknown> | null;
  uploadedBy: string;
  uploadedAt: Date;
  virusScanStatus: string | null;
  virusScanCompletedAt: Date | null;
  access: string | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;
}) {
  return {
    fileId: file.id,
    tenantId: file.orgId,
    filename: file.filename,
    size: file.size,
    mimeType: file.mimeType,
    metadata: file.metadata,
    uploadedBy: file.uploadedBy,
    uploadedAt: file.uploadedAt.toISOString(),
    virusScan: {
      status: file.virusScanStatus,
      completedAt: file.virusScanCompletedAt?.toISOString(),
    },
    access: file.access,
    isDeleted: file.isDeleted,
    deletedAt: file.deletedAt?.toISOString(),
    deletedBy: file.deletedBy,
  };
}
