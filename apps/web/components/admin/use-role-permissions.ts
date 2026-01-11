import type {
  PermissionCondition,
  PermissionEffect,
  Role,
} from "@workspace/contracts";
import { useState } from "react";
import {
  ACTIONS,
  isCustomPermissions,
  type PermissionDetail,
  type PermissionPreset,
  type PermissionState,
  RESOURCES,
  setPresetReducer,
  toggleAllReducer,
  togglePermissionReducer,
  updateConditionReducer,
  updateEffectReducer,
} from "./role-permissions-config";

function getInitialAdvancedMode(role?: Role): boolean {
  // Auto-enable advanced mode if existing role has custom permissions
  if (role?.permissions) {
    for (const resource of RESOURCES) {
      const resourcePerms: Record<string, PermissionDetail | null> = {};
      for (const perm of role.permissions.filter(
        (p) => p.resource === resource.key
      )) {
        resourcePerms[perm.action] = {
          effect: (perm.effect as PermissionEffect) ?? "allow",
          condition: perm.condition || "none",
        };
      }
      if (isCustomPermissions(resourcePerms)) {
        return true;
      }
    }
  }
  return false;
}

function getInitialPermissions(role?: Role): PermissionState {
  // Initialize from existing role permissions
  const initial: PermissionState = {};
  for (const resource of RESOURCES) {
    initial[resource.key] = {};
    for (const action of ACTIONS) {
      const resourcePerms = initial[resource.key];
      if (resourcePerms) {
        resourcePerms[action] = null;
      }
    }
  }
  if (role?.permissions) {
    for (const perm of role.permissions) {
      const resourcePerms = initial[perm.resource];
      if (resourcePerms) {
        resourcePerms[perm.action] = {
          effect: (perm.effect as PermissionEffect) ?? "allow",
          condition: perm.condition || "none", // "" from API → "none" for UI
        };
      }
    }
  }
  return initial;
}

export function useRolePermissions(role?: Role) {
  const [advancedMode, setAdvancedMode] = useState(() =>
    getInitialAdvancedMode(role)
  );

  const [permissions, setPermissions] = useState<PermissionState>(() =>
    getInitialPermissions(role)
  );

  function togglePermission(resource: string, action: string) {
    setPermissions((prev) => togglePermissionReducer(prev, resource, action));
  }

  function updatePermissionEffect(
    resource: string,
    action: string,
    effect: PermissionEffect
  ) {
    setPermissions((prev) =>
      updateEffectReducer(prev, resource, action, effect)
    );
  }

  function updatePermissionCondition(
    resource: string,
    action: string,
    condition: PermissionCondition
  ) {
    setPermissions((prev) =>
      updateConditionReducer(prev, resource, action, condition)
    );
  }

  function toggleAllForResource(resource: string) {
    setPermissions((prev) => toggleAllReducer(prev, resource));
  }

  // Set a preset for a resource (clears existing permissions and applies preset)
  function setResourcePreset(resource: string, preset: PermissionPreset) {
    setPermissions((prev) => setPresetReducer(prev, resource, preset));
  }

  function getResourcePermissionCount(resource: string): number {
    const resourcePerms = permissions[resource];
    if (!resourcePerms) {
      return 0;
    }
    return Object.values(resourcePerms).filter((p) => p !== null).length;
  }

  function hasCustomSettings(resource: string): boolean {
    const resourcePerms = permissions[resource];
    if (!resourcePerms) {
      return false;
    }
    return Object.values(resourcePerms).some(
      (p) =>
        p !== null &&
        (p.effect === "deny" || (p.condition !== "none" && p.condition !== ""))
    );
  }

  return {
    permissions,
    advancedMode,
    setAdvancedMode,
    togglePermission,
    updatePermissionEffect,
    updatePermissionCondition,
    toggleAllForResource,
    setResourcePreset,
    getResourcePermissionCount,
    hasCustomSettings,
  };
}
