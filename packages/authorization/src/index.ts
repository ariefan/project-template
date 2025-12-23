import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as casbin from "casbin";
import { CasbinDrizzleAdapter } from "./adapter/drizzle-adapter";
import type { AuthorizationConfig } from "./config";

export { casbinRules } from "@workspace/db/schema";
export { CasbinDrizzleAdapter } from "./adapter/drizzle-adapter";
export type { AuthorizationConfig } from "./config";
export * from "./policies/index";
export * from "./types";

/**
 * Create a fully configured Casbin enforcer for authorization
 *
 * @param config Optional configuration for the enforcer
 * @returns Configured Casbin enforcer instance
 */
export async function createAuthorization(
  config?: AuthorizationConfig
): Promise<casbin.Enforcer> {
  // Load the RBAC model from model.conf
  const modelPath = join(dirname(fileURLToPath(import.meta.url)), "model.conf");

  // Create the Drizzle adapter for persistence
  const adapter = new CasbinDrizzleAdapter();

  // Create the enforcer
  const enforcer = await casbin.newEnforcer(modelPath, adapter);

  // Enable auto-save to persist policy changes to database
  enforcer.enableAutoSave(config?.autoSave ?? true);

  return enforcer;
}

// Create a default instance for convenience
export const authorization = await createAuthorization();

export type Authorization = casbin.Enforcer;
