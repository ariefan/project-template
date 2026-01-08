import type { FastifyInstance } from "fastify";
import { exportRoutes } from "./routes/export";
import { templatesRoutes } from "./routes/templates";

export function reportsModule(app: FastifyInstance) {
  templatesRoutes(app);
  exportRoutes(app);
}

// Re-export services for cross-module communication
export * as templatesService from "./services/templates.service";
