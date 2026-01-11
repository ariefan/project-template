import { PageHeader } from "@/components/layouts/page-header";
import { LegalDocumentForm } from "../legal-document-form";

interface EditLegalDocumentPageProps {
  params: Promise<{ documentId: string }>;
}

export default async function EditLegalDocumentPage({
  params,
}: EditLegalDocumentPageProps) {
  const { documentId } = await params;

  // TODO: Fetch actual document data
  // const document = await fetchLegalDocument(documentId);

  return (
    <div className="space-y-6">
      <PageHeader
        description="Edit document settings or create a new version"
        title="Edit Legal Document"
      />
      <LegalDocumentForm
        document={{
          id: documentId,
          type: "terms_of_service",
          slug: "terms-of-service",
          locale: "en",
          activeVersion: {
            title: "Terms of Service v1",
            content: "# Terms of Service\n\nPlaceholder content...",
            changelog: "",
            requiresReAcceptance: false,
          },
        }}
        mode="edit"
      />
    </div>
  );
}
