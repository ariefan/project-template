import { RolesList } from "@/app/(app)/admin/roles/roles-list";

export default function OrganizationRolesPage() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div>
        <h3 className="font-medium text-lg">Roles & Permissions</h3>
        <p className="text-muted-foreground text-sm">
          Configure roles and granular permissions for your organization.
        </p>
      </div>
      <RolesList />
    </div>
  );
}
