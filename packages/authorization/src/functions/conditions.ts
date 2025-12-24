import type { Enforcer } from "casbin";

/**
 * Condition functions for dynamic authorization checks
 *
 * These functions are registered with the Casbin enforcer and called
 * during policy evaluation when a condition is specified in the policy.
 *
 * Condition IDs (stored in policy v6):
 * - "" (empty): no condition, always applies
 * - "owner": isOwner(sub, resourceOwnerId) must return true
 * - "shared": isShared(sub, resourceId) must return true
 */

/**
 * Check if the user is the owner of the resource
 *
 * Used in Casbin matcher:
 * (p.condition == "owner" && isOwner(r.sub, r.resourceOwnerId))
 *
 * @param userId - The user ID (from request subject)
 * @param resourceOwnerId - The owner ID of the resource
 * @returns true if userId matches resourceOwnerId
 */
export function isOwner(userId: string, resourceOwnerId: string): boolean {
  // Empty owner ID means no owner check needed (resource has no owner)
  if (!resourceOwnerId) {
    return true;
  }
  return userId === resourceOwnerId;
}

/**
 * Check if the resource is shared with the user
 *
 * Used in Casbin matcher:
 * (p.condition == "shared" && isShared(r.sub, r.resourceId))
 *
 * @param userId - The user ID (from request subject)
 * @param resourceId - The resource ID to check sharing for
 * @returns true if resource is shared with user
 */
export function isShared(userId: string, resourceId: string): boolean {
  // TODO: Implement actual sharing check
  // This would query a sharing table to check if resourceId is shared with userId
  // For now, return false (no sharing)
  if (!(userId && resourceId)) {
    return false;
  }
  return false;
}

/**
 * Register all condition functions with the Casbin enforcer
 *
 * Must be called after creating the enforcer but before using it.
 *
 * @param enforcer - The Casbin enforcer instance
 */
export function registerConditionFunctions(enforcer: Enforcer): void {
  // Register isOwner function
  // Casbin will call this with string arguments from the matcher
  enforcer.addFunction("isOwner", (...args: string[]) => {
    const [userId, resourceOwnerId] = args;
    return isOwner(userId ?? "", resourceOwnerId ?? "");
  });

  // Register isShared function
  enforcer.addFunction("isShared", (...args: string[]) => {
    const [userId, resourceId] = args;
    return isShared(userId ?? "", resourceId ?? "");
  });
}

/**
 * Condition type enum for type safety
 */
export const ConditionType = {
  NONE: "",
  OWNER: "owner",
  SHARED: "shared",
} as const;

export type ConditionType = (typeof ConditionType)[keyof typeof ConditionType];
