"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  SystemOrganization,
  UpdateSystemOrganizationRequest,
} from "@workspace/contracts";
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
import { Spinner } from "@workspace/ui/components/spinner";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { updateSystemOrganization } from "@/actions/system-organizations";

interface EditOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization: SystemOrganization | null;
}

export function EditOrganizationDialog({
  open,
  onOpenChange,
  organization,
}: EditOrganizationDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  useEffect(() => {
    if (organization) {
      setName(organization.name);
      setSlug(organization.slug);
    }
  }, [organization]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!organization) {
        return;
      }

      const updateData: UpdateSystemOrganizationRequest = {
        name,
        slug,
      };

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

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Organization</DialogTitle>
          <DialogDescription>
            Update the organization's details. Changing the slug may break
            existing links.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field>
            <FieldLabel>Name</FieldLabel>
            <Input
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Corp"
              value={name}
            />
          </Field>
          <Field>
            <FieldLabel>Slug</FieldLabel>
            <Input
              onChange={(e) => setSlug(e.target.value)}
              placeholder="acme-corp"
              value={slug}
            />
          </Field>
        </div>

        <DialogFooter>
          <Button
            disabled={mutation.isPending}
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={mutation.isPending || !name || !slug}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending && <Spinner className="mr-2" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
