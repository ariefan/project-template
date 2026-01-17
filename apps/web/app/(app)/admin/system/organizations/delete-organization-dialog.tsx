"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SystemOrganization } from "@workspace/contracts";
import { ConfirmDialog } from "@workspace/ui/composed/confirm-dialog";
import { toast } from "sonner";
import { deleteSystemOrganization } from "@/actions/system-organizations";

interface DeleteOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization: SystemOrganization | null;
}

export function DeleteOrganizationDialog({
  open,
  onOpenChange,
  organization,
}: DeleteOrganizationDialogProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!organization) {
        return;
      }

      const result = await deleteSystemOrganization(organization.id);
      if (!result.success) {
        throw new Error(result.error || "Failed to delete organization");
      }
      return result;
    },
    onSuccess: () => {
      toast.success("Organization deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["system-organizations"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return (
    <ConfirmDialog
      confirmLabel="Delete"
      description={`Are you sure you want to delete ${organization?.name}? This action handles a soft-delete, marking the organization as inactive.`}
      isLoading={mutation.isPending}
      onConfirm={() => mutation.mutate()}
      onOpenChange={onOpenChange}
      open={open}
      title="Delete Organization"
      variant="destructive"
    />
  );
}
