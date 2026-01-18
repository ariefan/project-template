import type { FastifyInstance } from "fastify";
import * as backupsRepo from "../repositories/backups.repository";
import * as backupService from "../services/backup.service";

/**
 * Backup routes
 */
export function backupsRoutes(app: FastifyInstance) {
  /**
   * POST /backups - Create a new backup
   */
  app.post<{
    Params: { orgId: string };
  }>("/:orgId/backups", async (request, reply) => {
    const { orgId } = request.params;
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
      const backup = await backupService.createOrgBackup(orgId, userId);

      // TODO: Enqueue backup job
      // await jobsService.createAndEnqueueJob({ type: 'backup:org-create', ... });

      return reply.status(201).send({ data: backup });
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
    Querystring: { limit?: number; offset?: number };
  }>("/:orgId/backups", async (request, reply) => {
    const { orgId } = request.params;
    const { limit = 20, offset = 0 } = request.query;

    try {
      const backupsList = await backupsRepo.listBackups(orgId, {
        limit,
        offset,
      });
      return reply.send({ data: backupsList });
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

      return reply.send({ data: backup });
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
}
