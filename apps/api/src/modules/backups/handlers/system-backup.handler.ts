import type { FastifyReply, FastifyRequest } from "fastify";
import { jobHandlerRegistry } from "../../jobs/handlers/registry";
import type { JobContext, JobResult } from "../../jobs/handlers/types";
import * as backupsRepo from "../repositories/backups.repository";
import type { SystemBackupOptions } from "../services/system-backup.service";
import * as systemBackupService from "../services/system-backup.service";

interface ListBackupsQuery {
  page?: number;
  pageSize?: number;
}

interface DownloadBackupParams {
  id: string;
}

interface DownloadBackupQuery {
  password?: string;
}

interface DeleteBackupParams {
  id: string;
}

interface RestoreBackupParams {
  id: string;
}

interface RestoreBackupBody {
  confirmation?: string;
  password?: string;
}

/**
 * Handle creating a system backup
 */
export async function handleCreateSystemBackup(
  request: FastifyRequest<{ Body: SystemBackupOptions }>,
  reply: FastifyReply
) {
  const userId = request.user?.id;
  if (!userId) {
    return reply
      .status(401)
      .send({ error: { code: "UNAUTHORIZED", message: "User not found" } });
  }

  const { includeFiles, encrypt, password } =
    request.body ?? ({} as SystemBackupOptions);

  if (encrypt && !password) {
    return reply.status(400).send({
      error: {
        code: "PASSWORD_REQUIRED",
        message: "Password is required for encrypted backups",
      },
    });
  }

  try {
    // 1. Create the backup record immediately
    const backupId = await systemBackupService.createSystemBackupRecord(userId);

    // 2. Enqueue the background job
    const { createAndEnqueueJob } = await import(
      "../../jobs/services/jobs.service"
    );
    await createAndEnqueueJob({
      orgId: "system",
      type: "system:backup-create",
      createdBy: userId,
      input: {
        backupId,
        createdBy: userId,
        options: { includeFiles, encrypt, password },
      },
    });

    return reply.status(202).send({
      id: backupId,
      message: "System backup started",
    });
  } catch (error) {
    request.log.error(error, "Failed to create system backup");
    const message =
      error instanceof Error ? error.message : "Failed to create system backup";
    return reply.status(500).send({
      error: {
        code: "SYSTEM_BACKUP_FAILED",
        message,
      },
    });
  }
}

/**
 * Handle listing system backups
 */
export async function handleListSystemBackups(
  request: FastifyRequest<{ Querystring: ListBackupsQuery }>,
  reply: FastifyReply
) {
  const { page = 1, pageSize = 20 } = request.query;
  const offset = (page - 1) * pageSize;

  try {
    const backups = await backupsRepo.listSystemBackups({
      limit: pageSize,
      offset,
    });

    return reply.send({
      data: backups,
      meta: {
        page,
        pageSize,
      },
    });
  } catch (_error) {
    return reply.status(500).send({
      error: {
        code: "BACKUP_LIST_FAILED",
        message: "Failed to list system backups",
      },
    });
  }
}

/**
 * Handle downloading a system backup
 */
export async function handleDownloadSystemBackup(
  request: FastifyRequest<{
    Params: DownloadBackupParams;
    Querystring: DownloadBackupQuery;
  }>,
  reply: FastifyReply
) {
  const { id } = request.params;
  const { password } = request.query;

  try {
    const backup = await backupsRepo.getBackupById(id);

    if (!backup || backup.type !== "system") {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Backup not found" },
      });
    }

    if (backup.status !== "completed" || !backup.filePath) {
      return reply.status(400).send({
        error: {
          code: "BACKUP_NOT_READY",
          message: "Backup is not ready",
        },
      });
    }

    const meta = backup.metadata;
    const isEncrypted = meta?.isEncrypted === true;

    // Check if decryption is needed
    if (isEncrypted) {
      if (!password) {
        return reply.status(400).send({
          error: {
            code: "PASSWORD_REQUIRED",
            message: "Password is required to download encrypted backup",
          },
        });
      }

      if (!(meta?.iv && meta?.authTag)) {
        return reply.status(500).send({
          error: {
            code: "INVALID_ENCRYPTION_METADATA",
            message: "Backup encryption metadata is corrupted",
          },
        });
      }

      // Download, decrypt, and stream
      const { storageProvider } = await import("../../storage/storage");
      const { decryptBuffer } = await import("../services/backup-crypto");

      const encrypted = await storageProvider.download(backup.filePath);

      try {
        const decrypted = decryptBuffer(
          encrypted,
          password,
          meta.iv,
          meta.authTag
        );

        const filename = backup.filePath.split("/").pop() || "backup";
        reply.header(
          "Content-Disposition",
          `attachment; filename="${filename}"`
        );
        reply.header("Content-Type", "application/zip");
        return reply.send(decrypted);
      } catch (_error) {
        return reply.status(500).send({
          error: {
            code: "DECRYPTION_FAILED",
            message: "Failed to decrypt backup",
          },
        });
      }
    }

    // Not encrypted - redirect to presigned URL
    const { storageProvider } = await import("../../storage/storage");
    const downloadUrl = await storageProvider.getPresignedDownloadUrl(
      backup.filePath
    );

    return reply.redirect(downloadUrl);
  } catch (_error) {
    return reply.status(500).send({
      error: {
        code: "BACKUP_DOWNLOAD_FAILED",
        message: "Failed to download backup",
      },
    });
  }
}

/**
 * Handle deleting a system backup
 */
export async function handleDeleteSystemBackup(
  request: FastifyRequest<{ Params: DeleteBackupParams }>,
  reply: FastifyReply
) {
  const { id } = request.params;

  try {
    const backup = await backupsRepo.getBackupById(id);

    if (!backup || backup.type !== "system") {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Backup not found" },
      });
    }

    if (backup.filePath) {
      const { storageProvider } = await import("../../storage/storage");
      try {
        await storageProvider.delete(backup.filePath);
      } catch (e) {
        request.log.warn(e, "Failed to delete backup file from storage");
      }
    }

    await backupsRepo.deleteBackup(id);

    return reply.status(204).send();
  } catch (_error) {
    return reply.status(500).send({
      error: {
        code: "BACKUP_DELETE_FAILED",
        message: "Failed to delete backup",
      },
    });
  }
}

/**
 * Handle restoring a system backup
 */
export async function handleRestoreSystemBackup(
  request: FastifyRequest<{
    Params: RestoreBackupParams;
    Body: RestoreBackupBody;
  }>,
  reply: FastifyReply
) {
  const { id } = request.params;
  const { confirmation, password } = request.body ?? {};

  // Ensure we have a user ID for broadcasting events
  const userId = request.user?.id;
  if (!userId) {
    return reply
      .status(401)
      .send({ error: { code: "UNAUTHORIZED", message: "User not found" } });
  }

  // Require typing "RESTORE" to confirm
  if (confirmation !== "RESTORE") {
    return reply.status(400).send({
      error: {
        code: "CONFIRMATION_REQUIRED",
        message: "You must type 'RESTORE' to confirm this dangerous operation",
      },
    });
  }

  try {
    const backup = await backupsRepo.getBackupById(id);

    if (!backup || backup.type !== "system") {
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

    // Check if encrypted
    const meta = backup.metadata;
    const isEncrypted = meta?.isEncrypted === true;

    if (isEncrypted && !password) {
      return reply.status(400).send({
        error: {
          code: "PASSWORD_REQUIRED",
          message: "Password is required to restore encrypted backup",
        },
      });
    }

    // Get file buffer (download + decrypt)
    const fileBuffer = await getBackupFileBuffer(backup, password);

    // Run pg_restore
    await executePgRestore(fileBuffer, request.log);

    return reply.send({
      success: true,
      message: "System backup restored successfully",
    });
  } catch (error) {
    const isDecryptionError =
      error instanceof Error && error.message === "Incorrect password";

    if (isDecryptionError) {
      return reply.status(401).send({
        error: {
          code: "DECRYPTION_FAILED",
          message: "Incorrect password",
        },
      });
    }

    request.log.error(error, "Failed to restore system backup");
    return reply.status(500).send({
      error: {
        code: "RESTORE_FAILED",
        message:
          error instanceof Error
            ? error.message
            : "Failed to restore system backup",
      },
    });
  }
}

/**
 * Helper: Get backup file buffer (handles download & decryption)
 */
async function getBackupFileBuffer(
  backup: import("@workspace/db/schema").BackupRow,
  password?: string
): Promise<Buffer> {
  const { storageProvider } = await import("../../storage/storage");

  if (!backup.filePath) {
    throw new Error("Backup file path is missing");
  }

  let fileBuffer = await storageProvider.download(backup.filePath);

  const meta = backup.metadata;
  const isEncrypted = meta?.isEncrypted === true;

  if (isEncrypted && password && meta?.iv && meta?.authTag) {
    const { decryptBuffer } = await import("../services/backup-crypto");
    try {
      fileBuffer = decryptBuffer(fileBuffer, password, meta.iv, meta.authTag);
    } catch {
      throw new Error("Incorrect password");
    }
  }

  return fileBuffer;
}

/**
 * Helper: Execute pg_restore
 */
async function executePgRestore(
  fileBuffer: Buffer,
  log: FastifyRequest["log"]
): Promise<void> {
  const { spawn } = await import("node:child_process");
  const { env } = await import("../../../env");
  const dbUrl = new URL(env.DATABASE_URL);

  const restore = spawn(
    "pg_restore",
    [
      "-h",
      dbUrl.hostname,
      "-p",
      dbUrl.port || "5432",
      "-U",
      dbUrl.username,
      "-d",
      dbUrl.pathname.slice(1),
      "--clean", // Drop objects before recreating
      "--if-exists", // Don't error if objects don't exist
      "--no-owner",
      "--no-acl",
    ],
    {
      env: { ...process.env, PGPASSWORD: dbUrl.password },
    }
  );

  // Pipe backup data to stdin
  restore.stdin.write(fileBuffer);
  restore.stdin.end();

  const stderrChunks: Buffer[] = [];
  restore.stderr.on("data", (chunk) => stderrChunks.push(chunk));

  const exitCode = await new Promise<number>((resolve) => {
    restore.on("close", (code) => resolve(code ?? 1));
  });

  if (exitCode !== 0) {
    const stderr = Buffer.concat(stderrChunks).toString();
    log.error({ exitCode, stderr }, "pg_restore failed");
    throw new Error(`pg_restore failed: ${stderr}`);
  }
}
/**
 * Job Handler: System Backup Create
 */
async function handleSystemBackupCreate(
  context: JobContext
): Promise<JobResult> {
  const { input } = context;
  const { backupId, createdBy, options } = input as {
    backupId: string;
    createdBy: string;
    options: systemBackupService.SystemBackupOptions;
  };

  try {
    // Delegate to service
    await systemBackupService.processSystemBackup(
      backupId,
      createdBy,
      options,
      context.helpers
    );

    return {
      output: { backupId, success: true },
    };
  } catch (error) {
    return {
      error: {
        code: "SYSTEM_BACKUP_FAILED",
        message: error instanceof Error ? error.message : String(error),
        retryable: false,
      },
    };
  }
}

/**
 * Register system backup job handlers
 */
export function registerSystemBackupHandlers() {
  jobHandlerRegistry.register({
    type: "system:backup-create",
    handler: handleSystemBackupCreate,
    concurrency: 1,
    retryLimit: 1,
    label: "System Backup",
    description: "Create a full system backup (pg_dump)",
  });
}
