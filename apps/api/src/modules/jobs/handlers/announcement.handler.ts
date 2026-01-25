import { JobInputSchemas, JobType } from "@workspace/contracts/jobs";
import { jobHandlerRegistry } from "./registry";
import type { JobContext, JobResult } from "./types";

/**
 * Handle announcement processing (e.g., sending push notifications, updating index)
 */
async function handleAnnouncementProcess(
  context: JobContext
): Promise<JobResult> {
  const { input, helpers } = context;
  const { announcementId, action = "notify" } = input as {
    announcementId: string;
    action: string;
  };

  try {
    await helpers.updateProgress(
      0,
      `Starting ${action} for announcement ${announcementId}`
    );

    // Simulate some async work (e.g., notifying subscribers)
    await helpers.updateProgress(50, `Processing ${action}...`);
    // In a real app, you would fetch the announcement and send emails/push notifications here.

    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate IO

    await helpers.updateProgress(100, "Processing completed");

    return {
      output: {
        announcementId,
        action,
        status: "success",
        processedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      error: {
        code: "PROCESS_FAILED",
        message,
        retryable: true,
      },
    };
  }
}

/**
 * Register the announcement process job handler
 */
export function registerAnnouncementHandler(): void {
  jobHandlerRegistry.register({
    type: JobType.ANNOUNCEMENT_PROCESS,
    handler: handleAnnouncementProcess,
    validationSchema: JobInputSchemas[JobType.ANNOUNCEMENT_PROCESS],
    concurrency: 5,
    retryLimit: 2,
    // UI metadata
    label: "Process Announcement",
    description:
      "Automated processing for new announcements (notifications, indexing)",
  });
}
