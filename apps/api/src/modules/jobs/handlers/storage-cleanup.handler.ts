import { filesService } from "../../files";
import { jobHandlerRegistry } from "./registry";
import type { JobContext, JobResult } from "./types";

const JOB_TYPE = "system:storage-cleanup";

/**
 * Handler for cleaning up expired file uploads
 */
async function storageCleanupHandler(context: JobContext): Promise<JobResult> {
  const { helpers } = context;

  await helpers.log("Starting storage cleanup job");

  try {
    const expiredUploadsCount = await filesService.cleanupExpiredUploads();
    const expiredFilesCount = await filesService.cleanupTemporaryFiles();

    await helpers.log(
      `Cleanup completed. Removed ${expiredUploadsCount} expired uploads and ${expiredFilesCount} temporary files`
    );

    return {
      output: {
        expiredUploadsCount,
        expiredFilesCount,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await helpers.log(`Cleanup failed: ${message}`);

    return {
      error: {
        code: "CLEANUP_FAILED",
        message: "Failed to cleanup expired uploads",
      },
    };
  }
}

/**
 * Register the storage cleanup handler
 */
export function registerStorageCleanupHandler() {
  jobHandlerRegistry.register({
    type: JOB_TYPE,
    handler: storageCleanupHandler,
    concurrency: 1, // Run one at a time to avoid race conditions
    retryLimit: 3,
  });
}
