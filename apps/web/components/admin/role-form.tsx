"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreateRoleRequest,
  PermissionAction,
  PermissionInput,
  Role,
} from "@workspace/contracts";
import {
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
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Textarea } from "@workspace/ui/components/textarea";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiClient, getErrorMessage } from "@/lib/api-client";
import { useActiveOrganization } from "@/lib/auth";

// Available resources and actions for the permission matrix
const RESOURCES = [
  { key: "posts", label: "Posts" },
  { key: "comments", label: "Comments" },
  { key: "users", label: "Users" },
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

interface RoleFormProps {
  role?: Role;
  mode: "create" | "edit";
}

export function RoleForm({ role, mode }: RoleFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: orgData } = useActiveOrganization();
  const orgId = orgData?.id ?? "";

  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [permissions, setPermissions] = useState<
    Record<string, Set<PermissionAction>>
  >(() => {
    // Initialize from existing role permissions
    const initial: Record<string, Set<PermissionAction>> = {};
    for (const resource of RESOURCES) {
      initial[resource.key] = new Set();
    }
    if (role?.permissions) {
      for (const perm of role.permissions) {
        const resourceSet = initial[perm.resource];
        if (resourceSet) {
          // Permission has single action, add it to the set
          resourceSet.add(perm.action as PermissionAction);
        }
      }
    }
    return initial;
  });
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    ...tenantRolesCreateMutation({ client: apiClient }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenantRolesList"] });
      router.push("/admin/roles");
    },
    onError: (err) => {
      setError(getErrorMessage(err));
    },
  });

  const updateMutation = useMutation({
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

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const isSystemRole = role?.isSystemRole ?? false;

  function togglePermission(resource: string, action: PermissionAction) {
    setPermissions((prev) => {
      const newPerms = { ...prev };
      const resourcePerms = new Set(prev[resource]);

      if (resourcePerms.has(action)) {
        resourcePerms.delete(action);
      } else {
        resourcePerms.add(action);
      }

      newPerms[resource] = resourcePerms;
      return newPerms;
    });
  }

  function toggleAllForResource(resource: string) {
    setPermissions((prev) => {
      const newPerms = { ...prev };
      const resourcePerms = prev[resource] ?? new Set<PermissionAction>();
      const allSelected = ACTIONS.every((a) => resourcePerms.has(a));

      if (allSelected) {
        newPerms[resource] = new Set();
      } else {
        newPerms[resource] = new Set(ACTIONS);
      }

      return newPerms;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Role name is required");
      return;
    }

    // Build permissions array from matrix - one PermissionInput per resource+action
    const permissionsList: PermissionInput[] = [];
    for (const [resource, actionSet] of Object.entries(permissions)) {
      for (const action of actionSet) {
        permissionsList.push({
          resource,
          action,
          effect: "allow",
        });
      }
    }

    const body: CreateRoleRequest = {
      name: name.trim(),
      description: description.trim() || undefined,
      permissions: permissionsList,
    };

    if (mode === "create") {
      createMutation.mutate({
        path: { orgId },
        body,
      });
    } else if (role) {
      updateMutation.mutate({
        path: { orgId, roleId: role.id },
        body,
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Button asChild size="icon" variant="ghost">
            <Link href="/admin/roles">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <CardTitle>
              {mode === "create" ? "Create Role" : `Edit Role: ${role?.name}`}
            </CardTitle>
            <CardDescription>
              {mode === "create"
                ? "Create a new role with custom permissions"
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
              <FieldLabel>Permissions</FieldLabel>
              <div className="mt-2 rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Resource</TableHead>
                      {ACTIONS.map((action) => (
                        <TableHead
                          className="text-center capitalize"
                          key={action}
                        >
                          {action}
                        </TableHead>
                      ))}
                      <TableHead className="text-center">All</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {RESOURCES.map((resource) => {
                      const resourcePerms =
                        permissions[resource.key] ??
                        new Set<PermissionAction>();
                      const allSelected = ACTIONS.every((a) =>
                        resourcePerms.has(a)
                      );

                      return (
                        <TableRow key={resource.key}>
                          <TableCell className="font-medium">
                            {resource.label}
                          </TableCell>
                          {ACTIONS.map((action) => (
                            <TableCell className="text-center" key={action}>
                              <Checkbox
                                checked={resourcePerms.has(action)}
                                disabled={isLoading || isSystemRole}
                                onCheckedChange={() =>
                                  togglePermission(resource.key, action)
                                }
                              />
                            </TableCell>
                          ))}
                          <TableCell className="text-center">
                            <Checkbox
                              checked={allSelected}
                              disabled={isLoading || isSystemRole}
                              onCheckedChange={() =>
                                toggleAllForResource(resource.key)
                              }
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
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
                <Link href="/admin/roles">Cancel</Link>
              </Button>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
