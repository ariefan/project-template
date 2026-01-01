"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Role } from "@workspace/contracts";
import {
  tenantRolesDeleteMutation,
  tenantRolesListOptions,
} from "@workspace/contracts/query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { format } from "date-fns";
import { Edit, Loader2, Plus, Shield, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useActiveOrganization } from "@/lib/auth";

export function RolesList() {
  const queryClient = useQueryClient();
  const { data: orgData } = useActiveOrganization();
  const orgId = orgData?.id ?? "";
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const { data, isLoading, error } = useQuery({
    ...tenantRolesListOptions({
      client: apiClient,
      path: { orgId },
    }),
    enabled: Boolean(orgId),
  });

  const deleteMutation = useMutation({
    ...tenantRolesDeleteMutation({ client: apiClient }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenantRolesList"] });
      setDeleteTarget(null);
    },
  });

  function handleDeleteConfirm() {
    if (deleteTarget) {
      deleteMutation.mutate({ path: { orgId, roleId: deleteTarget.id } });
    }
  }

  const roles = (data as { data?: Role[] })?.data ?? [];

  function renderContent() {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="py-8 text-center text-destructive">
          Failed to load roles
        </div>
      );
    }

    if (roles.length === 0) {
      return (
        <div className="py-8 text-center text-muted-foreground">
          No roles found. Create your first role to get started.
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Permissions</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.map((role) => (
            <RoleRow
              deletePending={deleteMutation.isPending}
              key={role.id}
              onDelete={() => setDeleteTarget({ id: role.id, name: role.name })}
              role={role}
            />
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Roles</CardTitle>
                <CardDescription>
                  Manage organization roles and their permissions
                </CardDescription>
              </div>
            </div>
            <Button asChild>
              <Link href="/admin/roles/new">
                <Plus className="mr-2 h-4 w-4" />
                New Role
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>{renderContent()}</CardContent>
      </Card>

      <AlertDialog
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        open={Boolean(deleteTarget)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the role "{deleteTarget?.name}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={handleDeleteConfirm}
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface RoleRowProps {
  role: Role;
  onDelete: () => void;
  deletePending: boolean;
}

function RoleRow({ role, onDelete, deletePending }: RoleRowProps) {
  return (
    <TableRow>
      <TableCell className="font-medium">{role.name}</TableCell>
      <TableCell className="max-w-[200px] truncate text-muted-foreground">
        {role.description ?? "-"}
      </TableCell>
      <TableCell>
        <Badge variant={role.isSystemRole ? "secondary" : "outline"}>
          {role.isSystemRole ? "System" : "Custom"}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant="outline">
          {role.permissions.length} permission
          {role.permissions.length !== 1 ? "s" : ""}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {format(new Date(role.createdAt), "MMM d, yyyy")}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button asChild size="icon" variant="ghost">
            <Link href={`/admin/roles/${role.id}`}>
              <Edit className="h-4 w-4" />
            </Link>
          </Button>
          {!role.isSystemRole && (
            <Button
              disabled={deletePending}
              onClick={onDelete}
              size="icon"
              variant="ghost"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
