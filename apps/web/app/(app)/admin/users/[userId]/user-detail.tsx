"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { format } from "date-fns";
import { ArrowLeft, Eye, UserCog } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient, useActiveOrganization, useSession } from "@/lib/auth";
import { UserAdminActionsCard } from "./user-admin-actions-card";
import { UserRolesCard } from "./user-roles-card";

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

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: legacy component
export function UserDetail({ userId }: UserDetailProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, refetch: refetchSession } = useSession();
  const { data: orgData } = useActiveOrganization();
  const orgId = orgData?.id ?? "";
  const currentUserId = session?.user?.id;

  // UI State

  const [orgRoleDialogOpen, setOrgRoleDialogOpen] = useState(false);
  const [selectedOrgRole, setSelectedOrgRole] = useState<string>("");
  const [orgRoleError, setOrgRoleError] = useState<string | null>(null);

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
  const isOwner = currentUserRole === "owner";
  const isOwnerOrAdmin =
    currentUserRole === "owner" || currentUserRole === "admin";

  // Update org role mutation
  const updateOrgRoleMutation = useMutation({
    mutationFn: async (newRole: string) => {
      // @ts-expect-error - Better Auth organization.updateMemberRole exists at runtime
      const result = await authClient.organization.updateMemberRole({
        memberId: member?.id,
        role: newRole,
        organizationId: orgId,
      });
      if (result.error) {
        throw new Error(result.error.message || "Failed to update role");
      }
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

  // Impersonate user mutation
  const impersonateMutation = useMutation({
    mutationFn: async () => {
      // @ts-expect-error - Better Auth admin.impersonateUser exists at runtime
      const result = await authClient.admin.impersonateUser({ userId });
      if (result.error) {
        throw new Error(result.error.message || "Failed to impersonate user");
      }
      return result;
    },
    onSuccess: async () => {
      await refetchSession();
      router.refresh();
      router.push("/dashboard");
    },
  });

  function canImpersonate(): boolean {
    // Can't impersonate yourself
    if (userId === currentUserId) {
      return false;
    }
    // Only owners and admins can impersonate
    return isOwnerOrAdmin;
  }

  function handleOrgRoleChange() {
    if (!selectedOrgRole || selectedOrgRole === userOrgRole) {
      return;
    }
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
    if (!isOwner) {
      return false;
    }
    // Can't change own role if you're the only owner
    if (userId === currentUserId && userOrgRole === "owner") {
      const ownerCount = members.filter((m) => m.role === "owner").length;
      if (ownerCount <= 1) {
        return false;
      }
    }
    return true;
  }

  function getRoleBadgeVariant(
    role: string
  ): "default" | "secondary" | "outline" {
    if (role === "owner") {
      return "default";
    }
    if (role === "admin") {
      return "secondary";
    }
    return "outline";
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
            {canImpersonate() && (
              <Button
                disabled={impersonateMutation.isPending}
                onClick={() => impersonateMutation.mutate()}
                size="sm"
                variant="outline"
              >
                {impersonateMutation.isPending ? (
                  <Spinner className="mr-2" />
                ) : (
                  <Eye className="mr-2 size-4" />
                )}
                Impersonate User
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Organization Role</p>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant={getRoleBadgeVariant(userOrgRole)}>
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
      <UserRolesCard
        orgId={orgId}
        userId={userId}
        userName={user?.name ?? "this user"}
      />

      {/* Admin Actions Card */}
      <UserAdminActionsCard
        canManage={isOwnerOrAdmin}
        isCurrentUser={userId === currentUserId}
        userEmail={user?.email ?? ""}
        userId={userId}
        userName={user?.name ?? "this user"}
      />
    </>
  );
}
