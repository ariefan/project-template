"use client";

import type { ReactNode } from "react";
import { useCan, useCanAll, useCanAny } from "@/hooks/use-permissions";

interface RequirePermissionProps {
  /**
   * The resource to check permission for (e.g., "posts", "users", "roles")
   */
  resource: string;

  /**
   * The action to check (e.g., "read", "create", "update", "delete", "manage")
   */
  action: string;

  /**
   * Content to render if user has permission
   */
  children: ReactNode;

  /**
   * Optional fallback to render if user doesn't have permission.
   * If not provided, nothing is rendered.
   */
  fallback?: ReactNode;
}

/**
 * Component that conditionally renders children based on user permissions.
 *
 * @example
 * ```tsx
 * <RequirePermission resource="posts" action="create">
 *   <CreatePostButton />
 * </RequirePermission>
 *
 * <RequirePermission
 *   resource="users"
 *   action="manage"
 *   fallback={<p>You don't have permission to manage users.</p>}
 * >
 *   <UserManagement />
 * </RequirePermission>
 * ```
 */
export function RequirePermission({
  resource,
  action,
  children,
  fallback = null,
}: RequirePermissionProps) {
  const hasPermission = useCan(resource, action);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface RequireAnyPermissionProps {
  /**
   * Array of [resource, action] tuples - user needs at least one
   */
  checks: [resource: string, action: string][];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component that renders children if user has ANY of the specified permissions.
 *
 * @example
 * ```tsx
 * <RequireAnyPermission
 *   checks={[
 *     ["posts", "create"],
 *     ["posts", "manage"],
 *   ]}
 * >
 *   <CreatePostButton />
 * </RequireAnyPermission>
 * ```
 */
export function RequireAnyPermission({
  checks,
  children,
  fallback = null,
}: RequireAnyPermissionProps) {
  const hasAnyPermission = useCanAny(checks);

  if (!hasAnyPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface RequireAllPermissionsProps {
  /**
   * Array of [resource, action] tuples - user needs ALL of them
   */
  checks: [resource: string, action: string][];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component that renders children only if user has ALL specified permissions.
 *
 * @example
 * ```tsx
 * <RequireAllPermissions
 *   checks={[
 *     ["users", "read"],
 *     ["roles", "read"],
 *   ]}
 * >
 *   <UserRoleAssignment />
 * </RequireAllPermissions>
 * ```
 */
export function RequireAllPermissions({
  checks,
  children,
  fallback = null,
}: RequireAllPermissionsProps) {
  const hasAllPermissions = useCanAll(checks);

  if (!hasAllPermissions) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
