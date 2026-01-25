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
  type ColumnDef,
  DataView as DataTable,
  SearchInput,
} from "@workspace/ui/composed/data-view";
import { format } from "date-fns";
import { Ban, Unlock, UserPlus, UserRoundSearch } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { authClient, useSession } from "@/lib/auth";

interface SystemUser {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
  role?: string;
  banned?: boolean;
  banReason?: string | null;
  banExpires?: number | null;
  createdAt: string;
  emailVerified?: boolean;
}

export function SystemUsersList() {
  // const router = useRouter(); // Unused
  const queryClient = useQueryClient();
  const { data: session } = useSession(); // Removed unused refetchSession
  const currentUserId = session?.user?.id;

  // UI State
  const [isMounted, setIsMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [banTarget, setBanTarget] = useState<SystemUser | null>(null);
  const [unbanTarget, setUnbanTarget] = useState<SystemUser | null>(null);

  // Create user form state
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<string>("user");
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => setIsMounted(true), []);

  // Fetch all users via Better Auth admin API
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["system-users", searchQuery],
    queryFn: async () => {
      const result = await authClient.admin.listUsers({
        query: {
          limit: 100,
          ...(searchQuery
            ? { searchField: "email", searchValue: searchQuery }
            : {}),
        },
      });
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data as { users: SystemUser[]; total: number };
    },
  });

  const users = usersData?.users ?? [];

  // Filter users by search (client-side filtering as fallback)
  const filteredUsers = users.filter((user) => {
    if (!searchQuery) {
      return true;
    }
    const query = searchQuery.toLowerCase();
    return (
      user.name?.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.role?.toLowerCase().includes(query)
    );
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async () => {
      if (!(newUserEmail && newUserPassword)) {
        throw new Error("Email and password are required");
      }
      if (newUserPassword.length < 8) {
        throw new Error("Password must be at least 8 characters");
      }
      const result = await authClient.admin.createUser({
        email: newUserEmail,
        password: newUserPassword,
        name: newUserName || undefined,
        role: newUserRole,
      });
      if (result.error) {
        throw new Error(result.error.message || "Failed to create user");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-users"] });
      setCreateDialogOpen(false);
      setNewUserEmail("");
      setNewUserName("");
      setNewUserPassword("");
      setNewUserRole("user");
      setCreateError(null);
    },
    onError: (err: Error) => {
      setCreateError(err.message);
    },
  });

  // Ban user mutation
  const banMutation = useMutation({
    mutationFn: async (userId: string) => {
      const result = await authClient.admin.banUser({ userId });
      if (result.error) {
        throw new Error(result.error.message || "Failed to ban user");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-users"] });
      setBanTarget(null);
    },
  });

  // Unban user mutation
  const unbanMutation = useMutation({
    mutationFn: async (userId: string) => {
      const result = await authClient.admin.unbanUser({ userId });
      if (result.error) {
        throw new Error(result.error.message || "Failed to unban user");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-users"] });
      setUnbanTarget(null);
    },
  });

  // Impersonate mutation
  const impersonateMutation = useMutation({
    mutationFn: async (userId: string) => {
      const result = await authClient.admin.impersonateUser({ userId });
      if (result.error) {
        throw new Error(result.error.message || "Failed to impersonate user");
      }
      return result;
    },
    onSuccess: () => {
      // Force a hard reload to ensure all auth hooks and layout state are reset
      window.location.href = "/dashboard";
    },
  });

  // biome-ignore lint/suspicious/noExplicitAny: better-auth extension
  const impersonatedBy = (session?.session as any)?.impersonatedBy;
  const isImpersonating = Boolean(impersonatedBy);

  const columns = useMemo<ColumnDef<SystemUser>[]>(() => {
    const getInitials = (name: string | null, email: string) => {
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

    return [
      {
        id: "user",
        accessorKey: "email",
        header: "User",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar className="size-8">
              <AvatarImage
                alt={row.name ?? undefined}
                src={row.image ?? undefined}
              />
              <AvatarFallback className="text-xs">
                {getInitials(row.name, row.email)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2 font-medium">
                {row.name || "Unnamed User"}
                {row.id === currentUserId && (
                  <span className="text-muted-foreground text-xs">(you)</span>
                )}
                {row.banned && <Badge variant="destructive">Banned</Badge>}
              </div>
              <div className="text-muted-foreground text-sm">{row.email}</div>
            </div>
          </div>
        ),
      },
      {
        id: "role",
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => (
          <Badge variant={row.role === "admin" ? "default" : "outline"}>
            {row.role || "user"}
          </Badge>
        ),
      },
      {
        id: "emailVerified",
        accessorKey: "emailVerified",
        header: "Verified",
        cell: ({ row }) => (
          <Badge variant={row.emailVerified ? "secondary" : "outline"}>
            {row.emailVerified ? "Yes" : "No"}
          </Badge>
        ),
      },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: "Created",
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
          const user = row;
          const canManage = user.id !== currentUserId;

          return (
            <div className="flex items-center justify-end gap-1">
              {canManage && !user.banned && (
                <Button
                  disabled={impersonateMutation.isPending || isImpersonating}
                  onClick={() => impersonateMutation.mutate(user.id)}
                  size="icon"
                  title={
                    isImpersonating
                      ? "Stop current impersonation first"
                      : "Impersonate user"
                  }
                  variant="ghost"
                >
                  <UserRoundSearch className="size-4" />
                </Button>
              )}
              {canManage && !user.banned && (
                <Button
                  onClick={() => setBanTarget(user)}
                  size="icon"
                  title="Ban user"
                  variant="ghost"
                >
                  <Ban className="size-4" />
                </Button>
              )}
              {canManage && user.banned && (
                <Button
                  onClick={() => setUnbanTarget(user)}
                  size="icon"
                  title="Unban user"
                  variant="ghost"
                >
                  <Unlock className="size-4" />
                </Button>
              )}
            </div>
          );
        },
      },
    ];
  }, [currentUserId, impersonateMutation, isImpersonating]);

  return (
    <>
      <DataTable
        columns={columns}
        data={filteredUsers}
        emptyMessage={
          searchQuery
            ? "No users match your search."
            : "No users found in the system."
        }
        getRowId={(row) => row.id}
        loading={!isMounted || usersLoading}
        onSearchChange={setSearchQuery}
        search={searchQuery}
        toolbarLeft={<SearchInput placeholder="Search users..." />}
        toolbarRight={
          <Button onClick={() => setCreateDialogOpen(true)} size="sm">
            <UserPlus className="mr-2 size-4" />
            Create User
          </Button>
        }
      />

      {/* Create User Dialog */}
      <Dialog onOpenChange={setCreateDialogOpen} open={createDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>
              Create a new user account. They will receive no verification
              email.
            </DialogDescription>
          </DialogHeader>
          {createError && (
            <div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
              {createError}
            </div>
          )}
          <div className="space-y-4">
            <Field>
              <FieldLabel>Email *</FieldLabel>
              <Input
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="user@example.com"
                type="email"
                value={newUserEmail}
              />
            </Field>
            <Field>
              <FieldLabel>Name</FieldLabel>
              <Input
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="John Doe"
                value={newUserName}
              />
            </Field>
            <Field>
              <FieldLabel>Password *</FieldLabel>
              <Input
                onChange={(e) => setNewUserPassword(e.target.value)}
                placeholder="••••••••"
                type="password"
                value={newUserPassword}
              />
            </Field>
            <Field>
              <FieldLabel>Role</FieldLabel>
              <Select onValueChange={setNewUserRole} value={newUserRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setCreateDialogOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={
                createUserMutation.isPending ||
                !newUserEmail ||
                !newUserPassword
              }
              onClick={() => createUserMutation.mutate()}
            >
              {createUserMutation.isPending && <Spinner className="mr-2" />}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban Confirmation */}
      <AlertDialog
        onOpenChange={(open) => !open && setBanTarget(null)}
        open={Boolean(banTarget)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ban User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to ban{" "}
              <strong>{banTarget?.name || banTarget?.email}</strong>? They will
              not be able to log in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={banMutation.isPending}
              onClick={() => banTarget && banMutation.mutate(banTarget.id)}
            >
              {banMutation.isPending && <Spinner className="mr-2" />}
              Ban User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unban Confirmation */}
      <AlertDialog
        onOpenChange={(open) => !open && setUnbanTarget(null)}
        open={Boolean(unbanTarget)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unban User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unban{" "}
              <strong>{unbanTarget?.name || unbanTarget?.email}</strong>? They
              will be able to log in again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={unbanMutation.isPending}
              onClick={() =>
                unbanTarget && unbanMutation.mutate(unbanTarget.id)
              }
            >
              {unbanMutation.isPending && <Spinner className="mr-2" />}
              Unban User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
