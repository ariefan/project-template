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
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { format } from "date-fns";
import { Edit, Loader2, Plus, Shield, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useActiveOrganization } from "@/lib/auth";

export function RolesList({
  showPageHeader = true,
}: {
  showPageHeader?: boolean;
} = {}) {
  const router = useRouter();
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
      console.error("Roles loading error:", error);
      return (
        <div className="py-8 text-center text-destructive">
          Failed to load roles:{" "}
          {error instanceof Error ? error.message : "Unknown error"}
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

  if (!showPageHeader) {
    return (
      <div className="space-y-6">
        {renderContent()}

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
      </div>
    );
  }

  return (
    <>
      <Card className="border-border/60 bg-card/50">
        <CardHeader className="pb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-muted p-2.5">
                <Shield className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="font-semibold text-xl">
                  Organization Roles
                </CardTitle>
                <CardDescription className="text-sm">
                  Permissions for{" "}
                  <span className="font-medium text-foreground">
                    {orgData?.name ?? "this organization"}
                  </span>
                  .
                </CardDescription>
              </div>
            </div>
            <Button asChild className="h-9" variant="outline">
              <Link href="/admin/roles/new">
                <Plus className="mr-2 h-4 w-4" />
                New Role
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Navigation tabs between tenant and global roles */}
          <Tabs className="mb-6" defaultValue="tenant">
            <TabsList className="h-10 p-1">
              <TabsTrigger className="px-4" value="tenant">
                Tenant Roles
              </TabsTrigger>
              <TabsTrigger
                className="px-4"
                onClick={() => router.push("/admin/roles/global")}
                value="global"
              >
                Global Roles
              </TabsTrigger>
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
    <TableRow className="group transition-colors hover:bg-muted/30">
      <TableCell>
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-foreground">{role.name}</span>
          <span className="font-mono text-[10px] text-muted-foreground uppercase">
            ID: {role.id.slice(0, 8)}
          </span>
        </div>
      </TableCell>
      <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm">
        {role.description ?? "-"}
      </TableCell>
      <TableCell>
        <div className="flex gap-1.5">
          <Badge
            className="px-1.5 py-0 font-medium text-[11px]"
            variant={role.isSystemRole ? "secondary" : "outline"}
          >
            {role.isSystemRole ? "System" : "Custom"}
          </Badge>
          {role.isGlobalRole && (
            <Badge
              className="bg-primary/80 px-1.5 py-0 font-medium text-[11px]"
              variant="default"
            >
              Global
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
          <span className="font-medium text-muted-foreground text-sm">
            {role.permissions.length} rule
            {role.permissions.length !== 1 ? "s" : ""}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {format(new Date(role.createdAt), "MMM d, yyyy")}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            asChild
            className="h-8 w-8 hover:bg-accent"
            size="icon"
            variant="ghost"
          >
            <Link href={`/admin/roles/${role.id}`}>
              <Edit className="h-4 w-4" />
            </Link>
          </Button>
          {!role.isSystemRole && (
            <Button
              className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
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
