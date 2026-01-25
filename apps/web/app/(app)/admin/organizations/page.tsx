"use client";

import { PageHeader } from "@/components/layouts/page-header";
import { OrganizationsList } from "./organizations-list";

export default function OrganizationsPage() {
  return (
    <div className="container mx-auto max-w-7xl space-y-6 py-6">
      <PageHeader
        description="Manage all organizations across the platform"
        title="Organizations"
      />
      <OrganizationsList />
    </div>
  );
}
