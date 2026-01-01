"use client";

import { useQuery } from "@tanstack/react-query";
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
import { Edit, Loader2, Users } from "lucide-react";
import Link from "next/link";
import { authClient, useActiveOrganization } from "@/lib/auth";

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

export function UsersList() {
  const { data: orgData } = useActiveOrganization();
  const orgId = orgData?.id ?? "";

  const { data, isLoading, error } = useQuery({
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

  const members: OrganizationMember[] = data?.data?.members ?? [];

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
          Failed to load organization members
        </div>
      );
    }

    if (members.length === 0) {
      return (
        <div className="py-8 text-center text-muted-foreground">
          No members found in this organization.
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Organization Role</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.id}>
              <TableCell className="font-medium">
                {member.user.name || "Unnamed User"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {member.user.email}
              </TableCell>
              <TableCell>
                <Badge
                  variant={member.role === "owner" ? "default" : "secondary"}
                >
                  {member.role}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(member.createdAt), "MMM d, yyyy")}
              </TableCell>
              <TableCell className="text-right">
                <Button asChild size="icon" variant="ghost">
                  <Link href={`/admin/users/${member.userId}`}>
                    <Edit className="h-4 w-4" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <div>
            <CardTitle>Organization Users</CardTitle>
            <CardDescription>
              Manage user roles and permissions within this organization
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
}
