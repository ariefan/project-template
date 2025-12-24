import type { FastifyInstance } from "fastify";
import { filesRoutes } from "./routes/files";

/**
 * Files module
 * Provides file upload and management endpoints
 */
export function filesModule(app: FastifyInstance) {
  filesRoutes(app);
}

// Re-export service for use by other modules
export * as filesService from "./services/files.service";
export {
  generateStoragePath,
  isValidFilename,
  sanitizeFilename,
} from "./utils/filename-sanitizer";
// Re-export utilities
export {
  getAllowedMimeTypes,
  validateFileSize,
  validateMimeType,
} from "./utils/mime-validator";
