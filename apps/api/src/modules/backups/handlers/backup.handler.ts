import type { FileRow } from "@workspace/db/schema";
import { jobHandlerRegistry } from "../../jobs/handlers/registry";
import type { JobContext, JobResult } from "../../jobs/handlers/types";
import { storageProvider } from "../../storage/storage";
import * as backupsRepo from "../repositories/backups.repository";
import * as backupService from "../services/backup.service";
import { createBackupArchive } from "../services/backup-archiver";

/**
 * Handler for org backup creation jobs
 */
async function handleOrgBackupCreate(context: JobContext): Promise<JobResult> {
  const { input, helpers } = context;
  const { backupId, organizationId, includeFiles, encrypt, password } =
    input as {
      backupId: string;
      organizationId: string;
      includeFiles?: boolean;
      encrypt?: boolean;
      password?: string;
    };

  const startTime = Date.now();

  try {
    const updateProgress = async (progress: number, message: string) => {
      await helpers.updateProgress(progress, message);
      await backupsRepo.updateBackupStatus(backupId, "in_progress", {
        metadata: {
          progress,
          status: message,
          includesFiles: includeFiles !== false,
          isEncrypted: encrypt === true,
        },
      });
    };

    await updateProgress(0, "Starting backup");

    await updateProgress(10, "Exporting organization data");

    // Export org data
    const { data, rowCounts } =
      await backupService.exportOrgData(organizationId);

    const message = encrypt
      ? "Creating and encrypting archive"
      : "Creating backup archive";
    await updateProgress(50, message);

    // Filter files if includeFiles is false (default true)
    const filesToBackup =
      includeFiles !== false ? ((data.files || []) as FileRow[]) : [];

    // Create zip archive
    const { buffer, size, checksum } = await createBackupArchive(
      organizationId,
      data,
      filesToBackup,
      encrypt ? password : undefined
    );

    await updateProgress(80, "Uploading backup archive");

    // Upload to storage
    const fileName = `backup-${backupId}.zip`;
    const storagePath = `backups/${organizationId}/${fileName}`;

    await storageProvider.upload(storagePath, buffer, "application/zip");

    await updateProgress(90, "Finalizing backup");

    // Mark as completed
    await backupsRepo.updateBackupStatus(backupId, "completed", {
      completedAt: new Date(),
      filePath: storagePath,
      fileSize: size,
      checksum,
      metadata: { rowCounts, duration: Date.now() - startTime },
    });

    return {
      output: {
        backupId,
        totalRows: Object.values(rowCounts).reduce((a, b) => a + b, 0),
        tables: Object.keys(data).length,
        fileSize: size,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await backupsRepo.updateBackupStatus(backupId, "failed", {
      metadata: { error: message },
    });

    return {
      error: {
        code: "BACKUP_FAILED",
        message,
        retryable: true,
      },
    };
  }
}

/**
 * Handler for backup cleanup job
 */
async function handleBackupCleanup(context: JobContext): Promise<JobResult> {
  const { helpers } = context;

  try {
    await helpers.log("Starting backup cleanup");

    const expiredBackups = await backupsRepo.findExpiredBackups();
    let deletedCount = 0;

    for (const backup of expiredBackups) {
      // Delete file from storage first
      if (backup.filePath) {
        try {
          await storageProvider.delete(backup.filePath);
        } catch {
          // Log but continue - don't fail cleanup for storage issues
        }
      }
      await backupsRepo.deleteBackup(backup.id);
      deletedCount++;
    }

    await helpers.log(`Deleted ${deletedCount} expired backups`);

    return {
      output: { deletedCount },
    };
  } catch (error) {
    return {
      error: {
        code: "CLEANUP_FAILED",
        message: error instanceof Error ? error.message : String(error),
        retryable: true,
      },
    };
  }
}

/**
 * Register backup job handlers
 */
export function registerBackupHandlers() {
  jobHandlerRegistry.register({
    type: "backups:create",
    handler: handleOrgBackupCreate,
    concurrency: 2,
    retryLimit: 3,
    expireInSeconds: 3600,
    label: "Organization Backup",
    description: "Create a backup of organization data",
    exampleConfig: { organizationId: "org_xxx" },
  });

  jobHandlerRegistry.register({
    type: "backups:cleanup",
    handler: handleBackupCleanup,
    concurrency: 1,
    retryLimit: 3,
  });
}
