import { UsersList } from "@/app/(app)/admin/users/users-list";

export default function OrganizationMembersPage() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div>
        <h3 className="font-medium text-lg">Members</h3>
        <p className="text-muted-foreground text-sm">
          Manage member access and roles.
        </p>
      </div>
      <UsersList />
    </div>
  );
}
