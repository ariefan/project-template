import type { FastifyInstance } from "fastify";
import { applicationRoutes } from "./routes/applications";

export async function applicationsModule(app: FastifyInstance) {
  await app.register(applicationRoutes);
}

export { applicationRoutes } from "./routes/applications";
