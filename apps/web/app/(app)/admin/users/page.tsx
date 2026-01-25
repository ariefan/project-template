import { PageHeader } from "@/components/layouts/page-header";
import { UsersList } from "./users-list";

export default function UsersPage() {
  return (
    <div className="container mx-auto max-w-7xl space-y-6 py-6">
      <PageHeader
        description="Manage all users across the platform"
        title="Users"
      />
      <UsersList />
    </div>
  );
}
