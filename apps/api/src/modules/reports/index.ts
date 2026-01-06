import type { FastifyInstance } from "fastify";
import { exportRoutes } from "./routes/export";
import { jobsRoutes } from "./routes/jobs";
import { schedulesRoutes } from "./routes/schedules";
import { templatesRoutes } from "./routes/templates";

export function reportsModule(app: FastifyInstance) {
  templatesRoutes(app);
  schedulesRoutes(app);
  jobsRoutes(app);
  exportRoutes(app);
}

// Re-export queue
export { createReportQueue, type ReportQueue } from "./queue/report-queue";
// Re-export services for cross-module communication
export * as jobsService from "./services/jobs.service";
export * as schedulesService from "./services/schedules.service";
export * as templatesService from "./services/templates.service";
