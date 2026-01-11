"use client";

import type {
  PermissionCondition,
  PermissionEffect,
} from "@workspace/contracts";
import { Button } from "@workspace/ui/components/button";
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
import { Field, FieldLabel } from "@workspace/ui/components/field";
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
import { cn } from "@workspace/ui/lib/utils";
import { Settings2 } from "lucide-react";
import {
  ACTIONS,
  CONDITIONS,
  detectPreset,
  EFFECTS,
  PERMISSION_PRESETS,
  type PermissionPreset,
  type PermissionState,
  RESOURCES,
} from "./role-permissions-config";

interface RolePermissionsEditorProps {
  permissions: PermissionState;
  advancedMode: boolean;
  setAdvancedMode: (checked: boolean) => void;
  isLoading: boolean;
  isSystemRole: boolean;
  togglePermission: (resource: string, action: string) => void;
  updatePermissionEffect: (
    resource: string,
    action: string,
    effect: PermissionEffect
  ) => void;
  updatePermissionCondition: (
    resource: string,
    action: string,
    condition: PermissionCondition
  ) => void;
  toggleAllForResource: (resource: string) => void;
  setResourcePreset: (resource: string, preset: PermissionPreset) => void;
  getResourcePermissionCount: (resource: string) => number;
}

export function RolePermissionsEditor({
  permissions,
  advancedMode,
  setAdvancedMode,
  isLoading,
  isSystemRole,
  togglePermission,
  updatePermissionEffect,
  updatePermissionCondition,
  toggleAllForResource,
  setResourcePreset,
  getResourcePermissionCount,
}: RolePermissionsEditorProps) {
  return (
    <Field>
      <div className="mb-2 flex items-center justify-between">
        <FieldLabel className="mb-0">Permissions</FieldLabel>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">Advanced</span>
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
                    <span className="font-medium">{resource.label}</span>
                  </div>
                  <Select
                    disabled={isLoading || isSystemRole}
                    onValueChange={(v) =>
                      setResourcePreset(resource.key, v as PermissionPreset)
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
                        <SelectItem className="text-amber-600" value="custom">
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
                      <span className="font-medium">{resource.label}</span>
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
                        (perm.condition !== "none" || perm.effect !== "allow");

                      return (
                        <InputGroup
                          className={cn(
                            "h-auto w-auto transition-colors",
                            isEnabled
                              ? "border-primary/30 bg-accent/30"
                              : "border-muted bg-muted/30",
                            isDeny && "border-destructive/50 bg-destructive/10"
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
                                  <DropdownMenuLabel>Effect</DropdownMenuLabel>
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
  );
}
