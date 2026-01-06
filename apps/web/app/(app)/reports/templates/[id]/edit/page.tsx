"use client";

import { useQuery } from "@tanstack/react-query";
import type { ReportTemplate } from "@workspace/contracts";
import { reportTemplatesGetOptions } from "@workspace/contracts/query";
import { Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useActiveOrganization } from "@/lib/auth";
import { TemplateEditor } from "../../components/template-editor";

export default function EditTemplatePage() {
  const params = useParams();
  const templateId = params.id as string;
  const { data: orgData, isPending: orgLoading } = useActiveOrganization();
  const orgId = orgData?.id ?? "";

  const { data, isLoading, error } = useQuery({
    ...reportTemplatesGetOptions({
      client: apiClient,
      path: { orgId, templateId },
    }),
    enabled: Boolean(orgId) && Boolean(templateId),
  });

  const template = (data as { data?: ReportTemplate })?.data;

  if (orgLoading || isLoading) {
    return (
      <div className="container mx-auto flex max-w-7xl items-center justify-center px-4 py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-md bg-destructive/10 p-4 text-destructive">
          Failed to load template: {error.message}
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-md bg-destructive/10 p-4 text-destructive">
          Template not found
        </div>
      </div>
    );
  }

  return <TemplateEditor mode="edit" template={template} />;
}
