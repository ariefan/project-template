import type { FastifyInstance } from "fastify";
import { exportRoutes } from "./routes/export";
import { schedulesRoutes } from "./routes/schedules";
import { templatesRoutes } from "./routes/templates";

export function reportsModule(app: FastifyInstance) {
  templatesRoutes(app);
  schedulesRoutes(app);
  exportRoutes(app);
}

// Re-export services for cross-module communication
export * as schedulesService from "./services/schedules.service";
export * as templatesService from "./services/templates.service";
