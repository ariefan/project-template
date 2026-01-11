import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateRoleRequest } from "@workspace/contracts";
import {
  globalRolesCreateMutation,
  globalRolesUpdateMutation,
  tenantRolesCreateMutation,
  tenantRolesUpdateMutation,
} from "@workspace/contracts/query";
import { useRouter } from "next/navigation";
import { apiClient, getErrorMessage } from "@/lib/api-client";
import { useActiveOrganization } from "@/lib/auth";

interface UseRoleMutationsProps {
  mode: "create" | "edit";
  isGlobal?: boolean;
  roleId?: string;
  setError: (error: string | null) => void;
}

export function useRoleMutations({
  mode,
  isGlobal = false,
  roleId,
  setError,
}: UseRoleMutationsProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: orgData } = useActiveOrganization();
  const orgId = orgData?.id ?? "";

  // Tenant role mutations
  const tenantCreateMutation = useMutation({
    ...tenantRolesCreateMutation({ client: apiClient }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenantRolesList"] });
      router.push("/admin/roles");
    },
    onError: (err) => {
      setError(getErrorMessage(err));
    },
  });

  const tenantUpdateMutation = useMutation({
    ...tenantRolesUpdateMutation({ client: apiClient }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenantRolesList"] });
      queryClient.invalidateQueries({ queryKey: ["tenantRolesGet"] });
      router.push("/admin/roles");
    },
    onError: (err) => {
      setError(getErrorMessage(err));
    },
  });

  // Global role mutations
  const globalCreateMutation = useMutation({
    ...globalRolesCreateMutation({ client: apiClient }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["globalRolesList"] });
      router.push("/admin/roles/global");
    },
    onError: (err) => {
      setError(getErrorMessage(err));
    },
  });

  const globalUpdateMutation = useMutation({
    ...globalRolesUpdateMutation({ client: apiClient }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["globalRolesList"] });
      queryClient.invalidateQueries({ queryKey: ["globalRolesGet"] });
      router.push("/admin/roles/global");
    },
    onError: (err) => {
      setError(getErrorMessage(err));
    },
  });

  // Select appropriate mutation
  const createMutation = isGlobal ? globalCreateMutation : tenantCreateMutation;
  const updateMutation = isGlobal ? globalUpdateMutation : tenantUpdateMutation;
  const isLoading = createMutation.isPending || updateMutation.isPending;

  function submitRole(body: CreateRoleRequest) {
    if (mode === "create") {
      if (isGlobal) {
        globalCreateMutation.mutate({ body });
      } else {
        tenantCreateMutation.mutate({
          path: { orgId },
          body,
        });
      }
    } else if (roleId) {
      if (isGlobal) {
        globalUpdateMutation.mutate({
          path: { roleId },
          body,
        });
      } else {
        tenantUpdateMutation.mutate({
          path: { orgId, roleId },
          body,
        });
      }
    }
  }

  return {
    submitRole,
    isLoading,
  };
}
