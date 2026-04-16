"use client";

import type { Role } from "@workspace/contracts";
import { Badge } from "@workspace/ui/components/badge";
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
import { cn } from "@workspace/ui/lib/utils";
import { ArrowLeft, Globe, Loader2, Shield } from "lucide-react";
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
    submitRole: (body) => mutations.submitRole(body),
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
    <Card
      className={cn(
        "border-border shadow-sm",
        isGlobal && "border-primary/20 shadow-md ring-1 ring-primary/5"
      )}
    >
      <RoleFormHeader
        backUrl={backUrl}
        isGlobal={isGlobal}
        mode={mode}
        roleName={role?.name}
      />
      <CardContent className="pt-6">
        <RoleFormBanners isGlobal={isGlobal} />

        <form onSubmit={handleSubmit}>
          <FieldGroup>
            {error && <FormError error={error} />}

            <RoleFormFields
              description={description}
              isGlobal={isGlobal}
              isLoading={mutations.isLoading}
              isSystemRole={isSystemRole}
              name={name}
              setDescription={setDescription}
              setName={setName}
            />

            <div className="pt-2">
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
            </div>

            <SystemRoleWarning isSystemRole={isSystemRole} />

            <RoleFormFooter
              backUrl={backUrl}
              isGlobal={isGlobal}
              isLoading={mutations.isLoading}
              mode={mode}
            />
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

function RoleFormHeader({
  isGlobal,
  mode,
  roleName,
  backUrl,
}: {
  isGlobal: boolean;
  mode: "create" | "edit";
  roleName?: string;
  backUrl: string;
}) {
  return (
    <CardHeader className={cn("pb-8", isGlobal && "bg-primary/[0.02]")}>
      <div className="flex items-center gap-4">
        <Button asChild size="icon" variant="ghost">
          <Link href={backUrl}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-xl">
              {mode === "create"
                ? `Create ${isGlobal ? "Global " : ""}Role`
                : `Edit Role: ${roleName}`}
            </CardTitle>
            {isGlobal && (
              <Badge
                className="h-5 bg-primary/90 px-1.5 font-mono text-[10px] uppercase tracking-wider"
                variant="default"
              >
                Platform
              </Badge>
            )}
          </div>
          <CardDescription>
            {mode === "create"
              ? `Create a new ${isGlobal ? "global " : ""}role with custom permissions`
              : "Modify the role's name, description, and permissions"}
          </CardDescription>
        </div>
      </div>
    </CardHeader>
  );
}

function RoleFormBanners({ isGlobal }: { isGlobal: boolean }) {
  if (!isGlobal) {
    return null;
  }
  return (
    <div className="fade-in slide-in-from-top-2 mb-6 flex animate-in items-start gap-4 rounded-lg border border-primary/20 bg-primary/5 p-4 duration-500">
      <div className="rounded-full bg-primary p-1.5 shadow-sm">
        <Shield className="h-4 w-4 text-primary-foreground" />
      </div>
      <div className="text-sm">
        <p className="font-semibold text-primary">System-Wide Impact</p>
        <p className="mt-0.5 text-muted-foreground">
          Changes to this role will affect every organization on the platform.
          Verify all permissions carefully.
        </p>
      </div>
    </div>
  );
}

function FormError({ error }: { error: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-4 text-destructive text-sm">
      <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
      {error}
    </div>
  );
}

function RoleFormFields({
  isGlobal,
  isSystemRole,
  name,
  setName,
  description,
  setDescription,
  isLoading,
}: {
  isGlobal: boolean;
  isSystemRole: boolean;
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  isLoading: boolean;
}) {
  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field className="sm:col-span-1">
          <FieldLabel htmlFor="name">Role Name</FieldLabel>
          <Input
            className="bg-background/50 focus:bg-background"
            disabled={isLoading || isSystemRole}
            id="name"
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Regional Manager, Read-Only Dev"
            value={name}
          />
        </Field>

        {isGlobal && (
          <Field className="sm:col-span-1">
            <FieldLabel>Target Scope</FieldLabel>
            <div className="flex h-10 items-center gap-2 rounded-md border border-border bg-muted/30 px-3 text-muted-foreground text-sm">
              <Globe className="h-3.5 w-3.5" />
              All Applications & Tenants
            </div>
          </Field>
        )}
      </div>

      <Field>
        <FieldLabel htmlFor="description">Description</FieldLabel>
        <Textarea
          className="resize-none bg-background/50 focus:bg-background"
          disabled={isLoading || isSystemRole}
          id="description"
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What exactly can a user with this role do?"
          rows={3}
          value={description}
        />
      </Field>
    </>
  );
}

function SystemRoleWarning({ isSystemRole }: { isSystemRole: boolean }) {
  if (!isSystemRole) {
    return null;
  }
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-4 text-muted-foreground text-sm">
      <Shield className="h-4 w-4 shrink-0" />
      This is a immutable system role. You can view its settings but not modify
      them.
    </div>
  );
}

function RoleFormFooter({
  isGlobal,
  isLoading,
  mode,
  backUrl,
}: {
  isGlobal: boolean;
  isLoading: boolean;
  mode: "create" | "edit";
  backUrl: string;
}) {
  return (
    <div className="flex items-center gap-4 border-t pt-4">
      <Button
        className={cn(
          isGlobal && "px-8 shadow-md transition-all hover:shadow-lg"
        )}
        disabled={isLoading}
        size="lg"
        type="submit"
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {mode === "create" ? "Create Role" : "Save Changes"}
      </Button>
      <Button asChild size="lg" variant="ghost">
        <Link href={backUrl}>Cancel</Link>
      </Button>
    </div>
  );
}
