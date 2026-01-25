"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  SystemOrganization,
  UpdateSystemOrganizationRequest,
} from "@workspace/contracts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { toast } from "sonner";
import { updateSystemOrganization } from "@/actions/system-organizations";
import {
  OrganizationForm,
  type OrganizationFormValues,
} from "@/components/organizations/organization-form";
import { env } from "@/lib/env";

interface EditOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization: SystemOrganization | null;
}

const KNOWN_METADATA_KEYS = ["website", "supportEmail", "description"];

function parseMetadata(metadata: unknown): Record<string, unknown> {
  if (!metadata) {
    return {};
  }
  try {
    if (typeof metadata === "string") {
      return JSON.parse(metadata);
    }
    if (typeof metadata === "object") {
      return metadata as Record<string, unknown>;
    }
  } catch (e) {
    console.warn("Failed to parse organization metadata", e);
  }
  return {};
}

function getSystemUpdateData(
  data: OrganizationFormValues,
  logoUrl: string | undefined,
  currentMetadata: Record<string, unknown>
): UpdateSystemOrganizationRequest {
  const existingExtraMetadata: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(currentMetadata)) {
    if (!KNOWN_METADATA_KEYS.includes(key)) {
      existingExtraMetadata[key] = value;
    }
  }

  const mergedMetadata = {
    ...existingExtraMetadata,
    website: data.website || undefined,
    supportEmail: data.supportEmail || undefined,
    description: data.description || undefined,
  };

  return {
    name: data.name,
    slug: data.slug,
    logo: logoUrl ?? undefined,
    metadata: JSON.stringify(mergedMetadata),
  };
}

export function EditOrganizationDialog({
  open,
  onOpenChange,
  organization,
}: EditOrganizationDialogProps) {
  const queryClient = useQueryClient();

  const uploadFile = async (file: File): Promise<string> => {
    if (!organization) {
      throw new Error("No organization context");
    }
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(
      `${env.NEXT_PUBLIC_API_URL}/v1/orgs/${organization.id}/files`,
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
    return `${env.NEXT_PUBLIC_API_URL}/v1/orgs/${organization.id}/files/${result.data.id}/download`;
  };

  const mutation = useMutation({
    mutationFn: async ({
      data,
      logoFile,
    }: {
      data: OrganizationFormValues;
      logoFile?: File;
    }) => {
      if (!organization) {
        return;
      }

      let logoUrl = organization.logo;
      if (logoFile) {
        logoUrl = await uploadFile(logoFile);
      }

      const currentMetadata = parseMetadata(organization.metadata);
      const updateData = getSystemUpdateData(
        data,
        logoUrl ?? undefined,
        currentMetadata
      );

      const result = await updateSystemOrganization(
        organization.id,
        updateData
      );
      if (result.error) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: () => {
      toast.success("Organization updated successfully");
      queryClient.invalidateQueries({ queryKey: ["system-organizations"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  if (!organization) {
    return null;
  }

  // Adapt organization for the shared form
  const adaptedOrg = {
    ...organization,
    metadata:
      typeof organization.metadata === "string"
        ? JSON.parse(organization.metadata)
        : organization.metadata,
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Organization</DialogTitle>
          <DialogDescription>
            Update organization details, branding, and metadata.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <OrganizationForm
            onSubmit={async (data, logoFile) => {
              await mutation.mutateAsync({ data, logoFile });
            }}
            organization={adaptedOrg}
            variant="plain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
