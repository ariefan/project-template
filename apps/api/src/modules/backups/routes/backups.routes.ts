import type { zCreateBackupRequest } from "@workspace/contracts";
import type { FastifyInstance } from "fastify";
import type { z } from "zod";
import * as jobsService from "../../jobs/services/jobs.service";
import * as backupsRepo from "../repositories/backups.repository";
import * as backupService from "../services/backup.service";
import * as restoreService from "../services/restore.service";

/**
 * Strip null values from object (convert to undefined for Zod compatibility)
 */
function stripNulls<T extends Record<string, unknown>>(
  obj: T
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Create standard response meta
 */
function createMeta(request: { id: string }) {
  return {
    requestId: request.id,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Backup routes
 */
export function backupsRoutes(app: FastifyInstance) {
  // Add strict authorization hook (fixes SSE event targeting)
  app.addHook("preHandler", async (request, reply) => {
    const { requireAuth } = await import("../../auth/middleware");
    return requireAuth(request, reply);
  });

  /**
   * POST /backups - Create a new backup
   */
  app.post<{
    Params: { orgId: string };
    Body: z.infer<typeof zCreateBackupRequest>;
  }>("/:orgId/backups", async (request, reply) => {
    const { orgId } = request.params;
    const { includeFiles, encrypt, password } = request.body;
    const userId = (request as { userId?: string }).userId ?? "system";

    try {
      // Check backup limits
      const count = await backupsRepo.countBackups(orgId);
      const limits = backupService.getBackupLimits("free"); // TODO: Get from subscription

      if (count >= limits.maxBackups) {
        return reply.status(400).send({
          error: {
            code: "BACKUP_LIMIT_EXCEEDED",
            message: `Maximum ${limits.maxBackups} backups allowed`,
          },
        });
      }

      // Create backup record
      const backup = await backupService.createOrgBackup(
        orgId,
        userId,
        "free",
        {
          includeFiles,
          encrypt,
          password,
        }
      );

      // Enqueue backup job for async processing
      await jobsService.createAndEnqueueJob({
        type: "backup:org-create",
        orgId,
        createdBy: userId,
        input: {
          backupId: backup.id,
          organizationId: orgId,
          includeFiles,
          encrypt,
          password,
        },
      });

      return reply.status(202).send({
        data: stripNulls(backup),
        meta: createMeta(request),
      });
    } catch (error) {
      request.log.error(error, "Failed to create backup");
      return reply.status(500).send({
        error: {
          code: "BACKUP_CREATE_FAILED",
          message: "Failed to create backup",
        },
      });
    }
  });

  /**
   * GET /backups - List backups
   */
  app.get<{
    Params: { orgId: string };
    Querystring: { page?: number; pageSize?: number };
  }>("/:orgId/backups", async (request, reply) => {
    const { orgId } = request.params;
    const { page = 1, pageSize = 20 } = request.query;
    const offset = (page - 1) * pageSize;

    try {
      const backupsList = await backupsRepo.listBackups(orgId, {
        limit: pageSize,
        offset,
      });
      const totalCount = await backupsRepo.countBackups(orgId);
      const totalPages = Math.ceil(totalCount / pageSize);

      return reply.send({
        data: backupsList.map((b) => stripNulls(b)),
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
        },
        meta: createMeta(request),
      });
    } catch (error) {
      request.log.error(error, "Failed to list backups");
      return reply.status(500).send({
        error: {
          code: "BACKUP_LIST_FAILED",
          message: "Failed to list backups",
        },
      });
    }
  });

  /**
   * GET /backups/:id - Get backup details
   */
  app.get<{
    Params: { orgId: string; id: string };
  }>("/:orgId/backups/:id", async (request, reply) => {
    const { id, orgId } = request.params;

    try {
      const backup = await backupsRepo.getBackupById(id);

      if (!backup || backup.organizationId !== orgId) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Backup not found" },
        });
      }

      return reply.send({
        data: stripNulls(backup),
        meta: createMeta(request),
      });
    } catch (error) {
      request.log.error(error, "Failed to get backup");
      return reply.status(500).send({
        error: { code: "BACKUP_GET_FAILED", message: "Failed to get backup" },
      });
    }
  });

  /**
   * DELETE /backups/:id - Delete a backup
   */
  app.delete<{
    Params: { orgId: string; id: string };
  }>("/:orgId/backups/:id", async (request, reply) => {
    const { id, orgId } = request.params;

    try {
      const backup = await backupsRepo.getBackupById(id);

      if (!backup || backup.organizationId !== orgId) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Backup not found" },
        });
      }

      // TODO: Delete file from storage
      await backupsRepo.deleteBackup(id);

      return reply.status(204).send();
    } catch (error) {
      request.log.error(error, "Failed to delete backup");
      return reply.status(500).send({
        error: {
          code: "BACKUP_DELETE_FAILED",
          message: "Failed to delete backup",
        },
      });
    }
  });

  /**
   * GET /backups/:id/download - Download backup file
   */
  app.get<{
    Params: { orgId: string; id: string };
  }>("/:orgId/backups/:id/download", async (request, reply) => {
    const { id, orgId } = request.params;

    try {
      const backup = await backupsRepo.getBackupById(id);

      if (!backup || backup.organizationId !== orgId) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Backup not found" },
        });
      }

      if (backup.status !== "completed") {
        return reply.status(400).send({
          error: {
            code: "BACKUP_NOT_READY",
            message: "Backup is not completed yet",
          },
        });
      }

      // If backup has a file path (Phase 5+), redirect to storage download
      if (backup.filePath) {
        // Import storageProvider dynamically to avoid circular dependencies if any
        // or just ensure it's imported at top level
        const { storageProvider } = await import("../../storage/storage");

        const downloadUrl = await storageProvider.getPresignedDownloadUrl(
          backup.filePath
        );

        return reply.redirect(downloadUrl);
      }

      // Fallback: Generate JSON on the fly (Phase 4 legacy behavior)
      const { data } = await backupService.exportOrgData(orgId);

      reply.header("Content-Type", "application/json");
      reply.header(
        "Content-Disposition",
        `attachment; filename="backup-${backup.id}.json"`
      );
      return reply.send(data);
    } catch (error) {
      request.log.error(error, "Failed to download backup");
      return reply.status(500).send({
        error: {
          code: "BACKUP_DOWNLOAD_FAILED",
          message: "Failed to download backup",
        },
      });
    }
  });

  /**
   * POST /backups/:id/restore - Restore from backup
   */
  app.post<{
    Params: { orgId: string; id: string };
    Body: { strategy?: "skip" | "overwrite" | "wipe_and_replace" };
  }>("/:orgId/backups/:id/restore", async (request, reply) => {
    const { orgId, id } = request.params;
    const { strategy = "skip" } = request.body ?? {};

    try {
      const backup = await backupsRepo.getBackupById(id);

      if (!backup || backup.organizationId !== orgId) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Backup not found" },
        });
      }

      if (backup.status !== "completed" || !backup.filePath) {
        return reply.status(400).send({
          error: {
            code: "BACKUP_NOT_READY",
            message: "Backup is not completed or file is missing",
          },
        });
      }

      const result = await restoreService.restoreFromBackup(orgId, id, {
        strategy,
      });

      if (!result.success) {
        return reply.status(500).send({
          error: {
            code: "RESTORE_FAILED",
            message: "Restore completed with errors",
          },
          data: result,
        });
      }

      return reply.send({
        data: result,
        meta: createMeta(request),
      });
    } catch (error) {
      request.log.error(error, "Failed to restore backup");
      return reply.status(500).send({
        error: {
          code: "RESTORE_FAILED",
          message: "Failed to restore backup",
        },
      });
    }
  });
}
