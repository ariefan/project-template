"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Field, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Spinner } from "@workspace/ui/components/spinner";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import {
  type ColumnDef,
  DataView as DataTable,
  SearchInput,
} from "@workspace/ui/composed/data-view";
import { format } from "date-fns";
import { Edit, Eye, Mail, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layouts/page-header";
import { authClient, useActiveOrganization, useSession } from "@/lib/auth";

// Organization role options
const ORG_ROLES = [
  { value: "member", label: "Member" },
  { value: "admin", label: "Admin" },
  { value: "owner", label: "Owner" },
] as const;

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

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  organizationId: string;
}

export function UsersList({
  showPageHeader = true,
}: {
  showPageHeader?: boolean;
} = {}) {
  const { data: session, refetch: refetchSession } = useSession();
  const { data: orgData } = useActiveOrganization();
  const orgId = orgData?.id ?? "";
  const currentUserId = session?.user?.id;

  const {
    members,
    pendingInvitations,
    filteredMembers,
    membersLoading,
    invitationsLoading,
    inviteMutation,
    removeMutation,
    cancelInvitationMutation,
    impersonateMutation,
    inviteError,
    removeTarget,
    setRemoveTarget,
    cancelTarget,
    setCancelTarget,
    inviteDialogOpen,
    setInviteDialogOpen,
    inviteEmail,
    setInviteEmail,
    inviteRole,
    setInviteRole,
    handleInvite,
    handleRemoveConfirm,
    handleCancelInvitation,
    canRemoveMember,
    isMounted,
    searchQuery,
    setSearchQuery,
    isOwnerOrAdmin,
  } = useUsersListLogic({ orgId, currentUserId, refetchSession });

  const columns = useMembersColumns({
    currentUserId,
    isOwnerOrAdmin,
    onImpersonate: (userId: string) => impersonateMutation.mutate(userId),
    impersonatePending: impersonateMutation.isPending,
    onRemove: (member: OrganizationMember) => setRemoveTarget(member),
    canRemoveMember,
  });

  const invitationsColumns = useMemo<ColumnDef<Invitation>[]>(
    () => [
      {
        id: "email",
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-muted">
              <Mail className="size-4 text-muted-foreground" />
            </div>
            <span className="font-medium">{row.email}</span>
          </div>
        ),
      },
      {
        id: "role",
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => <Badge variant="outline">{row.role}</Badge>,
      },
      {
        id: "expiresAt",
        accessorKey: "expiresAt",
        header: "Expires",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {format(new Date(row.expiresAt), "MMM d, yyyy")}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              className="text-destructive hover:text-destructive"
              onClick={() => setCancelTarget(row)}
              size="icon"
              variant="ghost"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [setCancelTarget]
  );

  if (!showPageHeader) {
    return (
      <div className="space-y-6">
        <Tabs defaultValue="members">
          <TabsList>
            <TabsTrigger value="members">
              Members ({members.length})
            </TabsTrigger>
            <TabsTrigger value="invitations">
              Pending ({pendingInvitations.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent className="mt-6" value="members">
            <DataTable
              columns={columns}
              data={filteredMembers}
              emptyMessage={
                searchQuery
                  ? "No members match your search."
                  : "No members found in this organization."
              }
              getRowId={(row) => row.id}
              loading={!isMounted || membersLoading}
              onSearchChange={setSearchQuery}
              search={searchQuery}
              toolbarLeft={<SearchInput placeholder="Search members..." />}
            />
          </TabsContent>
          <TabsContent className="mt-6" value="invitations">
            <DataTable
              columns={invitationsColumns}
              data={pendingInvitations}
              emptyMessage="No pending invitations."
              getRowId={(row) => row.id}
              loading={!isMounted || invitationsLoading}
            />
          </TabsContent>
        </Tabs>

        <RemoveMemberAlertDialog
          isPending={removeMutation.isPending}
          onConfirm={handleRemoveConfirm}
          onOpenChange={(open) => !open && setRemoveTarget(null)}
          open={Boolean(removeTarget)}
          targetName={removeTarget?.user.name || removeTarget?.user.email}
        />

        <CancelInvitationAlertDialog
          isPending={cancelInvitationMutation.isPending}
          onConfirm={handleCancelInvitation}
          onOpenChange={(open) => !open && setCancelTarget(null)}
          open={Boolean(cancelTarget)}
          targetEmail={cancelTarget?.email}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl space-y-6 border-none py-6">
      <PageHeader
        actions={
          isOwnerOrAdmin && (
            <Button onClick={() => setInviteDialogOpen(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Invite User
            </Button>
          )
        }
        description="Manage members, roles, and invitations"
        title="Organization Users"
      />

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Members ({members.length})</TabsTrigger>
          <TabsTrigger value="invitations">
            Pending ({pendingInvitations.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent className="mt-6" value="members">
          <DataTable
            columns={columns}
            data={filteredMembers}
            emptyMessage={
              searchQuery
                ? "No members match your search."
                : "No members found in this organization."
            }
            getRowId={(row) => row.id}
            loading={!isMounted || membersLoading}
            onSearchChange={setSearchQuery}
            search={searchQuery}
            toolbarLeft={<SearchInput placeholder="Search members..." />}
          />
        </TabsContent>
        <TabsContent className="mt-6" value="invitations">
          <DataTable
            columns={invitationsColumns}
            data={pendingInvitations}
            emptyMessage="No pending invitations."
            getRowId={(row) => row.id}
            loading={!isMounted || invitationsLoading}
          />
        </TabsContent>
      </Tabs>

      <InviteMemberDialog
        error={inviteError}
        isPending={inviteMutation.isPending}
        onInvite={handleInvite}
        onOpenChange={setInviteDialogOpen}
        onRoleChange={setInviteRole}
        onValueChange={setInviteEmail}
        open={inviteDialogOpen}
        role={inviteRole}
        value={inviteEmail}
      />

      <RemoveMemberAlertDialog
        isPending={removeMutation.isPending}
        onConfirm={handleRemoveConfirm}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        open={Boolean(removeTarget)}
        targetName={removeTarget?.user.name || removeTarget?.user.email}
      />

      <CancelInvitationAlertDialog
        isPending={cancelInvitationMutation.isPending}
        onConfirm={handleCancelInvitation}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        open={Boolean(cancelTarget)}
        targetEmail={cancelTarget?.email}
      />
    </div>
  );
}

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onValueChange: (value: string) => void;
  role: string;
  onRoleChange: (role: string) => void;
  onInvite: () => void;
  isPending: boolean;
  error: string | null;
}

function InviteMemberDialog({
  open,
  onOpenChange,
  value,
  onValueChange,
  role,
  onRoleChange,
  onInvite,
  isPending,
  error,
}: InviteMemberDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
          <DialogDescription>
            Send an invitation email to add a new member to this organization.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
            {error}
          </div>
        )}
        <div className="space-y-4">
          <Field>
            <FieldLabel>Email Address</FieldLabel>
            <Input
              onChange={(e) => onValueChange(e.target.value)}
              placeholder="user@example.com"
              type="email"
              value={value}
            />
          </Field>
          <Field>
            <FieldLabel>Role</FieldLabel>
            <Select onValueChange={onRoleChange} value={role}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORG_ROLES.map((roleOpt) => (
                  <SelectItem key={roleOpt.value} value={roleOpt.value}>
                    {roleOpt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button disabled={isPending} onClick={onInvite}>
            {isPending && <Spinner className="mr-2" />}
            Send Invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface RemoveMemberAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
  targetName?: string;
}

function RemoveMemberAlertDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
  targetName,
}: RemoveMemberAlertDialogProps) {
  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Member</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove <strong>{targetName}</strong> from
            this organization? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending && <Spinner className="mr-2" />}
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface CancelInvitationAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
  targetEmail?: string;
}

function CancelInvitationAlertDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
  targetEmail,
}: CancelInvitationAlertDialogProps) {
  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to cancel the invitation to{" "}
            <strong>{targetEmail}</strong>?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep Invitation</AlertDialogCancel>
          <AlertDialogAction disabled={isPending} onClick={onConfirm}>
            {isPending && <Spinner className="mr-2" />}
            Cancel Invitation
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function filterMembers(members: OrganizationMember[], searchQuery: string) {
  if (!searchQuery) {
    return members;
  }
  const query = searchQuery.toLowerCase();
  return members.filter(
    (member) =>
      member.user.name?.toLowerCase().includes(query) ||
      member.user.email.toLowerCase().includes(query) ||
      member.role.toLowerCase().includes(query)
  );
}

function useMembersColumns({
  currentUserId,
  isOwnerOrAdmin,
  onImpersonate,
  impersonatePending,
  onRemove,
  canRemoveMember,
}: {
  currentUserId?: string;
  isOwnerOrAdmin: boolean;
  onImpersonate: (userId: string) => void;
  impersonatePending: boolean;
  onRemove: (member: OrganizationMember) => void;
  canRemoveMember: (member: OrganizationMember) => boolean;
}) {
  return useMemo<ColumnDef<OrganizationMember>[]>(() => {
    const getInitials = (name: string | undefined, email: string) => {
      if (name) {
        return name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);
      }
      return email[0]?.toUpperCase() ?? "U";
    };

    const getRoleBadgeVariant = (
      role: string
    ): "default" | "secondary" | "outline" => {
      if (role === "owner") {
        return "default";
      }
      if (role === "admin") {
        return "secondary";
      }
      return "outline";
    };

    return [
      {
        id: "user",
        accessorKey: "user",
        header: "User",
        cell: ({ row }) => {
          const member = row;
          return (
            <div className="flex items-center gap-3">
              <Avatar className="size-8">
                <AvatarImage alt={member.user.name} src={member.user.image} />
                <AvatarFallback className="text-xs">
                  {getInitials(member.user.name, member.user.email)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2 font-medium">
                  {member.user.name || "Unnamed User"}
                  {member.userId === currentUserId && (
                    <span className="text-muted-foreground text-xs">(you)</span>
                  )}
                </div>
                <div className="text-muted-foreground text-sm">
                  {member.user.email}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        id: "role",
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => (
          <Badge variant={getRoleBadgeVariant(row.role)}>{row.role}</Badge>
        ),
      },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: "Joined",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {format(new Date(row.createdAt), "MMM d, yyyy")}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const member = row;
          const canImpersonate =
            member.userId !== currentUserId && isOwnerOrAdmin;
          return (
            <div className="flex items-center justify-end gap-1">
              {canImpersonate && (
                <Button
                  disabled={impersonatePending}
                  onClick={() => onImpersonate(member.userId)}
                  size="icon"
                  title="Impersonate user"
                  variant="ghost"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              <Button asChild size="icon" variant="ghost">
                <Link href={`/admin/users/${member.userId}`}>
                  <Edit className="h-4 w-4" />
                </Link>
              </Button>
              {canRemoveMember(member) && (
                <Button
                  className="text-destructive hover:text-destructive"
                  onClick={() => onRemove(member)}
                  size="icon"
                  variant="ghost"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          );
        },
      },
    ];
  }, [
    currentUserId,
    isOwnerOrAdmin,
    onImpersonate,
    impersonatePending,
    onRemove,
    canRemoveMember,
  ]);
}

function useUsersListLogic({
  orgId,
  currentUserId,
  refetchSession,
}: {
  orgId: string;
  currentUserId?: string;
  // biome-ignore lint/suspicious/noExplicitAny: library type
  refetchSession: () => Promise<any>;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();

  // UI State
  const [isMounted, setIsMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("member");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<OrganizationMember | null>(
    null
  );
  const [cancelTarget, setCancelTarget] = useState<Invitation | null>(null);

  useEffect(() => setIsMounted(true), []);

  // Fetch organization members
  const { data: orgFullData, isLoading: membersLoading } = useQuery({
    queryKey: ["organization-members", orgId],
    queryFn: async () => {
      const result = await authClient.organization.getFullOrganization({
        query: { organizationId: orgId },
      });
      return result;
    },
    enabled: Boolean(orgId),
  });

  // Fetch pending invitations
  const { data: invitationsData, isLoading: invitationsLoading } = useQuery({
    queryKey: ["organization-invitations", orgId],
    queryFn: async () => {
      const result = await authClient.organization.listInvitations({
        query: { organizationId: orgId },
      });
      return result;
    },
    enabled: Boolean(orgId),
  });

  const members: OrganizationMember[] = orgFullData?.data?.members ?? [];
  const invitations: Invitation[] = invitationsData?.data ?? [];
  const pendingInvitations = useMemo(
    () => invitations.filter((inv) => inv.status === "pending"),
    [invitations]
  );

  // Filter members by search query
  const filteredMembers = useMemo(
    () => filterMembers(members, searchQuery),
    [members, searchQuery]
  );

  // Get current user's org role
  const currentUserMember = members.find((m) => m.userId === currentUserId);
  const currentUserRole = currentUserMember?.role ?? "member";

  // Invite member mutation
  const inviteMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      const result = await authClient.organization.inviteMember({
        email,
        role,
        organizationId: orgId,
      });
      if (result.error) {
        throw new Error(result.error.message || "Failed to send invitation");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["organization-invitations", orgId],
      });
      setInviteDialogOpen(false);
      setInviteEmail("");
      setInviteRole("member");
      setInviteError(null);
    },
    onError: (err: Error) => {
      setInviteError(err.message);
    },
  });

  // Remove member mutation
  const removeMutation = useMutation({
    mutationFn: async (memberIdOrEmail: string) => {
      const result = await authClient.organization.removeMember({
        memberIdOrEmail,
      });
      if (result.error) {
        throw new Error(result.error.message || "Failed to remove member");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["organization-members", orgId],
      });
      setRemoveTarget(null);
    },
  });

  // Cancel invitation mutation
  const cancelInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const result = await authClient.organization.cancelInvitation({
        invitationId,
      });
      if (result.error) {
        throw new Error(result.error.message || "Failed to cancel invitation");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["organization-invitations", orgId],
      });
      setCancelTarget(null);
    },
  });

  // Impersonate user mutation
  const impersonateMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const result = await authClient.admin.impersonateUser({
        userId: targetUserId,
      });
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

  function handleInvite() {
    if (!inviteEmail.trim()) {
      setInviteError("Email is required");
      return;
    }
    inviteMutation.mutate({ email: inviteEmail.trim(), role: inviteRole });
  }

  function handleRemoveConfirm() {
    if (removeTarget) {
      removeMutation.mutate(removeTarget.user.email);
    }
  }

  function handleCancelInvitation() {
    if (cancelTarget) {
      cancelInvitationMutation.mutate(cancelTarget.id);
    }
  }

  const canRemoveMember = (member: OrganizationMember): boolean => {
    if (member.userId === currentUserId) {
      return false;
    }
    if (member.role === "owner" && currentUserRole !== "owner") {
      return false;
    }
    return currentUserRole === "owner" || currentUserRole === "admin";
  };

  const isOwnerOrAdmin =
    currentUserRole === "owner" || currentUserRole === "admin";

  return {
    members,
    pendingInvitations,
    filteredMembers,
    membersLoading,
    invitationsLoading,
    inviteMutation,
    removeMutation,
    cancelInvitationMutation,
    impersonateMutation,
    inviteError,
    setInviteError,
    removeTarget,
    setRemoveTarget,
    cancelTarget,
    setCancelTarget,
    inviteDialogOpen,
    setInviteDialogOpen,
    inviteEmail,
    setInviteEmail,
    inviteRole,
    setInviteRole,
    handleInvite,
    handleRemoveConfirm,
    handleCancelInvitation,
    canRemoveMember,
    isMounted,
    searchQuery,
    setSearchQuery,
    isOwnerOrAdmin,
  };
}
