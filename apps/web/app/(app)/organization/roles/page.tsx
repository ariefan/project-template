import { RolesList } from "@/app/(app)/admin/roles/roles-list";
import { PageHeader } from "@/components/layouts/page-header";

export default function OrganizationRolesPage() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        description="Configure roles and granular permissions for your organization."
        title="Roles & Permissions"
      />
      <RolesList />
    </div>
  );
}
