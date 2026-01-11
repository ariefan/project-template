"use client";

import { useQuery } from "@tanstack/react-query";
import type { Role } from "@workspace/contracts";
import { globalRolesGetOptions } from "@workspace/contracts/query";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { RoleForm } from "@/components/admin/role-form";
import { apiClient } from "@/lib/api-client";

interface EditGlobalRoleFormProps {
  roleId: string;
}

export function EditGlobalRoleForm({ roleId }: EditGlobalRoleFormProps) {
  const { data, isLoading, error } = useQuery({
    ...globalRolesGetOptions({
      client: apiClient,
      path: { roleId },
    }),
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-destructive">Failed to load global role</p>
          <Button asChild className="mt-4" variant="outline">
            <Link href="/admin/roles/global">Back to Global Roles</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const role = (data as { data: Role }).data;

  return <RoleForm isGlobal mode="edit" role={role} />;
}
