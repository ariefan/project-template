"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Role } from "@workspace/contracts";
import {
  globalRolesDeleteMutation,
  globalRolesListOptions,
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
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { format } from "date-fns";
import { Edit, Globe, Loader2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiClient } from "@/lib/api-client";

export function GlobalRolesList() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const { data, isLoading, error } = useQuery({
    ...globalRolesListOptions({
      client: apiClient,
    }),
  });

  const deleteMutation = useMutation({
    ...globalRolesDeleteMutation({ client: apiClient }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["globalRolesList"] });
      setDeleteTarget(null);
    },
  });

  function handleDeleteConfirm() {
    if (deleteTarget) {
      deleteMutation.mutate({ path: { roleId: deleteTarget.id } });
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
      console.error("Global roles loading error:", error);
      return (
        <div className="py-8 text-center text-destructive">
          Failed to load global roles:{" "}
          {error instanceof Error ? error.message : "Unknown error"}
        </div>
      );
    }

    if (roles.length === 0) {
      return (
        <div className="py-8 text-center text-muted-foreground">
          No global roles found. Create your first global role to get started.
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
            <GlobalRoleRow
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
              <Globe className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Global Roles</CardTitle>
                <CardDescription>
                  Manage app-wide roles that apply across all organizations
                </CardDescription>
              </div>
            </div>
            <Button asChild>
              <Link href="/admin/roles/global/new">
                <Plus className="mr-2 h-4 w-4" />
                New Global Role
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Navigation tabs between tenant and global roles */}
          <Tabs className="mb-4" defaultValue="global">
            <TabsList>
              <TabsTrigger
                onClick={() => router.push("/admin/roles")}
                value="tenant"
              >
                Tenant Roles
              </TabsTrigger>
              <TabsTrigger value="global">Global Roles</TabsTrigger>
            </TabsList>
          </Tabs>

          {renderContent()}
        </CardContent>
      </Card>

      <AlertDialog
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        open={Boolean(deleteTarget)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Global Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the global role "
              {deleteTarget?.name}"? This will affect all organizations. This
              action cannot be undone.
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

interface GlobalRoleRowProps {
  role: Role;
  onDelete: () => void;
  deletePending: boolean;
}

function GlobalRoleRow({ role, onDelete, deletePending }: GlobalRoleRowProps) {
  return (
    <TableRow>
      <TableCell className="font-medium">{role.name}</TableCell>
      <TableCell className="max-w-[200px] truncate text-muted-foreground">
        {role.description ?? "-"}
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Badge variant={role.isSystemRole ? "secondary" : "outline"}>
            {role.isSystemRole ? "System" : "Custom"}
          </Badge>
          <Badge variant="default">Global</Badge>
        </div>
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
            <Link href={`/admin/roles/global/${role.id}`}>
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
