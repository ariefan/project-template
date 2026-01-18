import { jobHandlerRegistry } from "../../jobs/handlers/registry";
import type { JobContext, JobResult } from "../../jobs/handlers/types";
import * as backupsRepo from "../repositories/backups.repository";
import * as backupService from "../services/backup.service";

/**
 * Handler for org backup creation jobs
 */
async function handleOrgBackupCreate(context: JobContext): Promise<JobResult> {
  const { input, helpers } = context;
  const { backupId, organizationId } = input as {
    backupId: string;
    organizationId: string;
  };

  try {
    await helpers.updateProgress(0, "Starting backup");

    // Update status to in_progress
    await backupsRepo.updateBackupStatus(backupId, "in_progress");

    await helpers.updateProgress(10, "Exporting organization data");

    // Export org data
    const { data, rowCounts } = backupService.exportOrgData(organizationId);

    await helpers.updateProgress(50, "Creating backup archive");

    // TODO: Create zip archive with JSON data and files
    // For now, just update metadata
    const totalRows = Object.values(rowCounts).reduce((a, b) => a + b, 0);

    await helpers.updateProgress(90, "Finalizing backup");

    // Mark as completed
    await backupsRepo.updateBackupStatus(backupId, "completed", {
      completedAt: new Date(),
      metadata: { rowCounts, duration: Date.now() },
    });

    return {
      output: {
        backupId,
        totalRows,
        tables: Object.keys(data).length,
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
      // TODO: Delete file from storage
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
    type: "backup:org-create",
    handler: handleOrgBackupCreate,
    concurrency: 2,
    retryLimit: 3,
    expireInSeconds: 3600,
    label: "Organization Backup",
    description: "Create a backup of organization data",
    exampleConfig: { organizationId: "org_xxx" },
  });

  jobHandlerRegistry.register({
    type: "system:backup-cleanup",
    handler: handleBackupCleanup,
    concurrency: 1,
    retryLimit: 3,
  });
}
