import type { FastifyInstance } from "fastify";
import { ssoProviderRoutes } from "./routes/sso-providers";

export function organizationsModule(app: FastifyInstance) {
  ssoProviderRoutes(app);
}
