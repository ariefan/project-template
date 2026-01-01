import { EditRoleForm } from "./edit-role-form";

interface EditRolePageProps {
  params: Promise<{ roleId: string }>;
}

export default async function EditRolePage({ params }: EditRolePageProps) {
  const { roleId } = await params;

  return <EditRoleForm roleId={roleId} />;
}
