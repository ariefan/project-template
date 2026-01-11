import type { FastifyInstance } from "fastify";
import { legalDocumentsRoutes } from "./routes/legal-documents.routes";

/**
 * Legal Documents Module
 *
 * Provides legal document management with:
 * - CRUD operations for documents (admin only)
 * - Version management (create, publish, unpublish)
 * - User acceptance tracking
 * - Audit logging for compliance
 * - Multi-locale support
 */
export function legalDocumentsModule(app: FastifyInstance) {
  legalDocumentsRoutes(app);
}

// Re-export service and repository for use by other modules
export * as legalDocumentsRepository from "./repositories/legal-documents.repository";
export * as legalDocumentsService from "./services/legal-documents.service";
