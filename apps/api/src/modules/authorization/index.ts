import type { FastifyInstance } from "fastify";
import { orgAuditLogRoutes } from "./audit-log-routes";
import { roleRoutes } from "./role-routes";
import { userRoleRoutes } from "./user-role-routes";
import { violationRoutes } from "./violation-routes";

export { platformAuditLogRoutes } from "./audit-log-routes";
export { contextRoutes } from "./context-routes";
export { globalRoleRoutes } from "./global-role-routes";

export function authorizationModule(app: FastifyInstance) {
  // Multi-app RBAC routes
  roleRoutes(app);
  userRoleRoutes(app);

  // Violation management (emergency lockdown, permission suspension)
  violationRoutes(app);

  // Audit log queries
  orgAuditLogRoutes(app);
}
