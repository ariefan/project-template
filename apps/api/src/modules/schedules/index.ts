import type { FastifyInstance } from "fastify";
import { schedulesRoutes } from "./routes/schedules";

export function schedulesModule(app: FastifyInstance) {
  schedulesRoutes(app);
}

export type { Scheduler, SchedulerConfig } from "./services/scheduler";
export { createScheduler } from "./services/scheduler";
// Re-export services for cross-module communication
export * as schedulesService from "./services/schedules.service";
