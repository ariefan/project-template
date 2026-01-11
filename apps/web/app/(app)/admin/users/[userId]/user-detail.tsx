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
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
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
import { Spinner } from "@workspace/ui/components/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { format } from "date-fns";
import { ArrowLeft, Plus, Shield, Trash2, UserCog } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiClient, getErrorMessage } from "@/lib/api-client";
import { authClient, useActiveOrganization, useSession } from "@/lib/auth";

// Organization role options
const ORG_ROLES = [
  { value: "member", label: "Member", description: "Basic access" },
  {
    value: "admin",
    label: "Admin",
    description: "Can manage users and settings",
  },
  { value: "owner", label: "Owner", description: "Full control" },
] as const;

interface UserDetailProps {
  userId: string;
}

interface OrganizationMember {
  id: string;
  userId: string;
  organizationId: string;
  role: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
}

export function UserDetail({ userId }: UserDetailProps) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const { data: orgData } = useActiveOrganization();
  const orgId = orgData?.id ?? "";
  const currentUserId = session?.user?.id;

  // UI State
  const [mounted, setMounted] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{
    roleId: string;
    roleName: string;
  } | null>(null);
  const [orgRoleDialogOpen, setOrgRoleDialogOpen] = useState(false);
  const [selectedOrgRole, setSelectedOrgRole] = useState<string>("");
  const [orgRoleError, setOrgRoleError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

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
  const member = members.find((m) => m.userId === userId);
  const user = member?.user;
  const userOrgRole = member?.role ?? "member";

  // Get current user's org role
  const currentUserMember = members.find((m) => m.userId === currentUserId);
  const currentUserRole = currentUserMember?.role ?? "member";
  const isOwnerOrAdmin =
    currentUserRole === "owner" || currentUserRole === "admin";
  const isOwner = currentUserRole === "owner";

  // Fetch user's RBAC roles in this tenant
  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    ...userTenantRolesListOptions({
      client: apiClient,
      path: { orgId, userId },
    }),
    enabled: Boolean(orgId && userId),
  });

  const userRoles: UserRoleAssignment[] =
    (rolesData as { data?: UserRoleAssignment[] })?.data ?? [];

  // Fetch available RBAC roles
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

  // Assign RBAC role mutation
  const assignMutation = useMutation({
    ...userTenantRolesAssignMutation({ client: apiClient }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userTenantRolesList"] });
      setIsDialogOpen(false);
      setSelectedRoleId("");
      setError(null);
    },
    onError: (err) => {
      setError(getErrorMessage(err));
    },
  });

  // Remove RBAC role mutation
  const removeMutation = useMutation({
    ...userTenantRolesRemoveMutation({ client: apiClient }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userTenantRolesList"] });
      setRemoveTarget(null);
    },
  });

  // Update org role mutation
  const updateOrgRoleMutation = useMutation({
    mutationFn: async (newRole: string) => {
      // @ts-expect-error - Better Auth organization.updateMemberRole exists at runtime
      const result = await authClient.organization.updateMemberRole({
        memberId: member?.id,
        role: newRole,
        organizationId: orgId,
      });
      if (result.error)
        throw new Error(result.error.message || "Failed to update role");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["organization-members", orgId],
      });
      setOrgRoleDialogOpen(false);
      setOrgRoleError(null);
    },
    onError: (err: Error) => {
      setOrgRoleError(err.message);
    },
  });

  function handleAssignRole() {
    if (!selectedRoleId) return;
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

  function handleOrgRoleChange() {
    if (!selectedOrgRole || selectedOrgRole === userOrgRole) return;
    updateOrgRoleMutation.mutate(selectedOrgRole);
  }

  function getInitials(name: string | undefined, email: string): string {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email[0]?.toUpperCase() ?? "U";
  }

  function canChangeOrgRole(): boolean {
    // Only owners can change roles
    if (!isOwner) return false;
    // Can't change own role if you're the only owner
    if (userId === currentUserId && userOrgRole === "owner") {
      const ownerCount = members.filter((m) => m.role === "owner").length;
      if (ownerCount <= 1) return false;
    }
    return true;
  }

  function renderRolesContent() {
    if (mounted && rolesLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Spinner className="size-8 text-muted-foreground" />
        </div>
      );
    }

    if (!mounted || userRoles.length === 0) {
      return (
        <div className="py-8 text-center text-muted-foreground">
          No RBAC roles assigned to this user yet.
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
                  className="text-destructive hover:text-destructive"
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
      {/* User Profile Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Button asChild size="icon" variant="ghost">
              <Link href="/admin/users">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <Avatar className="size-16">
              <AvatarImage alt={user?.name} src={user?.image} />
              <AvatarFallback className="text-lg">
                {getInitials(user?.name, user?.email ?? "U")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="text-xl">
                {user?.name || "Unknown User"}
              </CardTitle>
              <CardDescription>{user?.email}</CardDescription>
              {member && (
                <p className="mt-1 text-muted-foreground text-sm">
                  Member since{" "}
                  {format(new Date(member.createdAt), "MMMM d, yyyy")}
                </p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Organization Role</p>
              <div className="mt-1 flex items-center gap-2">
                <Badge
                  variant={
                    userOrgRole === "owner"
                      ? "default"
                      : userOrgRole === "admin"
                        ? "secondary"
                        : "outline"
                  }
                >
                  {userOrgRole}
                </Badge>
              </div>
            </div>
            {canChangeOrgRole() && (
              <Dialog
                onOpenChange={setOrgRoleDialogOpen}
                open={orgRoleDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    onClick={() => setSelectedOrgRole(userOrgRole)}
                    size="sm"
                    variant="outline"
                  >
                    <UserCog className="mr-2 h-4 w-4" />
                    Change Role
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Change Organization Role</DialogTitle>
                    <DialogDescription>
                      Update the organization role for{" "}
                      {user?.name || user?.email}.
                    </DialogDescription>
                  </DialogHeader>
                  {orgRoleError && (
                    <div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
                      {orgRoleError}
                    </div>
                  )}
                  <Select
                    onValueChange={setSelectedOrgRole}
                    value={selectedOrgRole}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ORG_ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          <div>
                            <span className="font-medium">{role.label}</span>
                            <span className="ml-2 text-muted-foreground text-sm">
                              — {role.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <DialogFooter>
                    <Button
                      onClick={() => setOrgRoleDialogOpen(false)}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                    <Button
                      disabled={
                        updateOrgRoleMutation.isPending ||
                        selectedOrgRole === userOrgRole
                      }
                      onClick={handleOrgRoleChange}
                    >
                      {updateOrgRoleMutation.isPending && (
                        <Spinner className="mr-2" />
                      )}
                      Update Role
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* RBAC Roles Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Permission Roles</CardTitle>
              <CardDescription>
                RBAC roles that grant specific permissions
              </CardDescription>
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
                    {assignMutation.isPending && <Spinner className="mr-2" />}
                    Assign
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {renderRolesContent()}
        </CardContent>
      </Card>

      {/* Remove RBAC Role Confirmation */}
      <AlertDialog
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        open={Boolean(removeTarget)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the &quot;{removeTarget?.roleName}
              &quot; role from this user?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={removeMutation.isPending}
              onClick={handleRemoveConfirm}
            >
              {removeMutation.isPending && <Spinner className="mr-2" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
