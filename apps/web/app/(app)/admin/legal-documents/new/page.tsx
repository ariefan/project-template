import { PageHeader } from "@/components/layouts/page-header";
import { LegalDocumentForm } from "../legal-document-form";

export default function NewLegalDocumentPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        description="Create a new legal document with its initial version"
        title="New Legal Document"
      />
      <LegalDocumentForm mode="create" />
    </div>
  );
}
