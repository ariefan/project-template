import { CrudDetail } from "../_components/crud-detail";

interface CrudDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CrudDetailPage({ params }: CrudDetailPageProps) {
  const { id } = await params;
  return <CrudDetail id={id} />;
}
