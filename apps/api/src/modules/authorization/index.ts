import type { FastifyInstance } from "fastify";
import { authorizationRoutes } from "./routes";

export function authorizationModule(app: FastifyInstance) {
  authorizationRoutes(app);
}
