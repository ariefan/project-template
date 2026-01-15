"use client";

import { PageHeader } from "@/components/layouts/page-header";
import { SystemOrganizationsList } from "./system-organizations-list";

export default function SystemOrganizationsPage() {
  return (
    <div className="container mx-auto max-w-7xl space-y-6 py-6">
      <PageHeader
        description="Manage all organizations in the system"
        title="System Organizations"
      />
      <SystemOrganizationsList />
    </div>
  );
}
