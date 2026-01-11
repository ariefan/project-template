import { EditGlobalRoleForm } from "./edit-global-role-form";

interface EditGlobalRolePageProps {
  params: Promise<{ roleId: string }>;
}

export default async function EditGlobalRolePage({
  params,
}: EditGlobalRolePageProps) {
  const { roleId } = await params;

  return <EditGlobalRoleForm roleId={roleId} />;
}
