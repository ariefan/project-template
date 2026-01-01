"use client";

import { useQuery } from "@tanstack/react-query";
import type { UserEffectivePermissions } from "@workspace/contracts";
import { userPermissionsGetOptions } from "@workspace/contracts/query";
import { apiClient } from "@/lib/api-client";
import { useActiveOrganization, useSession } from "@/lib/auth";

/**
 * Hook to get the current user's effective permissions.
 *
 * Returns all permissions the user has in the current organization context,
 * including permissions inherited from all their roles.
 */
export function usePermissions() {
  const { data: session } = useSession();
  const { data: orgData } = useActiveOrganization();
  const userId = session?.user?.id;
  const orgId = orgData?.id;

  const { data, isLoading, error } = useQuery({
    ...userPermissionsGetOptions({
      client: apiClient,
      path: { orgId: orgId ?? "", userId: userId ?? "" },
    }),
    enabled: Boolean(userId && orgId),
  });

  const permissions = (data as { data?: UserEffectivePermissions })?.data;

  return {
    permissions,
    isLoading,
    error,
  };
}

/**
 * Helper to check if a permission matches.
 */
function checkPermission(
  permissions: UserEffectivePermissions,
  resource: string,
  action: string
): boolean {
  // Check allowedActions first (fast path) - format is "resource:action"
  if (permissions.allowedActions.includes(`${resource}:${action}`)) {
    return true;
  }

  // Check effective permissions for wildcard matches
  return permissions.effectivePermissions.some((p) => {
    // Wildcard resource match
    if (p.resource === "*") {
      return p.action === action || p.action === "*";
    }

    // Exact resource match
    if (p.resource === resource) {
      return p.action === action || p.action === "*";
    }

    return false;
  });
}

/**
 * Check if user has a specific permission.
 *
 * @param resource - The resource to check (e.g., "posts", "users", "roles")
 * @param action - The action to check (e.g., "read", "create", "update", "delete", "manage")
 * @returns boolean indicating if the user has the permission
 */
export function useCan(resource: string, action: string): boolean {
  const { permissions, isLoading } = usePermissions();

  if (isLoading || !permissions) {
    return false;
  }

  return checkPermission(permissions, resource, action);
}

/**
 * Hook to check multiple permissions at once.
 *
 * @param checks - Array of [resource, action] tuples to check
 * @returns boolean indicating if user has ANY of the permissions
 */
export function useCanAny(
  checks: [resource: string, action: string][]
): boolean {
  const { permissions, isLoading } = usePermissions();

  if (isLoading || !permissions) {
    return false;
  }

  return checks.some(([resource, action]) =>
    checkPermission(permissions, resource, action)
  );
}

/**
 * Hook to check if user has all specified permissions.
 *
 * @param checks - Array of [resource, action] tuples to check
 * @returns boolean indicating if user has ALL permissions
 */
export function useCanAll(
  checks: [resource: string, action: string][]
): boolean {
  const { permissions, isLoading } = usePermissions();

  if (isLoading || !permissions) {
    return false;
  }

  return checks.every(([resource, action]) =>
    checkPermission(permissions, resource, action)
  );
}
