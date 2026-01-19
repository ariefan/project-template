import type { FastifyInstance } from "fastify";
import * as systemBackupHandlers from "../handlers/system-backup.handler";
import type { SystemBackupOptions } from "../services/system-backup.service";

/**
 * System Backup Routes (Admin Only)
 */
export function systemBackupRoutes(app: FastifyInstance) {
  // Add strict authorization hook (fixes SSE event targeting)
  app.addHook("preHandler", async (request, reply) => {
    const { requireAuth } = await import("../../auth/middleware");
    return requireAuth(request, reply);
  });

  /**
   * POST /admin/backups - Create system backup
   */
  app.post<{ Body: SystemBackupOptions }>(
    "/",
    systemBackupHandlers.handleCreateSystemBackup
  );

  /**
   * GET /admin/backups - List system backups
   */
  app.get<{
    Querystring: { page?: number; pageSize?: number };
  }>("/", systemBackupHandlers.handleListSystemBackups);

  /**
   * GET /admin/backups/:id/download - Download system backup
   */
  app.get<{
    Params: { id: string };
    Querystring: { password?: string };
  }>("/:id/download", systemBackupHandlers.handleDownloadSystemBackup);

  /**
   * DELETE /admin/backups/:id - Delete system backup
   */
  app.delete<{
    Params: { id: string };
  }>("/:id", systemBackupHandlers.handleDeleteSystemBackup);

  /**
   * POST /admin/backups/:id/restore - Restore system backup (DANGEROUS!)
   */
  app.post<{
    Params: { id: string };
    Body: { confirmation?: string; password?: string };
  }>("/:id/restore", systemBackupHandlers.handleRestoreSystemBackup);
}
