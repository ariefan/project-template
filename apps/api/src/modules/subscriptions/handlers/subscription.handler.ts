import { jobHandlerRegistry } from "../../jobs/handlers/registry";
import type { JobContext, JobResult } from "../../jobs/handlers/types";
import * as subscriptionJobsService from "../services/subscription-jobs.service";

/**
 * Handler for subscription maintenance jobs
 */
export async function subscriptionMaintenanceHandler(
  context: JobContext
): Promise<JobResult> {
  const { type } = context;

  try {
    if (type === "subscriptions:monitor") {
      await subscriptionJobsService.runSubscriptionMonitor();
      return { output: { success: true } };
    }

    return {
      error: {
        code: "INVALID_TYPE",
        message: `Unhandled subscription job type: ${type}`,
      },
    };
  } catch (error) {
    return {
      error: {
        code: "MAINTENANCE_ERROR",
        message: error instanceof Error ? error.message : String(error),
        retryable: true,
      },
    };
  }
}

/**
 * Register subscription job handlers
 */
export function registerSubscriptionHandlers() {
  jobHandlerRegistry.register({
    type: "subscriptions:monitor",
    handler: subscriptionMaintenanceHandler,
    concurrency: 1,
  });
}
