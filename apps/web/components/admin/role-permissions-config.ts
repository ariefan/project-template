import type {
  PermissionAction,
  PermissionCondition,
  PermissionEffect,
  PermissionInput,
} from "@workspace/contracts";

/**
 * Resources synced with @workspace/authorization types.ts
 * @see packages/authorization/src/types.ts
 */
export const RESOURCES = [
  // Core resources from authorization package
  { key: "posts", label: "Posts" },
  { key: "comments", label: "Comments" },
  { key: "users", label: "Users" },
  { key: "settings", label: "Settings" },
  { key: "invitations", label: "Invitations" },
  // Additional app-specific resources
  { key: "roles", label: "Roles" },
  { key: "files", label: "Files" },
  { key: "webhooks", label: "Webhooks" },
  { key: "notifications", label: "Notifications" },
  { key: "audit-logs", label: "Audit Logs" },
] as const;

export const ACTIONS: PermissionAction[] = [
  "read",
  "create",
  "update",
  "delete",
  "manage",
];

export const CONDITIONS: { value: string; label: string }[] = [
  { value: "none", label: "Always" }, // Maps to "" in API
  { value: "owner", label: "Owner Only" },
  { value: "shared", label: "If Shared" },
];

export const EFFECTS: { value: PermissionEffect; label: string }[] = [
  { value: "allow", label: "Allow" },
  { value: "deny", label: "Deny" },
];

// Permission presets for simplified UI
export type PermissionPreset = "none" | "view" | "editor" | "full" | "custom";

export const PERMISSION_PRESETS: {
  value: PermissionPreset;
  label: string;
  description: string;
}[] = [
  {
    value: "none",
    label: "No Access",
    description: "Cannot access this resource",
  },
  { value: "view", label: "View Only", description: "Can only view/read" },
  {
    value: "editor",
    label: "Editor",
    description: "Can view, create, and edit",
  },
  { value: "full", label: "Full Access", description: "Complete control" },
];

// Permission details for a single resource-action pair
export interface PermissionDetail {
  effect: PermissionEffect;
  condition: string; // "none" = always (maps to "" in API), "owner", "shared"
}

// Full permission state: resource -> action -> details
export type PermissionState = Record<
  string,
  Record<string, PermissionDetail | null>
>;

// Map preset to granular actions
export function presetToActions(preset: PermissionPreset): PermissionAction[] {
  switch (preset) {
    case "none":
      return [];
    case "view":
      return ["read"];
    case "editor":
      return ["read", "create", "update"];
    case "full":
      return ["manage"];
    case "custom":
      return []; // Custom shouldn't be applied via preset
    default:
      return [];
  }
}

// Detect preset from current permission state
export function detectPreset(
  resourcePerms: Record<string, PermissionDetail | null>
): PermissionPreset {
  const enabledActions = ACTIONS.filter((a) => resourcePerms[a] !== null);

  // Check for non-default conditions or effects first
  for (const action of enabledActions) {
    const perm = resourcePerms[action];
    if (perm && (perm.condition !== "none" || perm.effect !== "allow")) {
      return "custom"; // Has advanced settings
    }
  }

  // Check for exact matches
  if (enabledActions.length === 0) {
    return "none";
  }
  if (enabledActions.includes("manage") && enabledActions.length === 1) {
    return "full";
  }
  if (enabledActions.length === 1 && enabledActions[0] === "read") {
    return "view";
  }

  if (
    enabledActions.length === 3 &&
    enabledActions.includes("read") &&
    enabledActions.includes("create") &&
    enabledActions.includes("update")
  ) {
    return "editor";
  }

  // No exact match = custom permissions
  return "custom";
}

// Check if current permissions match a preset exactly (for advanced mode detection)
export function isCustomPermissions(
  resourcePerms: Record<string, PermissionDetail | null>
): boolean {
  const enabledActions = ACTIONS.filter((a) => resourcePerms[a] !== null);
  if (enabledActions.length === 0) {
    return false;
  }
  if (enabledActions.includes("manage") && enabledActions.length === 1) {
    return false;
  }
  if (enabledActions.length === 1 && enabledActions[0] === "read") {
    return false;
  }
  if (
    enabledActions.length === 3 &&
    enabledActions.includes("read") &&
    enabledActions.includes("create") &&
    enabledActions.includes("update")
  ) {
    return false;
  }
  // Check for non-default conditions or deny effects
  for (const action of enabledActions) {
    const perm = resourcePerms[action];
    if (perm && (perm.condition !== "none" || perm.effect !== "allow")) {
      return true;
    }
  }
  const firstAction = enabledActions[0];
  return (
    enabledActions.length > 0 &&
    firstAction !== undefined &&
    !["read", "manage"].includes(firstAction)
  );
}

// Reducers to reduce hook complexity
export function togglePermissionReducer(
  prev: PermissionState,
  resource: string,
  action: string
): PermissionState {
  const newPerms = { ...prev };
  const resourcePerms = { ...prev[resource] };

  if (resourcePerms[action]) {
    // Remove permission
    resourcePerms[action] = null;
  } else {
    // Add permission with defaults (Always + Allow)
    resourcePerms[action] = { effect: "allow", condition: "none" };
  }

  newPerms[resource] = resourcePerms;
  return newPerms;
}

export function updateEffectReducer(
  prev: PermissionState,
  resource: string,
  action: string,
  effect: PermissionEffect
): PermissionState {
  const newPerms = { ...prev };
  const resourcePerms = { ...prev[resource] };
  const current = resourcePerms[action];
  if (current) {
    resourcePerms[action] = { ...current, effect };
  }
  newPerms[resource] = resourcePerms;
  return newPerms;
}

export function updateConditionReducer(
  prev: PermissionState,
  resource: string,
  action: string,
  condition: PermissionCondition
): PermissionState {
  const newPerms = { ...prev };
  const resourcePerms = { ...prev[resource] };
  const current = resourcePerms[action];
  if (current) {
    resourcePerms[action] = { ...current, condition };
  }
  newPerms[resource] = resourcePerms;
  return newPerms;
}

export function toggleAllReducer(
  prev: PermissionState,
  resource: string
): PermissionState {
  const newPerms = { ...prev };
  const resourcePerms = { ...prev[resource] };
  const allSelected = ACTIONS.every((a) => resourcePerms[a] !== null);

  if (allSelected) {
    // Clear all
    for (const action of ACTIONS) {
      resourcePerms[action] = null;
    }
  } else {
    // Select all with defaults
    for (const action of ACTIONS) {
      if (!resourcePerms[action]) {
        resourcePerms[action] = { effect: "allow", condition: "" };
      }
    }
  }

  newPerms[resource] = resourcePerms;
  return newPerms;
}

export function setPresetReducer(
  prev: PermissionState,
  resource: string,
  preset: PermissionPreset
): PermissionState {
  const newPerms = { ...prev };
  const resourcePerms: Record<string, PermissionDetail | null> = {};

  // Clear all actions
  for (const action of ACTIONS) {
    resourcePerms[action] = null;
  }

  // Apply preset actions with default settings
  const actions = presetToActions(preset);
  for (const action of actions) {
    resourcePerms[action] = { effect: "allow", condition: "none" };
  }

  newPerms[resource] = resourcePerms;
  return newPerms;
}

export function buildPermissionsList(
  permissions: PermissionState
): PermissionInput[] {
  const permissionsList: PermissionInput[] = [];
  for (const [resource, actionMap] of Object.entries(permissions)) {
    for (const [action, detail] of Object.entries(actionMap)) {
      if (detail) {
        permissionsList.push({
          resource,
          action,
          effect: detail.effect,
          condition: (detail.condition === "none"
            ? undefined
            : detail.condition || undefined) as PermissionCondition | undefined,
        });
      }
    }
  }
  return permissionsList;
}
