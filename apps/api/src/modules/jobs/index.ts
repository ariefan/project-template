import type { FastifyInstance } from "fastify";
import { jobsRoutes } from "./routes/jobs";

/**
 * Jobs module
 * Provides async job management endpoints with pg-boss queue
 */
export function jobsModule(app: FastifyInstance) {
  jobsRoutes(app);
}

// Re-export handlers for registration
export {
  type JobContext,
  type JobHandler,
  type JobHandlerConfig,
  type JobResult,
  jobHandlerRegistry,
  registerReportHandler,
  registerTestHandler,
} from "./handlers";

// Re-export queue for initialization
export {
  createJobQueue,
  type JobQueue,
  type JobQueueConfig,
} from "./queue/job-queue";
// Re-export service for use by other modules
export * as jobsService from "./services/jobs.service";
