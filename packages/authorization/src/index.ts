import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Database } from "@workspace/db";
import * as casbin from "casbin";
import { CasbinDrizzleAdapter } from "./adapter/drizzle-adapter";
import type { AuthorizationConfig } from "./config";
import { registerConditionFunctions } from "./functions/conditions";

export { casbinRules } from "@workspace/db/schema";
export { CasbinDrizzleAdapter } from "./adapter/drizzle-adapter";
export type {
  AuditContext,
  AuditLogFilters,
  AuditLogQueryResult,
} from "./audit/service";
export { AuthorizationAuditService } from "./audit/service";
export type { AuthorizationConfig } from "./config";
export { isOwner, isShared } from "./functions/conditions";
export * from "./roles/index";
export * from "./types";
export {
  createViolationManager,
  type ViolationControl,
  ViolationManager,
  ViolationSeverity,
} from "./violations";

/**
 * Create a fully configured Casbin enforcer for authorization
 *
 * Multi-App RBAC with dynamic conditions:
 * - Request format: (sub, app, tenant, obj, act, resourceOwnerId)
 * - Policy format: (sub, app, tenant, obj, act, eft, condition)
 * - Grouping format: (user, role, app, tenant)
 *
 * @param db Database instance for policy persistence
 * @param config Optional configuration for the enforcer
 * @returns Configured Casbin enforcer instance
 */
export async function createAuthorization(
  db: Database,
  config?: AuthorizationConfig
): Promise<casbin.Enforcer> {
  // Load the RBAC model from model.conf
  const modelPath = join(dirname(fileURLToPath(import.meta.url)), "model.conf");

  // Create the Drizzle adapter for persistence
  const adapter = new CasbinDrizzleAdapter(db);

  // Create the enforcer
  const enforcer = await casbin.newEnforcer(modelPath, adapter);

  // Register custom condition functions
  registerConditionFunctions(enforcer);

  // Enable auto-save to persist policy changes to database
  enforcer.enableAutoSave(config?.autoSave ?? true);

  return enforcer;
}

export type Authorization = casbin.Enforcer;
