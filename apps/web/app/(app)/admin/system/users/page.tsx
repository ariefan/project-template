import { PageHeader } from "@/components/layouts/page-header";
import { SystemUsersList } from "./system-users-list";

export default function SystemUsersPage() {
  return (
    <div className="container mx-auto max-w-7xl space-y-6 py-6">
      <PageHeader
        description="Manage all users across the system"
        title="System Users"
      />
      <SystemUsersList />
    </div>
  );
}
