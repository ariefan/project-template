"use client";

import type { Role } from "@workspace/contracts";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { RolePermissionsEditor } from "./role-permissions-editor";
import { useRoleForm } from "./use-role-form";
import { useRoleMutations } from "./use-role-mutations";
import { useRolePermissions } from "./use-role-permissions";

interface RoleFormProps {
  role?: Role;
  mode: "create" | "edit";
  isGlobal?: boolean;
}

export function RoleForm({ role, mode, isGlobal = false }: RoleFormProps) {
  const {
    permissions,
    advancedMode,
    setAdvancedMode,
    togglePermission,
    updatePermissionEffect,
    updatePermissionCondition,
    toggleAllForResource,
    setResourcePreset,
    getResourcePermissionCount,
  } = useRolePermissions(role);

  const {
    name,
    setName,
    description,
    setDescription,
    error,
    setError,
    handleSubmit,
  } = useRoleForm({
    role,
    permissions,
    // We defer getting submitRole to useRoleMutations
    submitRole: (body) => {
      // Accessing mutation logic inside the handler
      mutations.submitRole(body);
    },
  });

  const mutations = useRoleMutations({
    mode,
    isGlobal,
    roleId: role?.id,
    setError,
  });

  const isSystemRole = role?.isSystemRole ?? false;
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
                disabled={mutations.isLoading || isSystemRole}
                id="name"
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Editor, Viewer, Manager"
                value={name}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Textarea
                disabled={mutations.isLoading || isSystemRole}
                id="description"
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this role is for..."
                value={description}
              />
            </Field>

            {/* Permission Matrix */}
            <RolePermissionsEditor
              advancedMode={advancedMode}
              getResourcePermissionCount={getResourcePermissionCount}
              isLoading={mutations.isLoading}
              isSystemRole={isSystemRole}
              permissions={permissions}
              setAdvancedMode={setAdvancedMode}
              setResourcePreset={setResourcePreset}
              toggleAllForResource={toggleAllForResource}
              togglePermission={togglePermission}
              updatePermissionCondition={updatePermissionCondition}
              updatePermissionEffect={updatePermissionEffect}
            />

            {isSystemRole && (
              <p className="text-muted-foreground text-sm">
                System roles cannot be modified. Create a custom role instead.
              </p>
            )}

            <div className="flex gap-4">
              <Button disabled={mutations.isLoading} type="submit">
                {mutations.isLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {mode === "create" ? "Create Role" : "Save Changes"}
              </Button>
              <Button asChild variant="outline">
                <Link href={backUrl}>Cancel</Link>
              </Button>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
