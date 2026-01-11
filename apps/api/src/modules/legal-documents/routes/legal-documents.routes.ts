import type {
  LegalDocumentStatus,
  LegalDocumentType,
} from "@workspace/contracts";
import type { FastifyInstance } from "fastify";
import { handleError, ValidationError } from "../../../lib/errors";
import { createMeta } from "../../../lib/response";
import { requirePermission } from "../../auth/authorization-middleware";
import { requireAuth } from "../../auth/middleware";
import * as legalDocumentsService from "../services/legal-documents.service";

/**
 * Map document to API response
 */
function mapDocumentToResponse(doc: {
  id: string;
  type: string;
  slug: string;
  locale: string;
  status: string;
  activeVersionId: string | null;
  activeVersion?: {
    id: string;
    documentId: string;
    version: number;
    title: string;
    content: string;
    changelog: string | null;
    status: string;
    publishedAt: Date | null;
    scheduledAt: Date | null;
    requiresReAcceptance: boolean;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
  };
  versionCount?: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: doc.id,
    type: doc.type,
    slug: doc.slug,
    locale: doc.locale,
    status: doc.status,
    activeVersionId: doc.activeVersionId ?? undefined,
    activeVersion: doc.activeVersion
      ? {
          id: doc.activeVersion.id,
          documentId: doc.activeVersion.documentId,
          version: doc.activeVersion.version,
          title: doc.activeVersion.title,
          content: doc.activeVersion.content,
          changelog: doc.activeVersion.changelog ?? undefined,
          status: doc.activeVersion.status,
          publishedAt: doc.activeVersion.publishedAt?.toISOString(),
          scheduledAt: doc.activeVersion.scheduledAt?.toISOString(),
          requiresReAcceptance: doc.activeVersion.requiresReAcceptance,
          createdBy: doc.activeVersion.createdBy,
          createdAt: doc.activeVersion.createdAt.toISOString(),
          updatedAt: doc.activeVersion.updatedAt.toISOString(),
        }
      : undefined,
    versionCount: doc.versionCount ?? 0,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

/**
 * Map version to API response
 */
function mapVersionToResponse(
  version: Awaited<ReturnType<typeof legalDocumentsService.getVersion>>
) {
  return {
    id: version.id,
    documentId: version.documentId,
    version: version.version,
    title: version.title,
    content: version.content,
    changelog: version.changelog ?? undefined,
    status: version.status,
    publishedAt: version.publishedAt?.toISOString(),
    scheduledAt: version.scheduledAt?.toISOString(),
    requiresReAcceptance: version.requiresReAcceptance,
    createdBy: version.createdBy,
    createdAt: version.createdAt.toISOString(),
    updatedAt: version.updatedAt.toISOString(),
  };
}

/**
 * Legal Documents routes
 */
export function legalDocumentsRoutes(app: FastifyInstance) {
  // ============ ADMIN ROUTES ============

  /**
   * List all legal documents (admin)
   */
  app.get<{
    Querystring: {
      page?: number;
      pageSize?: number;
      type?: LegalDocumentType;
      status?: LegalDocumentStatus;
      locale?: string;
    };
  }>(
    "/admin/legal-documents",
    { preHandler: [requirePermission("legal-documents", "read")] },
    async (request, reply) => {
      try {
        const result = await legalDocumentsService.listDocuments({
          page: Number(request.query.page) || 1,
          pageSize: Math.min(Number(request.query.pageSize) || 20, 100),
          type: request.query.type,
          status: request.query.status,
          locale: request.query.locale,
        });

        return {
          data: result.data.map(mapDocumentToResponse),
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
   * Get single document (admin)
   */
  app.get<{
    Params: { documentId: string };
  }>(
    "/admin/legal-documents/:documentId",
    { preHandler: [requirePermission("legal-documents", "read")] },
    async (request, reply) => {
      try {
        const document = await legalDocumentsService.getDocumentWithVersion(
          request.params.documentId
        );

        return {
          data: mapDocumentToResponse(document),
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
   * Create new document (admin)
   */
  app.post<{
    Body: {
      type: LegalDocumentType;
      slug: string;
      locale?: string;
      title: string;
      content: string;
      requiresReAcceptance?: boolean;
    };
  }>(
    "/admin/legal-documents",
    { preHandler: [requirePermission("legal-documents", "create")] },
    async (request, reply) => {
      try {
        const userId = request.user?.id;
        if (!userId) {
          throw new ValidationError("User not authenticated");
        }

        const { document } = await legalDocumentsService.createDocument({
          type: request.body.type,
          slug: request.body.slug,
          locale: request.body.locale,
          title: request.body.title,
          content: request.body.content,
          requiresReAcceptance: request.body.requiresReAcceptance,
          createdBy: userId,
        });

        const fullDoc = await legalDocumentsService.getDocumentWithVersion(
          document.id
        );

        reply.status(201);
        return {
          data: mapDocumentToResponse(fullDoc),
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
   * Update document metadata (admin)
   */
  app.patch<{
    Params: { documentId: string };
    Body: {
      slug?: string;
      locale?: string;
    };
  }>(
    "/admin/legal-documents/:documentId",
    { preHandler: [requirePermission("legal-documents", "update")] },
    async (request, reply) => {
      try {
        const userId = request.user?.id;
        if (!userId) {
          throw new ValidationError("User not authenticated");
        }

        await legalDocumentsService.updateDocument(
          request.params.documentId,
          request.body,
          userId
        );

        const fullDoc = await legalDocumentsService.getDocumentWithVersion(
          request.params.documentId
        );

        return {
          data: mapDocumentToResponse(fullDoc),
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
   * Delete document (admin)
   */
  app.delete<{
    Params: { documentId: string };
  }>(
    "/admin/legal-documents/:documentId",
    { preHandler: [requirePermission("legal-documents", "delete")] },
    async (request, reply) => {
      try {
        const userId = request.user?.id;
        if (!userId) {
          throw new ValidationError("User not authenticated");
        }

        await legalDocumentsService.deleteDocument(
          request.params.documentId,
          userId
        );

        return {
          data: {
            id: request.params.documentId,
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

  // ============ VERSION ROUTES ============

  /**
   * List versions for a document
   */
  app.get<{
    Params: { documentId: string };
  }>(
    "/admin/legal-documents/:documentId/versions",
    { preHandler: [requirePermission("legal-documents", "read")] },
    async (request, reply) => {
      try {
        const versions = await legalDocumentsService.listVersions(
          request.params.documentId
        );

        return {
          data: versions.map(mapVersionToResponse),
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
   * Create new version
   */
  app.post<{
    Params: { documentId: string };
    Body: {
      title: string;
      content: string;
      changelog?: string;
      requiresReAcceptance?: boolean;
    };
  }>(
    "/admin/legal-documents/:documentId/versions",
    { preHandler: [requirePermission("legal-documents", "create")] },
    async (request, reply) => {
      try {
        const userId = request.user?.id;
        if (!userId) {
          throw new ValidationError("User not authenticated");
        }

        const version = await legalDocumentsService.createVersion({
          documentId: request.params.documentId,
          title: request.body.title,
          content: request.body.content,
          changelog: request.body.changelog,
          requiresReAcceptance: request.body.requiresReAcceptance,
          createdBy: userId,
        });

        reply.status(201);
        return {
          data: mapVersionToResponse(version),
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
   * Publish version
   */
  app.post<{
    Params: { documentId: string; versionId: string };
  }>(
    "/admin/legal-documents/:documentId/versions/:versionId/publish",
    { preHandler: [requirePermission("legal-documents", "update")] },
    async (request, reply) => {
      try {
        const userId = request.user?.id;
        if (!userId) {
          throw new ValidationError("User not authenticated");
        }

        const result = await legalDocumentsService.publishVersion(
          request.params.versionId,
          request.params.documentId,
          userId
        );

        return {
          data: mapVersionToResponse(result.version),
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
   * Unpublish version
   */
  app.post<{
    Params: { documentId: string; versionId: string };
  }>(
    "/admin/legal-documents/:documentId/versions/:versionId/unpublish",
    { preHandler: [requirePermission("legal-documents", "update")] },
    async (request, reply) => {
      try {
        const userId = request.user?.id;
        if (!userId) {
          throw new ValidationError("User not authenticated");
        }

        const result = await legalDocumentsService.unpublishVersion(
          request.params.versionId,
          request.params.documentId,
          userId
        );

        return {
          data: mapVersionToResponse(result.version),
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
   * Get audit log for document
   */
  app.get<{
    Params: { documentId: string };
    Querystring: { limit?: number };
  }>(
    "/admin/legal-documents/:documentId/audit-log",
    { preHandler: [requirePermission("legal-documents", "read")] },
    async (request, reply) => {
      try {
        const logs = await legalDocumentsService.getDocumentAuditLog(
          request.params.documentId,
          { limit: Number(request.query.limit) || 50 }
        );

        return {
          data: logs.map((log) => ({
            id: log.id,
            documentId: log.documentId,
            versionId: log.versionId ?? undefined,
            action: log.action,
            actorId: log.actorId,
            actorName: log.actorName ?? undefined,
            changes: log.changes ? JSON.parse(log.changes) : undefined,
            createdAt: log.createdAt.toISOString(),
          })),
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
   * List acceptances for document (admin)
   */
  app.get<{
    Params: { documentId: string };
    Querystring: { page?: number; pageSize?: number };
  }>(
    "/admin/legal-documents/:documentId/acceptances",
    { preHandler: [requirePermission("legal-documents", "read")] },
    async (request, reply) => {
      try {
        const result = await legalDocumentsService.listDocumentAcceptances(
          request.params.documentId,
          {
            page: Number(request.query.page) || 1,
            pageSize: Math.min(Number(request.query.pageSize) || 50, 200),
          }
        );

        return {
          data: result.data.map((acc) => ({
            id: acc.id,
            userId: acc.userId,
            versionId: acc.versionId,
            documentId: acc.documentId,
            documentType: acc.documentType,
            acceptedAt: acc.acceptedAt.toISOString(),
            ipAddress: acc.ipAddress ?? undefined,
            userAgent: acc.userAgent ?? undefined,
          })),
          totalCount: result.totalCount,
          meta: createMeta(request.id),
        };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  // ============ PUBLIC ROUTES ============

  /**
   * Get user's pending documents to accept
   */
  app.get(
    "/legal/pending",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const userId = request.user?.id;
        if (!userId) {
          throw new ValidationError("User not authenticated");
        }

        const pending =
          await legalDocumentsService.getPendingAcceptances(userId);

        return {
          data: pending.map((p) => ({
            document: {
              id: p.document.id,
              type: p.document.type,
              slug: p.document.slug,
            },
            version: {
              id: p.version.id,
              title: p.version.title,
              content: p.version.content,
              version: p.version.version,
            },
            requiresReAcceptance: p.requiresReAcceptance,
          })),
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
   * Accept a document
   */
  app.post<{
    Params: { documentId: string };
    Body: { versionId: string };
  }>(
    "/legal/:documentId/accept",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const userId = request.user?.id;
        if (!userId) {
          throw new ValidationError("User not authenticated");
        }

        const document = await legalDocumentsService.getDocument(
          request.params.documentId
        );

        const acceptance = await legalDocumentsService.acceptDocument({
          userId,
          versionId: request.body.versionId,
          documentId: request.params.documentId,
          documentType: document.type,
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"] ?? undefined,
        });

        return {
          data: {
            id: acceptance.id,
            acceptedAt: acceptance.acceptedAt.toISOString(),
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
   * Get user's acceptance history
   */
  app.get(
    "/legal/my-acceptances",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const userId = request.user?.id;
        if (!userId) {
          throw new ValidationError("User not authenticated");
        }

        const acceptances =
          await legalDocumentsService.getUserAcceptances(userId);

        return {
          data: acceptances.map((acc) => ({
            id: acc.id,
            documentId: acc.documentId,
            documentType: acc.documentType,
            versionId: acc.versionId,
            acceptedAt: acc.acceptedAt.toISOString(),
          })),
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
