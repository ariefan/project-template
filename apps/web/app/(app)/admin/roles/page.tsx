"use client";

import { useActiveOrganization } from "@/lib/auth";
import { GlobalRolesList } from "./global/global-roles-list";
import { RolesList } from "./roles-list";

export default function RolesPage() {
  const { data: activeOrganization } = useActiveOrganization();

  if (!activeOrganization?.id) {
    return <GlobalRolesList />;
  }

  return <RolesList />;
}
