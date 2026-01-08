import type { FastifyInstance } from "fastify";
import { storageRoutes } from "./routes";

export { storageProvider } from "./storage";

export async function storageModule(app: FastifyInstance) {
  await app.register(storageRoutes);
}

// Re-export routes for direct registration
export { storageRoutes } from "./routes";
