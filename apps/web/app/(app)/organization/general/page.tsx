"use client";

import type { SystemOrganization } from "@workspace/contracts";
import { toast } from "sonner";
import { OrganizationDangerZone } from "@/app/(app)/settings/organization";
import {
  OrganizationForm,
  type OrganizationFormValues,
} from "@/components/organizations/organization-form";
import { SectionSkeleton } from "@/components/organizations/skeletons";
import { authClient, useActiveOrganization } from "@/lib/auth";
import { env } from "@/lib/env";

const KNOWN_METADATA_KEYS = ["website", "supportEmail", "description"];

function getMergedMetadata(
  data: OrganizationFormValues,
  currentMetadata: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  const existingExtraMetadata: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(currentMetadata || {})) {
    if (!KNOWN_METADATA_KEYS.includes(key)) {
      existingExtraMetadata[key] = value;
    }
  }

  return {
    ...existingExtraMetadata,
    website: data.website || undefined,
    supportEmail: data.supportEmail || undefined,
    description: data.description || undefined,
  };
}

export default function OrganizationGeneralPage() {
  const {
    data: activeOrg,
    isPending: isOrgLoading,
    refetch,
  } = useActiveOrganization();

  if (isOrgLoading || !activeOrg) {
    return (
      <div className="space-y-6">
        <SectionSkeleton />
        <SkeletonCard />
      </div>
    );
  }

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(
      `${env.NEXT_PUBLIC_API_URL}/v1/orgs/${activeOrg.id}/files`,
      {
        method: "POST",
        body: formData,
        credentials: "include",
      }
    );

    if (!response.ok) {
      throw new Error("Upload failed");
    }

    const result = await response.json();
    return `${env.NEXT_PUBLIC_API_URL}/v1/orgs/${activeOrg.id}/files/${result.data.id}/download`;
  };

  const handleUpdate = async (
    data: OrganizationFormValues,
    logoFile?: File
  ) => {
    const toastId = toast.loading("Updating organization...");

    try {
      let logoUrl = activeOrg.logo;
      if (logoFile) {
        logoUrl = await uploadFile(logoFile);
      }

      const finalMetadata = getMergedMetadata(data, activeOrg.metadata);

      const { error } = await authClient.organization.update({
        organizationId: activeOrg.id,
        data: {
          name: data.name,
          slug: data.slug,
          logo: logoUrl ?? undefined,
          metadata: finalMetadata,
        },
      });

      if (error) {
        throw error;
      }

      await refetch();
      toast.success("Organization updated successfully", { id: toastId });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "An unknown error occurred";
      toast.error(message, { id: toastId });
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      <OrganizationForm onSubmit={handleUpdate} organization={activeOrg} />

      <OrganizationDangerZone
        organization={activeOrg as unknown as SystemOrganization}
      />
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="space-y-4">
        <div className="h-6 w-1/4 animate-pulse rounded bg-muted" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-10 w-full animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
