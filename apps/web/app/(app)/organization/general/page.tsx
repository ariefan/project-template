"use client";

import type { SystemOrganization } from "@workspace/contracts";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { OrganizationDangerZone } from "@/app/(app)/settings/organization";
import {
  OrganizationForm,
  type OrganizationFormValues,
} from "@/components/organization-form";
import { authClient, useActiveOrganization } from "@/lib/auth";

export default function OrganizationGeneralPage() {
  const {
    data: activeOrg,
    isPending: isOrgLoading,
    refetch,
  } = useActiveOrganization();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isOrgLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!activeOrg) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-muted-foreground">
        Please select an organization.
      </div>
    );
  }

  const handleUpdate = async (data: OrganizationFormValues) => {
    setIsSubmitting(true);
    try {
      let parsedMetadata = {};
      if (data.metadata) {
        try {
          parsedMetadata = JSON.parse(data.metadata);
        } catch {
          // Should be caught by form validation, but safe fallback
          parsedMetadata = {};
        }
      }

      const { error } = await authClient.organization.update({
        organizationId: activeOrg.id,
        data: {
          name: data.name,
          slug: data.slug,
          logo: data.logo,
          metadata: parsedMetadata,
        },
      });

      if (error) {
        throw error;
      }

      await refetch();
      toast.success("Organization updated successfully");
      // biome-ignore lint/suspicious/noExplicitAny: error handling
    } catch (error: any) {
      toast.error(error.message || "Failed to update organization");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div>
        <h3 className="font-medium text-lg">General Settings</h3>
        <p className="text-muted-foreground text-sm">
          Manage your organization's profile and preferences.
        </p>
      </div>

      <OrganizationForm
        initialValues={{
          name: activeOrg.name,
          slug: activeOrg.slug,
          logo: activeOrg.logo || "",
          metadata: JSON.stringify(activeOrg.metadata || {}, null, 2),
        }}
        isLoading={isSubmitting}
        onSubmit={handleUpdate}
      />

      <div className="pt-6">
        <OrganizationDangerZone
          organization={activeOrg as unknown as SystemOrganization}
        />
      </div>
    </div>
  );
}
