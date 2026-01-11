import type { CreateRoleRequest, Role } from "@workspace/contracts";
import type React from "react";
import { useState } from "react";
import {
  buildPermissionsList,
  type PermissionState,
} from "./role-permissions-config";

interface UseRoleFormProps {
  role?: Role;
  permissions: PermissionState;
  submitRole: (body: CreateRoleRequest) => void;
}

export function useRoleForm({
  role,
  permissions,
  submitRole,
}: UseRoleFormProps) {
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Role name is required");
      return;
    }

    const permissionsList = buildPermissionsList(permissions);

    const body: CreateRoleRequest = {
      name: name.trim(),
      description: description.trim() || undefined,
      permissions: permissionsList,
    };

    submitRole(body);
  }

  return {
    name,
    setName,
    description,
    setDescription,
    error,
    setError,
    handleSubmit,
  };
}
