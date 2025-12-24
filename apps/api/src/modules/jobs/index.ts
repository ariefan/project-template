import type { FastifyInstance } from "fastify";
import { jobsRoutes } from "./routes/jobs";

/**
 * Jobs module
 * Provides async job management endpoints
 */
export function jobsModule(app: FastifyInstance) {
  jobsRoutes(app);
}

// Re-export service for use by other modules
export * as jobsService from "./services/jobs.service";
