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
import { Edit, Globe, Loader2, Plus, Shield, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useActiveOrganization } from "@/lib/auth";

export function GlobalRolesList() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: activeOrg } = useActiveOrganization();
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
      <Card className="border-primary/20 shadow-lg">
        <CardHeader className="bg-primary/5 pb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-primary p-3 shadow-inner">
                <Globe className="h-7 w-7 text-primary-foreground" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="font-bold text-2xl tracking-tight">
                    Platform Roles
                  </CardTitle>
                  <Badge
                    className="bg-primary font-mono text-[10px] tracking-widest hover:bg-primary"
                    variant="default"
                  >
                    GLOBAL
                  </Badge>
                </div>
                <CardDescription className="mt-1 text-base text-muted-foreground/80">
                  System-wide authority management. Changes here ripple across
                  every organization.
                </CardDescription>
              </div>
            </div>
            <Button
              asChild
              className="shadow-md transition-all hover:scale-[1.02]"
              size="lg"
            >
              <Link href="/admin/roles/global/new">
                <Plus className="mr-2 h-5 w-5" />
                New Global Role
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Advanced Platform Banner */}
          <div className="mb-8 flex items-start gap-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
            <Shield className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div className="text-amber-700 text-sm dark:text-amber-400">
              <span className="font-semibold">Security Note:</span> Global roles
              apply to all applications. These are high-stakes permissions that
              bypass organization-level isolation.
            </div>
          </div>

          {/* Navigation tabs */}
          {activeOrg?.id && (
            <Tabs className="mb-8" defaultValue="global">
              <TabsList className="bg-muted/50 p-1">
                <TabsTrigger
                  className="px-6"
                  onClick={() => router.push("/admin/roles")}
                  value="tenant"
                >
                  Tenant Roles
                </TabsTrigger>
                <TabsTrigger
                  className="px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  value="global"
                >
                  Global Roles
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

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

interface RoleRowProps {
  role: Role;
  onDelete: () => void;
  deletePending: boolean;
}

function RoleRow({ role, onDelete, deletePending }: RoleRowProps) {
  return (
    <TableRow className="group hover:bg-muted/50">
      <TableCell>
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-foreground">{role.name}</span>
          <span className="font-mono text-[11px] text-muted-foreground uppercase tracking-tight">
            ID: {role.id.slice(0, 8)}...
          </span>
        </div>
      </TableCell>
      <TableCell className="max-w-[300px] truncate text-muted-foreground/90 text-sm">
        {role.description ?? "No description provided."}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {role.isSystemRole && (
            <Badge
              className="border-none bg-secondary/50 px-2 py-0 font-medium text-secondary-foreground"
              variant="secondary"
            >
              System
            </Badge>
          )}
          <Badge
            className="border-primary/20 bg-primary/5 px-2 py-0 font-medium text-primary"
            variant="outline"
          >
            Global
          </Badge>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span className="font-medium text-sm">
            {role.permissions.length} Rule
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
            className="h-8 w-8 text-muted-foreground hover:bg-primary/10 hover:text-primary"
            size="icon"
            variant="ghost"
          >
            <Link href={`/admin/roles/global/${role.id}`}>
              <Edit className="h-4 w-4" />
            </Link>
          </Button>
          {!role.isSystemRole && (
            <Button
              className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
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
