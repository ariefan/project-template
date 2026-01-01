"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Role, UserRoleAssignment } from "@workspace/contracts";
import {
  tenantRolesListOptions,
  userTenantRolesAssignMutation,
  userTenantRolesListOptions,
  userTenantRolesRemoveMutation,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { format } from "date-fns";
import { ArrowLeft, Loader2, Plus, Shield, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { apiClient, getErrorMessage } from "@/lib/api-client";
import { authClient, useActiveOrganization } from "@/lib/auth";

interface UserDetailProps {
  userId: string;
}

interface OrganizationMember {
  id: string;
  userId: string;
  organizationId: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
}

export function UserDetail({ userId }: UserDetailProps) {
  const queryClient = useQueryClient();
  const { data: orgData } = useActiveOrganization();
  const orgId = orgData?.id ?? "";
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{
    roleId: string;
    roleName: string;
  } | null>(null);

  // Fetch user info from organization members
  const { data: orgFullData } = useQuery({
    queryKey: ["organization-members", orgId],
    queryFn: async () => {
      // @ts-expect-error - Better Auth organization.getFullOrganization exists at runtime
      const result = await authClient.organization.getFullOrganization({
        query: { organizationId: orgId },
      });
      return result;
    },
    enabled: Boolean(orgId),
  });

  const members: OrganizationMember[] = orgFullData?.data?.members ?? [];
  const user = members.find((m) => m.userId === userId)?.user;

  // Fetch user's roles in this tenant
  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    ...userTenantRolesListOptions({
      client: apiClient,
      path: { orgId, userId },
    }),
    enabled: Boolean(orgId && userId),
  });

  const userRoles: UserRoleAssignment[] =
    (rolesData as { data?: UserRoleAssignment[] })?.data ?? [];

  // Fetch available roles
  const { data: availableRolesData } = useQuery({
    ...tenantRolesListOptions({
      client: apiClient,
      path: { orgId },
    }),
    enabled: Boolean(orgId),
  });

  const availableRoles: Role[] =
    (availableRolesData as { data?: Role[] })?.data ?? [];

  // Roles not yet assigned to the user
  const assignedRoleIds = new Set(userRoles.map((r) => r.roleId));
  const unassignedRoles = availableRoles.filter(
    (r) => !assignedRoleIds.has(r.id)
  );

  // Assign role mutation
  const assignMutation = useMutation({
    ...userTenantRolesAssignMutation({ client: apiClient }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["userTenantRolesList"],
      });
      setIsDialogOpen(false);
      setSelectedRoleId("");
      setError(null);
    },
    onError: (err) => {
      setError(getErrorMessage(err));
    },
  });

  // Remove role mutation
  const removeMutation = useMutation({
    ...userTenantRolesRemoveMutation({ client: apiClient }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["userTenantRolesList"],
      });
      setRemoveTarget(null);
    },
  });

  function handleAssignRole() {
    if (!selectedRoleId) {
      return;
    }
    assignMutation.mutate({
      path: { orgId, userId },
      body: { roleId: selectedRoleId },
    });
  }

  function handleRemoveConfirm() {
    if (removeTarget) {
      removeMutation.mutate({
        path: { orgId, userId, roleId: removeTarget.roleId },
      });
    }
  }

  function renderContent() {
    if (rolesLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (userRoles.length === 0) {
      return (
        <div className="py-8 text-center text-muted-foreground">
          No roles assigned to this user yet.
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Role</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Assigned</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {userRoles.map((assignment) => (
            <TableRow key={assignment.id}>
              <TableCell className="font-medium">
                {assignment.roleName}
              </TableCell>
              <TableCell>
                <Badge
                  variant={assignment.isGlobalRole ? "secondary" : "outline"}
                >
                  {assignment.isGlobalRole ? "Global" : "Tenant"}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(assignment.assignedAt), "MMM d, yyyy")}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  disabled={removeMutation.isPending}
                  onClick={() =>
                    setRemoveTarget({
                      roleId: assignment.roleId,
                      roleName: assignment.roleName,
                    })
                  }
                  size="icon"
                  variant="ghost"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Button asChild size="icon" variant="ghost">
              <Link href="/admin/users">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>{user?.name || "User"}&apos;s Roles</CardTitle>
                <CardDescription>
                  {user?.email ?? "Manage the roles assigned to this user"}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-medium text-lg">Assigned Roles</h3>
            <Dialog onOpenChange={setIsDialogOpen} open={isDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={unassignedRoles.length === 0} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Assign Role
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Role</DialogTitle>
                  <DialogDescription>
                    Select a role to assign to {user?.name || "this user"}.
                  </DialogDescription>
                </DialogHeader>
                {error && (
                  <div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
                    {error}
                  </div>
                )}
                <Select
                  onValueChange={setSelectedRoleId}
                  value={selectedRoleId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {unassignedRoles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                        {role.isSystemRole && " (System)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <DialogFooter>
                  <Button
                    onClick={() => setIsDialogOpen(false)}
                    type="button"
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    disabled={!selectedRoleId || assignMutation.isPending}
                    onClick={handleAssignRole}
                    type="button"
                  >
                    {assignMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Assign
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {renderContent()}
        </CardContent>
      </Card>

      <AlertDialog
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        open={Boolean(removeTarget)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the "{removeTarget?.roleName}"
              role from this user?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={removeMutation.isPending}
              onClick={handleRemoveConfirm}
            >
              {removeMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
