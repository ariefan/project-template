"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreateRoleRequest,
  PermissionAction,
  PermissionCondition,
  PermissionEffect,
  PermissionInput,
  Role,
} from "@workspace/contracts";
import {
  globalRolesCreateMutation,
  globalRolesUpdateMutation,
  tenantRolesCreateMutation,
  tenantRolesUpdateMutation,
} from "@workspace/contracts/query";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
} from "@workspace/ui/components/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Switch } from "@workspace/ui/components/switch";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";
import { ArrowLeft, Loader2, Settings2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { useState } from "react";
import { apiClient, getErrorMessage } from "@/lib/api-client";
import { useActiveOrganization } from "@/lib/auth";

/**
 * Resources synced with @workspace/authorization types.ts
 * @see packages/authorization/src/types.ts
 */
const RESOURCES = [
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

const ACTIONS: PermissionAction[] = [
  "read",
  "create",
  "update",
  "delete",
  "manage",
];

const CONDITIONS: { value: string; label: string }[] = [
  { value: "none", label: "Always" }, // Maps to "" in API
  { value: "owner", label: "Owner Only" },
  { value: "shared", label: "If Shared" },
];

const EFFECTS: { value: PermissionEffect; label: string }[] = [
  { value: "allow", label: "Allow" },
  { value: "deny", label: "Deny" },
];

// Permission presets for simplified UI
type PermissionPreset = "none" | "view" | "editor" | "full" | "custom";

const PERMISSION_PRESETS: {
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

// Presets shown in dropdown (excludes "custom" which is display-only)
const SELECTABLE_PRESETS = PERMISSION_PRESETS;

// Map preset to granular actions
function presetToActions(preset: PermissionPreset): PermissionAction[] {
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
  }
}

// Detect preset from current permission state
function detectPreset(
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
function isCustomPermissions(
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

// Permission details for a single resource-action pair
// Note: condition uses string instead of PermissionCondition to allow "none" as UI placeholder
interface PermissionDetail {
  effect: PermissionEffect;
  condition: string; // "none" = always (maps to "" in API), "owner", "shared"
}

// Full permission state: resource -> action -> details
type PermissionState = Record<string, Record<string, PermissionDetail | null>>;

interface RoleFormProps {
  role?: Role;
  mode: "create" | "edit";
  isGlobal?: boolean;
}

export function RoleForm({ role, mode, isGlobal = false }: RoleFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: orgData } = useActiveOrganization();
  const orgId = orgData?.id ?? "";

  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [advancedMode, setAdvancedMode] = useState(() => {
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
  });
  const [permissions, setPermissions] = useState<PermissionState>(() => {
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
  });
  const [error, setError] = useState<string | null>(null);

  // Tenant role mutations
  const tenantCreateMutation = useMutation({
    ...tenantRolesCreateMutation({ client: apiClient }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenantRolesList"] });
      router.push("/admin/roles");
    },
    onError: (err) => {
      setError(getErrorMessage(err));
    },
  });

  const tenantUpdateMutation = useMutation({
    ...tenantRolesUpdateMutation({ client: apiClient }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenantRolesList"] });
      queryClient.invalidateQueries({ queryKey: ["tenantRolesGet"] });
      router.push("/admin/roles");
    },
    onError: (err) => {
      setError(getErrorMessage(err));
    },
  });

  // Global role mutations
  const globalCreateMutation = useMutation({
    ...globalRolesCreateMutation({ client: apiClient }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["globalRolesList"] });
      router.push("/admin/roles/global");
    },
    onError: (err) => {
      setError(getErrorMessage(err));
    },
  });

  const globalUpdateMutation = useMutation({
    ...globalRolesUpdateMutation({ client: apiClient }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["globalRolesList"] });
      queryClient.invalidateQueries({ queryKey: ["globalRolesGet"] });
      router.push("/admin/roles/global");
    },
    onError: (err) => {
      setError(getErrorMessage(err));
    },
  });

  // Select the appropriate mutations based on isGlobal
  const createMutation = isGlobal ? globalCreateMutation : tenantCreateMutation;
  const updateMutation = isGlobal ? globalUpdateMutation : tenantUpdateMutation;

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const isSystemRole = role?.isSystemRole ?? false;

  function togglePermission(resource: string, action: string) {
    setPermissions((prev) => {
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
    });
  }

  function updatePermissionEffect(
    resource: string,
    action: string,
    effect: PermissionEffect
  ) {
    setPermissions((prev) => {
      const newPerms = { ...prev };
      const resourcePerms = { ...prev[resource] };
      const current = resourcePerms[action];
      if (current) {
        resourcePerms[action] = { ...current, effect };
      }
      newPerms[resource] = resourcePerms;
      return newPerms;
    });
  }

  function updatePermissionCondition(
    resource: string,
    action: string,
    condition: PermissionCondition
  ) {
    setPermissions((prev) => {
      const newPerms = { ...prev };
      const resourcePerms = { ...prev[resource] };
      const current = resourcePerms[action];
      if (current) {
        resourcePerms[action] = { ...current, condition };
      }
      newPerms[resource] = resourcePerms;
      return newPerms;
    });
  }

  function toggleAllForResource(resource: string) {
    setPermissions((prev) => {
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
    });
  }

  // Set a preset for a resource (clears existing permissions and applies preset)
  function setResourcePreset(resource: string, preset: PermissionPreset) {
    setPermissions((prev) => {
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
    });
  }

  function getResourcePermissionCount(resource: string): number {
    const resourcePerms = permissions[resource];
    if (!resourcePerms) return 0;
    return Object.values(resourcePerms).filter((p) => p !== null).length;
  }

  function hasCustomSettings(resource: string): boolean {
    const resourcePerms = permissions[resource];
    if (!resourcePerms) return false;
    return Object.values(resourcePerms).some(
      (p) =>
        p !== null &&
        (p.effect === "deny" || (p.condition !== "none" && p.condition !== ""))
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Role name is required");
      return;
    }

    // Build permissions array from state
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
              : detail.condition || undefined) as
              | PermissionCondition
              | undefined,
          });
        }
      }
    }

    const body: CreateRoleRequest = {
      name: name.trim(),
      description: description.trim() || undefined,
      permissions: permissionsList,
    };

    if (mode === "create") {
      if (isGlobal) {
        globalCreateMutation.mutate({ body });
      } else {
        tenantCreateMutation.mutate({
          path: { orgId },
          body,
        });
      }
    } else if (role) {
      if (isGlobal) {
        globalUpdateMutation.mutate({
          path: { roleId: role.id },
          body,
        });
      } else {
        tenantUpdateMutation.mutate({
          path: { orgId, roleId: role.id },
          body,
        });
      }
    }
  }

  const backUrl = isGlobal ? "/admin/roles/global" : "/admin/roles";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Button asChild size="icon" variant="ghost">
            <Link href={backUrl}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <CardTitle>
              {mode === "create"
                ? `Create ${isGlobal ? "Global " : ""}Role`
                : `Edit Role: ${role?.name}`}
            </CardTitle>
            <CardDescription>
              {mode === "create"
                ? `Create a new ${isGlobal ? "global " : ""}role with custom permissions`
                : "Modify the role's name, description, and permissions"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
                {error}
              </div>
            )}

            <Field>
              <FieldLabel htmlFor="name">Role Name</FieldLabel>
              <Input
                disabled={isLoading || isSystemRole}
                id="name"
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Editor, Viewer, Manager"
                value={name}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Textarea
                disabled={isLoading || isSystemRole}
                id="description"
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this role is for..."
                value={description}
              />
            </Field>

            {/* Permission Matrix */}
            <Field>
              <div className="mb-2 flex items-center justify-between">
                <FieldLabel className="mb-0">Permissions</FieldLabel>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">
                    Advanced
                  </span>
                  <Switch
                    checked={advancedMode}
                    disabled={isLoading || isSystemRole}
                    onCheckedChange={setAdvancedMode}
                  />
                </div>
              </div>
              <p className="mb-3 text-muted-foreground text-sm">
                {advancedMode
                  ? "Configure granular permissions with conditions and effects."
                  : "Choose an access level for each resource."}
              </p>

              <div className="divide-y rounded-md border">
                {RESOURCES.map((resource) => {
                  const resourcePerms = permissions[resource.key] ?? {};
                  const currentPreset = detectPreset(resourcePerms);
                  const isCustom = currentPreset === "custom";
                  const permCount = getResourcePermissionCount(resource.key);

                  return (
                    <div className="p-3" key={resource.key}>
                      {/* Simple Mode: Preset Selector */}
                      {!advancedMode && (
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {resource.label}
                            </span>
                          </div>
                          <Select
                            disabled={isLoading || isSystemRole}
                            onValueChange={(v) =>
                              setResourcePreset(
                                resource.key,
                                v as PermissionPreset
                              )
                            }
                            value={currentPreset}
                          >
                            <SelectTrigger
                              className={cn(
                                "w-[160px]",
                                isCustom && "border-amber-500 text-amber-600"
                              )}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {/* Show Custom option only if currently custom */}
                              {isCustom && (
                                <SelectItem
                                  className="text-amber-600"
                                  value="custom"
                                >
                                  Custom
                                </SelectItem>
                              )}
                              {PERMISSION_PRESETS.map((p) => (
                                <SelectItem key={p.value} value={p.value}>
                                  {p.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Advanced Mode: Granular Checkboxes */}
                      {advancedMode && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {resource.label}
                              </span>
                              {permCount > 0 && (
                                <span className="text-muted-foreground text-xs">
                                  ({permCount})
                                </span>
                              )}
                            </div>
                            <Button
                              className="h-6 text-xs"
                              disabled={isLoading || isSystemRole}
                              onClick={() => toggleAllForResource(resource.key)}
                              size="sm"
                              type="button"
                              variant="ghost"
                            >
                              {ACTIONS.every((a) => resourcePerms[a] !== null)
                                ? "Clear"
                                : "All"}
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {ACTIONS.map((action) => {
                              const perm = resourcePerms[action];
                              const isEnabled = perm !== null;
                              const isDeny = perm?.effect === "deny";
                              const hasSettings =
                                perm &&
                                (perm.condition !== "none" ||
                                  perm.effect !== "allow");

                              return (
                                <InputGroup
                                  className={cn(
                                    "h-auto w-auto transition-colors",
                                    isEnabled
                                      ? "border-primary/30 bg-accent/30"
                                      : "border-muted bg-muted/30",
                                    isDeny &&
                                      "border-destructive/50 bg-destructive/10"
                                  )}
                                  key={action}
                                >
                                  <InputGroupAddon
                                    align="inline-start"
                                    className="gap-1.5 py-1"
                                  >
                                    <Checkbox
                                      checked={isEnabled}
                                      className={cn(
                                        "h-4 w-4",
                                        isDeny &&
                                          "border-destructive data-[state=checked]:bg-destructive"
                                      )}
                                      disabled={isLoading || isSystemRole}
                                      onCheckedChange={() =>
                                        togglePermission(resource.key, action)
                                      }
                                    />
                                    <span className="font-medium text-foreground text-sm capitalize">
                                      {action}
                                    </span>
                                  </InputGroupAddon>
                                  {isEnabled && perm && (
                                    <InputGroupAddon
                                      align="inline-end"
                                      className="py-1"
                                    >
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <InputGroupButton
                                            aria-label="Permission settings"
                                            className={cn(
                                              hasSettings && "text-amber-500"
                                            )}
                                            disabled={isLoading || isSystemRole}
                                            size="icon-xs"
                                            variant="ghost"
                                          >
                                            <Settings2 className="h-3.5 w-3.5" />
                                          </InputGroupButton>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                          align="end"
                                          className="w-40"
                                        >
                                          <DropdownMenuLabel>
                                            Condition
                                          </DropdownMenuLabel>
                                          <DropdownMenuRadioGroup
                                            onValueChange={(v) =>
                                              updatePermissionCondition(
                                                resource.key,
                                                action,
                                                v as PermissionCondition
                                              )
                                            }
                                            value={perm.condition}
                                          >
                                            {CONDITIONS.map((c) => (
                                              <DropdownMenuRadioItem
                                                key={c.value}
                                                value={c.value}
                                              >
                                                {c.label}
                                              </DropdownMenuRadioItem>
                                            ))}
                                          </DropdownMenuRadioGroup>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuLabel>
                                            Effect
                                          </DropdownMenuLabel>
                                          <DropdownMenuRadioGroup
                                            onValueChange={(v) =>
                                              updatePermissionEffect(
                                                resource.key,
                                                action,
                                                v as PermissionEffect
                                              )
                                            }
                                            value={perm.effect}
                                          >
                                            {EFFECTS.map((e) => (
                                              <DropdownMenuRadioItem
                                                className={
                                                  e.value === "deny"
                                                    ? "text-destructive"
                                                    : ""
                                                }
                                                key={e.value}
                                                value={e.value}
                                              >
                                                {e.label}
                                              </DropdownMenuRadioItem>
                                            ))}
                                          </DropdownMenuRadioGroup>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </InputGroupAddon>
                                  )}
                                </InputGroup>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Field>

            {isSystemRole && (
              <p className="text-muted-foreground text-sm">
                System roles cannot be modified. Create a custom role instead.
              </p>
            )}

            <div className="flex gap-4">
              <Button disabled={isLoading || isSystemRole} type="submit">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "create" ? "Create Role" : "Save Changes"}
              </Button>
              <Button
                asChild
                disabled={isLoading}
                type="button"
                variant="outline"
              >
                <Link href={backUrl}>Cancel</Link>
              </Button>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
