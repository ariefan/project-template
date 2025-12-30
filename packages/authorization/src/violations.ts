import type { Enforcer } from "casbin";

/**
 * Violation severity levels
 */
export const ViolationSeverity = {
  WARNING: "warning",
  MINOR: "minor",
  MAJOR: "major",
  CRITICAL: "critical",
} as const;

export type ViolationSeverity =
  (typeof ViolationSeverity)[keyof typeof ViolationSeverity];

/**
 * Violation control options
 */
export interface ViolationControl {
  orgId: string;
  resource: string;
  action: string;
  severity: ViolationSeverity;
  reason: string;
  expiresAt?: Date;
}

/**
 * Helper functions for managing tenant violations using deny policies
 */
export class ViolationManager {
  private readonly enforcer: Enforcer;

  constructor(enforcer: Enforcer) {
    this.enforcer = enforcer;
  }

  /**
   * Suspend a specific permission for an organization due to violation
   * Creates a deny policy that overrides all allow policies
   */
  async suspendPermission(params: ViolationControl): Promise<boolean> {
    const { orgId, resource, action } = params;

    // Use wildcard role (*) to deny permission for all roles in the org
    const added = await this.enforcer.addPolicy(
      "*",
      orgId,
      resource,
      action,
      "deny"
    );

    return added;
  }

  /**
   * Restore a suspended permission for an organization
   * Removes the deny policy
   */
  async restorePermission(params: {
    orgId: string;
    resource: string;
    action: string;
  }): Promise<boolean> {
    const { orgId, resource, action } = params;

    const removed = await this.enforcer.removePolicy(
      "*",
      orgId,
      resource,
      action,
      "deny"
    );

    return removed;
  }

  /**
   * Suspend all permissions for a resource in an organization
   * Useful for complete resource lockdown
   */
  async suspendResource(params: {
    orgId: string;
    resource: string;
    severity: ViolationSeverity;
    reason: string;
  }): Promise<boolean> {
    const { orgId, resource } = params;

    // Deny all actions on the resource
    const actions = ["read", "write", "delete", "manage"];
    const results = await Promise.all(
      actions.map((action) =>
        this.enforcer.addPolicy("*", orgId, resource, action, "deny")
      )
    );

    return results.every((result) => result);
  }

  /**
   * Restore all permissions for a resource in an organization
   */
  async restoreResource(params: {
    orgId: string;
    resource: string;
  }): Promise<boolean> {
    const { orgId, resource } = params;

    // Remove all deny policies for this resource
    const actions = ["read", "write", "delete", "manage"];
    const results = await Promise.all(
      actions.map((action) =>
        this.enforcer.removePolicy("*", orgId, resource, action, "deny")
      )
    );

    return results.some((result) => result);
  }

  /**
   * Suspend entire organization (emergency lockdown)
   * Denies all permissions across all resources
   */
  async suspendOrganization(params: {
    orgId: string;
    severity: ViolationSeverity;
    reason: string;
  }): Promise<boolean> {
    const { orgId } = params;

    // Deny all actions on all resources for the organization
    const resources = ["posts", "users", "settings", "billing", "api"];
    const actions = ["read", "write", "delete", "manage"];

    const results = await Promise.all(
      resources.flatMap((resource) =>
        actions.map((action) =>
          this.enforcer.addPolicy("*", orgId, resource, action, "deny")
        )
      )
    );

    return results.every((result) => result);
  }

  /**
   * Restore organization access
   * Removes all deny policies for the organization
   */
  async restoreOrganization(params: { orgId: string }): Promise<boolean> {
    const { orgId } = params;

    // Get all deny policies for this organization
    const policies = await this.enforcer.getFilteredPolicy(1, orgId);
    const denyPolicies = policies.filter((policy) => policy[4] === "deny");

    // Remove all deny policies
    const results = await Promise.all(
      denyPolicies.map((policy) =>
        this.enforcer.removePolicy(
          policy[0] ?? "",
          policy[1] ?? "",
          policy[2] ?? "",
          policy[3] ?? "",
          policy[4] ?? ""
        )
      )
    );

    return results.some((result) => result);
  }

  /**
   * Check if an organization has any active violations
   */
  async hasViolations(orgId: string): Promise<boolean> {
    const policies = await this.enforcer.getFilteredPolicy(1, orgId);
    return policies.some((policy) => policy[4] === "deny");
  }

  /**
   * Get all active violations for an organization
   */
  async getViolations(orgId: string): Promise<
    Array<{
      role: string;
      resource: string;
      action: string;
      effect: string;
    }>
  > {
    const policies = await this.enforcer.getFilteredPolicy(1, orgId);
    return policies
      .filter((policy) => policy[4] === "deny")
      .map((policy) => ({
        role: policy[0] ?? "",
        resource: policy[2] ?? "",
        action: policy[3] ?? "",
        effect: policy[4] ?? "",
      }));
  }
}

/**
 * Create a violation manager instance
 */
export function createViolationManager(enforcer: Enforcer): ViolationManager {
  return new ViolationManager(enforcer);
}
