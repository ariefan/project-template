import { JobInputSchemas, JobType } from "@workspace/contracts/jobs";
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
    if (type === JobType.SUBSCRIPTIONS_MONITOR) {
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
    type: JobType.SUBSCRIPTIONS_MONITOR,
    handler: subscriptionMaintenanceHandler,
    validationSchema: JobInputSchemas[JobType.SUBSCRIPTIONS_MONITOR],
    concurrency: 1,
    label: "Subscription Monitor",
    description: "Monitor and process subscription renewals and expirations",
    category: "maintenance",
    hidden: true,
  });
}
