import type { Enforcer } from "../types";
import { ACTIONS, RESOURCES, ROLES } from "../types";

/**
 * Default permissions for each role
 * Maps roles to resources and allowed actions
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<
  string,
  Array<{ resource: string; actions: string[] }>
> = {
  [ROLES.OWNER]: [
    {
      resource: RESOURCES.POSTS,
      actions: [
        ACTIONS.READ,
        ACTIONS.CREATE,
        ACTIONS.UPDATE,
        ACTIONS.DELETE,
        ACTIONS.MANAGE,
      ],
    },
    {
      resource: RESOURCES.COMMENTS,
      actions: [
        ACTIONS.READ,
        ACTIONS.CREATE,
        ACTIONS.UPDATE,
        ACTIONS.DELETE,
        ACTIONS.MANAGE,
      ],
    },
    {
      resource: RESOURCES.USERS,
      actions: [
        ACTIONS.READ,
        ACTIONS.CREATE,
        ACTIONS.UPDATE,
        ACTIONS.DELETE,
        ACTIONS.MANAGE,
      ],
    },
    {
      resource: RESOURCES.SETTINGS,
      actions: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.MANAGE],
    },
    {
      resource: RESOURCES.INVITATIONS,
      actions: [ACTIONS.READ, ACTIONS.CREATE, ACTIONS.DELETE, ACTIONS.MANAGE],
    },
  ],
  [ROLES.ADMIN]: [
    {
      resource: RESOURCES.POSTS,
      actions: [ACTIONS.READ, ACTIONS.CREATE, ACTIONS.UPDATE, ACTIONS.DELETE],
    },
    {
      resource: RESOURCES.COMMENTS,
      actions: [ACTIONS.READ, ACTIONS.CREATE, ACTIONS.UPDATE, ACTIONS.DELETE],
    },
    {
      resource: RESOURCES.USERS,
      actions: [ACTIONS.READ, ACTIONS.MANAGE],
    },
    {
      resource: RESOURCES.SETTINGS,
      actions: [ACTIONS.READ, ACTIONS.UPDATE],
    },
    {
      resource: RESOURCES.INVITATIONS,
      actions: [ACTIONS.READ, ACTIONS.CREATE, ACTIONS.DELETE],
    },
  ],
  [ROLES.MEMBER]: [
    {
      resource: RESOURCES.POSTS,
      actions: [ACTIONS.READ, ACTIONS.CREATE, ACTIONS.UPDATE],
    },
    {
      resource: RESOURCES.COMMENTS,
      actions: [ACTIONS.READ, ACTIONS.CREATE, ACTIONS.UPDATE],
    },
    {
      resource: RESOURCES.USERS,
      actions: [ACTIONS.READ],
    },
    {
      resource: RESOURCES.SETTINGS,
      actions: [ACTIONS.READ],
    },
  ],
  [ROLES.VIEWER]: [
    {
      resource: RESOURCES.POSTS,
      actions: [ACTIONS.READ],
    },
    {
      resource: RESOURCES.COMMENTS,
      actions: [ACTIONS.READ],
    },
    {
      resource: RESOURCES.USERS,
      actions: [ACTIONS.READ],
    },
  ],
};

/**
 * Seed default role policies for a new organization
 * @param orgId Organization ID
 * @param enforcer Casbin enforcer instance
 */
export async function seedDefaultPolicies(
  orgId: string,
  enforcer: Enforcer
): Promise<void> {
  // Add all role policies for this organization
  for (const [role, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    for (const { resource, actions } of permissions) {
      for (const action of actions) {
        await enforcer.addPolicy(role, orgId, resource, action);
      }
    }
  }
}
