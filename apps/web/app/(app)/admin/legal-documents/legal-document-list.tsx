"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  LegalDocumentStatus,
  LegalDocumentType,
  LegalDocumentWithVersion,
} from "@workspace/contracts";
import { legalDocumentsAdminList } from "@workspace/contracts";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty";
import {
  type ColumnDef,
  DataView as DataViewComponent,
  type RowAction,
} from "@workspace/ui/composed/data-view";
import { formatDistanceToNow } from "date-fns";
import { Plus, ScrollText } from "lucide-react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layouts/page-header";
import { apiClient } from "@/lib/api-client";

// Document type display config
const DOCTYPE_CONFIG: Record<string, { label: string; color: string }> = {
  terms_of_service: {
    label: "Terms of Service",
    color: "bg-blue-100 text-blue-800",
  },
  privacy_policy: {
    label: "Privacy Policy",
    color: "bg-green-100 text-green-800",
  },
  cookie_policy: {
    label: "Cookie Policy",
    color: "bg-amber-100 text-amber-800",
  },
  eula: { label: "EULA", color: "bg-purple-100 text-purple-800" },
  community_guidelines: {
    label: "Community Guidelines",
    color: "bg-pink-100 text-pink-800",
  },
};

// Status display config
const STATUS_CONFIG: Record<
  string,
  { variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  draft: { variant: "secondary" },
  published: { variant: "default" },
  archived: { variant: "outline" },
};

export function LegalDocumentList() {
  const router = useRouter();

  // Fetch documents from API
  const { data } = useQuery({
    queryKey: ["legalDocumentsAdminList"],
    queryFn: async () => {
      const response = await legalDocumentsAdminList({
        client: apiClient,
        query: { page: 1, pageSize: 100 },
      });
      return response.data ?? { data: [], meta: { total: 0 } };
    },
  });

  const documents = (
    data && "data" in data ? data.data : []
  ) as LegalDocumentWithVersion[];

  // Column definitions
  const columns: ColumnDef<LegalDocumentWithVersion>[] = [
    {
      id: "type",
      header: "Type",
      accessorKey: "type",
      sortable: true,
      filterable: true,
      filterType: "select",
      filterOptions: [
        { value: "terms_of_service", label: "Terms of Service" },
        { value: "privacy_policy", label: "Privacy Policy" },
        { value: "cookie_policy", label: "Cookie Policy" },
        { value: "eula", label: "EULA" },
        { value: "community_guidelines", label: "Community Guidelines" },
      ],
      width: 200,
      cell: ({ value }) => {
        const type = value as LegalDocumentType;
        const config = DOCTYPE_CONFIG[type] || {
          label: type,
          color: "bg-gray-100 text-gray-800",
        };
        return (
          <Badge className={config.color} variant="outline">
            {config.label}
          </Badge>
        );
      },
    },
    {
      id: "title",
      header: "Active Version",
      accessorKey: "activeVersion",
      minWidth: 250,
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="font-medium">
            {row.activeVersion?.title || "No published version"}
          </p>
          <p className="text-muted-foreground text-xs">
            {row.activeVersion ? `v${row.activeVersion.version}` : "Draft only"}
          </p>
        </div>
      ),
    },
    {
      id: "locale",
      header: "Locale",
      accessorKey: "locale",
      width: 80,
      cell: ({ value }) => (
        <Badge className="uppercase" variant="outline">
          {String(value)}
        </Badge>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessorKey: "status",
      sortable: true,
      filterable: true,
      filterType: "select",
      filterOptions: [
        { value: "draft", label: "Draft" },
        { value: "published", label: "Published" },
        { value: "archived", label: "Archived" },
      ],
      width: 120,
      cell: ({ value }) => {
        const status = value as LegalDocumentStatus;
        const config = STATUS_CONFIG[status] || { variant: "outline" as const };
        return (
          <Badge className="capitalize" variant={config.variant}>
            {String(value)}
          </Badge>
        );
      },
    },
    {
      id: "versions",
      header: "Versions",
      accessorKey: "versionCount",
      width: 100,
      cell: ({ value }) => (
        <span className="text-muted-foreground">
          {Number(value) || 0} versions
        </span>
      ),
    },
    {
      id: "updatedAt",
      header: "Last Updated",
      accessorKey: "updatedAt",
      sortable: true,
      width: 150,
      cell: ({ value }) =>
        formatDistanceToNow(new Date(String(value)), { addSuffix: true }),
    },
  ];

  // Row actions
  const rowActions: RowAction<LegalDocumentWithVersion>[] = [
    {
      id: "edit",
      label: "Edit",
      onAction: (row) => {
        router.push(`/admin/legal-documents/${row.id}`);
      },
    },
    {
      id: "versions",
      label: "Manage Versions",
      onAction: (row) => {
        router.push(`/admin/legal-documents/${row.id}/versions`);
      },
    },
    {
      id: "preview",
      label: "Preview Active",
      onAction: (row) => {
        if (row.activeVersionId) {
          router.push(
            `/admin/legal-documents/${row.id}/versions/${row.activeVersionId}/preview`
          );
        }
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button onClick={() => router.push("/admin/legal-documents/new")}>
            <Plus className="mr-2 size-4" />
            New Document
          </Button>
        }
        description="Manage legal documents like Terms of Service, Privacy Policy, and more"
        title="Legal Documents"
      />

      <DataViewComponent
        columns={columns}
        data={documents}
        defaultView="table"
        emptyState={
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ScrollText />
              </EmptyMedia>
              <EmptyTitle>No legal documents</EmptyTitle>
              <EmptyDescription>
                Get started by creating your first legal document.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        }
        getRowId={(row) => row.id}
        rowActions={rowActions}
        searchPlaceholder="Search documents..."
      />
    </div>
  );
}
