import type { FastifyInstance } from "fastify";
import { backupsRoutes } from "./routes/backups.routes";

/**
 * Backups module
 * Provides backup and restore functionality for organizations
 */
export function backupsModule(app: FastifyInstance) {
  backupsRoutes(app);
}

// Re-export types
export * from "./services/backup.service";
