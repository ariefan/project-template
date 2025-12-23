import { db, eq, members } from "@workspace/db";
import type { Enforcer } from "../types";

/**
 * Sync a user's role in an organization with Casbin
 * Removes old roles and adds the new one
 *
 * @param enforcer Casbin enforcer instance
 * @param userId User ID from better-auth
 * @param orgId Organization ID
 * @param role New role to assign (owner, admin, member, viewer)
 */
export async function syncMemberRole(
  enforcer: Enforcer,
  userId: string,
  orgId: string,
  role: string
): Promise<void> {
  // Get all current role assignments for this user in this org
  const existingRoles = await enforcer.getFilteredGroupingPolicy(
    0,
    userId,
    orgId
  );

  // Remove all existing roles
  for (const existingRole of existingRoles) {
    const [subject, existingRoleStr, domain] = existingRole;
    if (subject && existingRoleStr && domain) {
      await enforcer.removeGroupingPolicy(subject, existingRoleStr, domain);
    }
  }

  // Add the new role
  await enforcer.addGroupingPolicy(userId, role, orgId);
}

/**
 * Remove all roles for a user in an organization
 * Used when removing a member from the org
 *
 * @param enforcer Casbin enforcer instance
 * @param userId User ID to remove
 * @param orgId Organization ID
 */
export async function removeMemberRoles(
  enforcer: Enforcer,
  userId: string,
  orgId: string
): Promise<void> {
  const userRoles = await enforcer.getFilteredGroupingPolicy(0, userId, orgId);

  for (const roleRule of userRoles) {
    const [subject, roleStr, domain] = roleRule;
    if (subject && roleStr && domain) {
      await enforcer.removeGroupingPolicy(subject, roleStr, domain);
    }
  }
}

/**
 * Sync all organization members from better-auth to Casbin
 * Use this for initial setup or recovery after data drift
 *
 * @param enforcer Casbin enforcer instance
 * @param orgId Organization ID
 */
export async function syncAllOrgMembers(
  enforcer: Enforcer,
  orgId: string
): Promise<void> {
  // Fetch all members from better-auth organizations table
  const orgMembers = await db
    .select()
    .from(members)
    .where(eq(members.organizationId, orgId));

  // Remove all existing role assignments for this org
  const allRoles = await enforcer.getFilteredGroupingPolicy(1, orgId);
  for (const roleRule of allRoles) {
    const [subject, roleStr, domain] = roleRule;
    if (subject && roleStr && domain) {
      await enforcer.removeGroupingPolicy(subject, roleStr, domain);
    }
  }

  // Add all current members
  for (const member of orgMembers) {
    await syncMemberRole(
      enforcer,
      member.userId,
      member.organizationId,
      member.role
    );
  }
}
