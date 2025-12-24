import type { FastifyInstance } from "fastify";
import { auditLogRoutes } from "./audit-log-routes";
import { contextRoutes } from "./context-routes";
import { roleRoutes } from "./role-routes";
import { userRoleRoutes } from "./user-role-routes";
import { violationRoutes } from "./violation-routes";

export function authorizationModule(app: FastifyInstance) {
  // Multi-app RBAC routes
  roleRoutes(app);
  userRoleRoutes(app);
  contextRoutes(app);

  // Violation management (emergency lockdown, permission suspension)
  violationRoutes(app);

  // Audit log queries
  auditLogRoutes(app);
}
