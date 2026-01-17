"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { SystemOrganization } from "@workspace/contracts";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { ConfirmDialog } from "@workspace/ui/composed/confirm-dialog";
import { useForm } from "@workspace/ui/composed/form";
import { format } from "date-fns";
import {
  Building2,
  Loader2,
  LogOut,
  MoreHorizontal,
  Plus,
  Trash,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { authClient, useSession } from "@/lib/auth";

// Cast authClient to any to access plugin methods not strictly typed in integration
// biome-ignore lint/suspicious/noExplicitAny: library types are incomplete
const client = authClient as any;

export function OrganizationTab() {
  const { data: activeOrg, isPending: isOrgLoading } =
    authClient.useActiveOrganization();

  // If loading
  if (isOrgLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // If no active organization
  if (!activeOrg) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Active Organization</CardTitle>
          <CardDescription>
            You are not currently managing any organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/settings/organizations/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Organization
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-medium text-lg">Organization Settings</h2>
          <p className="text-muted-foreground">
            Manage your organization profile and members.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/settings/organizations/new">Create New Org</Link>
        </Button>
      </div>

      <Tabs className="w-full" defaultValue="general">
        <TabsList className="mb-4">
          <TabsTrigger value="general">
            <Building2 className="mr-2 h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="mr-2 h-4 w-4" />
            Members
          </TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-6" value="general">
          <OrganizationProfileForm
            organization={activeOrg as unknown as SystemOrganization}
          />
          <OrganizationDangerZone
            organization={activeOrg as unknown as SystemOrganization}
          />
        </TabsContent>

        <TabsContent value="members">
          <OrganizationMembersList
            organization={activeOrg as unknown as SystemOrganization}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z.string().min(2, "Slug must be at least 2 characters"),
  logo: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

function OrganizationProfileForm({
  organization,
}: {
  organization: SystemOrganization;
}) {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: organization.name,
      slug: organization.slug,
      logo: organization.logo || "",
    },
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(data: ProfileFormValues) {
    try {
      const { error } = await authClient.organization.update({
        organizationId: organization.id,
        data: {
          name: data.name,
          slug: data.slug,
          logo: data.logo,
        },
      });

      if (error) {
        throw error;
      }
      toast.success("Organization profile updated");
      // biome-ignore lint/suspicious/noExplicitAny: error handling
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Profile</CardTitle>
        <CardDescription>Update your organization details.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Acme Inc." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="acme" />
                  </FormControl>
                  <FormDescription>
                    Unique identifier for your organization.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="logo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Logo URL</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://..." />
                  </FormControl>
                  <FormDescription>
                    Public URL for your logo image.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <Button disabled={isSubmitting} type="submit">
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function OrganizationMembersList({
  organization,
}: {
  organization: SystemOrganization;
}) {
  const { data: members, isPending } = client.useListMembers({
    organizationId: organization.id,
  });

  const { data: session } = useSession();
  // biome-ignore lint/suspicious/noExplicitAny: members type unknown
  const currentUserRole = (members as any[])?.find(
    (m) => m.userId === session?.user.id
  )?.role;
  const isOwner = currentUserRole === "owner";

  const updateRole = async (memberId: string, role: string) => {
    try {
      const { error } = await client.organization.updateMemberRole({
        memberId,
        role,
      });
      if (error) {
        throw error;
      }
      toast.success("Member role updated");
      // biome-ignore lint/suspicious/noExplicitAny: error handling
    } catch (e: any) {
      toast.error(e.message || "Failed to update role");
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      const { error } = await client.organization.removeMember({
        memberIdOrEmail: memberId,
      });
      if (error) {
        throw error;
      }
      toast.success("Member removed");
      // biome-ignore lint/suspicious/noExplicitAny: error handling
    } catch (e: any) {
      toast.error(e.message || "Failed to remove member");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Members</CardTitle>
        <CardDescription>
          Manage who has access to your organization.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* biome-ignore lint/suspicious/noExplicitAny: members type unknown */}
              {(members as any[])?.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.user.image || ""} />
                        <AvatarFallback>
                          {member.user.name?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{member.user.name}</div>
                        <div className="text-muted-foreground text-xs">
                          {member.user.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="capitalize" variant="outline">
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(member.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    {isOwner && member.userId !== session?.user.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            className="h-8 w-8"
                            size="icon"
                            variant="ghost"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => updateRole(member.id, "admin")}
                          >
                            Make Admin
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => updateRole(member.id, "member")}
                          >
                            Make Member
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => removeMember(member.id)}
                          >
                            Remove Member
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export function OrganizationDangerZone({
  organization,
}: {
  organization: SystemOrganization;
}) {
  const router = useRouter();
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLeave = async () => {
    setIsLoading(true);
    try {
      const { error } = await client.organization.leave({
        organizationId: organization.id,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Left organization");
        router.push("/dashboard");
        window.location.reload();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      const { error } = await client.organization.delete({
        organizationId: organization.id,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Organization deleted");
        router.push("/dashboard");
        window.location.reload();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions for your organization.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Leave Organization</p>
                <p className="text-muted-foreground text-sm">
                  Revoke your access to this organization.
                </p>
              </div>
              <Button
                className="text-destructive hover:bg-destructive/10"
                disabled={isLoading}
                onClick={() => setShowLeaveDialog(true)}
                variant="outline"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Leave
              </Button>
            </div>
          </div>

          <div className="rounded-md border border-destructive/50 bg-destructive/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-destructive">
                  Delete Organization
                </p>
                <p className="text-muted-foreground text-sm">
                  Permanently delete this organization and all its data.
                </p>
              </div>
              <Button
                disabled={isLoading}
                onClick={() => setShowDeleteDialog(true)}
                variant="destructive"
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        confirmLabel="Leave"
        description={`Are you sure you want to leave ${organization.name}? You will lose access to all resources.`}
        isLoading={isLoading}
        onConfirm={handleLeave}
        onOpenChange={setShowLeaveDialog}
        open={showLeaveDialog}
        title="Leave Organization?"
        variant="destructive"
      />

      <ConfirmDialog
        confirmLabel="Delete"
        description={`This action cannot be undone. This will permanently delete ${organization.name} and remove all data.`}
        isLoading={isLoading}
        onConfirm={handleDelete}
        onOpenChange={setShowDeleteDialog}
        open={showDeleteDialog}
        title="Delete Organization?"
        variant="destructive"
      />
    </>
  );
}
