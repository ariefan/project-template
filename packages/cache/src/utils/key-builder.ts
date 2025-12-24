/**
 * Build a cache key for authorization checks
 * Format: authz:{userId}:{orgId}:{resource}:{action}
 */
export function buildAuthzKey(
  userId: string,
  orgId: string,
  resource: string,
  action: string
): string {
  return `authz:${userId}:${orgId}:${resource}:${action}`;
}

/**
 * Build a pattern to invalidate cache for a specific user and optionally organization
 * Pattern: authz:{userId}:* or authz:{userId}:{orgId}:*
 */
export function buildAuthzPatternForUser(
  userId: string,
  orgId?: string
): string {
  if (orgId) {
    return `authz:${userId}:${orgId}:*`;
  }
  return `authz:${userId}:*`;
}

/**
 * Build a pattern to invalidate cache for an entire organization
 * Pattern: authz:*:{orgId}:*
 */
export function buildAuthzPatternForOrg(orgId: string): string {
  return `authz:*:${orgId}:*`;
}
