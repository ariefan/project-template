"use client";

import { useQuery } from "@tanstack/react-query";
import type { ReportTemplate } from "@workspace/contracts";
import { reportTemplatesListOptions } from "@workspace/contracts/query";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  type BulkAction,
  type ColumnDef,
  ColumnsButton,
  DataView as DataViewComponent,
  ExportButton,
  FilterButton,
  type RowAction,
  SearchInput,
  SortButton,
  ViewToggle,
} from "@workspace/ui/composed/data-view";
import { Copy, Edit, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useActiveOrganization } from "@/lib/auth";
import {
  useRunTemplate,
  useTemplateMutations,
  useTemplatesData,
} from "./hooks/use-templates-data";

const MODE_THRESHOLD = 1000;

const formatLabels: Record<string, string> = {
  csv: "CSV",
  excel: "Excel",
  pdf: "PDF",
  thermal: "Thermal",
  dotmatrix: "Dot Matrix",
};

const formatVariants: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  csv: "secondary",
  excel: "default",
  pdf: "destructive",
  thermal: "outline",
  dotmatrix: "outline",
};

export default function ReportTemplatesPage() {
  const router = useRouter();
  const { data: orgData, isPending: orgLoading } = useActiveOrganization();
  const orgId = orgData?.id ?? "";
  const { deleteTemplate, cloneTemplate } = useTemplateMutations();
  const { runTemplate } = useRunTemplate();
  const { fetchTemplates } = useTemplatesData();

  const { data: countData } = useQuery({
    ...reportTemplatesListOptions({
      client: apiClient,
      path: { orgId },
      query: { page: 1, pageSize: 1 },
    }),
    enabled: Boolean(orgId),
  });

  const totalCount =
    (countData as { pagination?: { totalCount: number } })?.pagination
      ?.totalCount ?? 0;

  const useServerMode = totalCount > MODE_THRESHOLD;

  const { data: clientData, isLoading: clientLoading } = useQuery({
    ...reportTemplatesListOptions({
      client: apiClient,
      path: { orgId },
      query: { page: 1, pageSize: Math.max(totalCount, 100) },
    }),
    enabled: Boolean(orgId) && !useServerMode,
  });

  const templates = (clientData as { data?: ReportTemplate[] })?.data ?? [];

  const columns: ColumnDef<ReportTemplate>[] = [
    {
      id: "id",
      header: "ID",
      accessorKey: "id",
      width: 100,
      cell: ({ value }) => {
        const id = String(value);
        return id.length > 8 ? `${id.substring(0, 8)}...` : id;
      },
    },
    {
      id: "name",
      header: "Name",
      accessorKey: "name",
      sortable: true,
      filterable: true,
      filterType: "text",
      minWidth: 200,
    },
    {
      id: "format",
      header: "Format",
      accessorKey: "format",
      sortable: true,
      filterable: true,
      filterType: "select",
      filterOptions: [
        { value: "csv", label: "CSV" },
        { value: "excel", label: "Excel" },
        { value: "pdf", label: "PDF" },
        { value: "thermal", label: "Thermal" },
        { value: "dotmatrix", label: "Dot Matrix" },
      ],
      width: 120,
      cell: ({ value }) => (
        <Badge variant={formatVariants[String(value)] ?? "outline"}>
          {formatLabels[String(value)] ?? String(value)}
        </Badge>
      ),
    },
    {
      id: "isPublic",
      header: "Public",
      accessorKey: "isPublic",
      filterable: true,
      filterType: "boolean",
      width: 80,
      cell: ({ value }) => (
        <Badge variant={value ? "default" : "secondary"}>
          {value ? "Yes" : "No"}
        </Badge>
      ),
    },
    {
      id: "description",
      header: "Description",
      accessorKey: "description",
      minWidth: 200,
      cell: ({ value }) => (
        <span className="text-muted-foreground">
          {String(value ?? "-").substring(0, 50)}
          {String(value ?? "").length > 50 ? "..." : ""}
        </span>
      ),
    },
    {
      id: "createdAt",
      header: "Created",
      accessorKey: "createdAt",
      sortable: true,
      width: 110,
      cell: ({ value }) => new Date(String(value)).toLocaleDateString(),
    },
    {
      id: "updatedAt",
      header: "Updated",
      accessorKey: "updatedAt",
      sortable: true,
      width: 110,
      cell: ({ value }) => new Date(String(value)).toLocaleDateString(),
    },
  ];

  const rowActions: RowAction<ReportTemplate>[] = [
    {
      id: "run",
      label: "Run Now",
      icon: (props: React.SVGProps<SVGSVGElement>) => (
        <svg
          aria-hidden="true"
          fill="none"
          height="24"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="24"
          xmlns="http://www.w3.org/2000/svg"
          {...props}
        >
          <title>Run</title>
          <polygon points="6 3 20 12 6 21 6 3" />
        </svg>
      ),
      onAction: async (row) => {
        const { toast } = await import("sonner");
        try {
          const result = await runTemplate({
            templateId: row.id,
            format: row.format as
              | "csv"
              | "excel"
              | "pdf"
              | "thermal"
              | "dotmatrix",
          });

          // Handle SDK response structure
          const data = result.data as
            | { jobId?: string; error?: string }
            | undefined;
          if (!data?.jobId) {
            throw new Error(data?.error ?? "No job ID returned");
          }

          toast.success("Report job created", {
            description: `Job ${data.jobId} has been queued. Check the Jobs page for status.`,
            action: {
              label: "View Jobs",
              onClick: () => {
                router.push("/jobs?type=report");
              },
            },
          });
        } catch (error) {
          toast.error("Failed to run template", {
            description:
              error instanceof Error ? error.message : "An error occurred",
          });
        }
      },
    },
    {
      id: "edit",
      label: "Edit",
      icon: Edit,
      onAction: (row) => {
        router.push(`/reports/templates/${row.id}/edit`);
      },
    },
    {
      id: "clone",
      label: "Clone",
      icon: Copy,
      onAction: async (row) => {
        await cloneTemplate({
          id: row.id,
          name: `${row.name} (Copy)`,
          description: row.description,
        });
      },
    },
    {
      id: "delete",
      label: "Delete",
      icon: Trash2,
      variant: "destructive",
      onAction: async (row) => {
        await deleteTemplate(row.id);
      },
    },
  ];

  const bulkActions: BulkAction<ReportTemplate>[] = [
    {
      id: "delete",
      label: "Delete Selected",
      icon: Trash2,
      variant: "destructive",
      confirmMessage: "Are you sure you want to delete the selected templates?",
      onAction: async (rows) => {
        await Promise.all(rows.map((row) => deleteTemplate(row.id)));
      },
    },
  ];

  function renderContent() {
    if (orgLoading || clientLoading) {
      return (
        <div className="py-8 text-center text-muted-foreground">
          Loading templates...
        </div>
      );
    }

    if (!orgData?.id) {
      return (
        <div className="py-8 text-center text-muted-foreground">
          Please select an organization
        </div>
      );
    }

    const modeIndicator = (
      <div className="mb-2 text-muted-foreground text-xs">
        {useServerMode
          ? `Server mode (${totalCount.toLocaleString()} templates)`
          : `Client mode (${totalCount.toLocaleString()} templates)`}
      </div>
    );

    const commonProps = {
      availableViews: ["table", "list"] as ("table" | "list")[],
      bulkActions,
      columns,
      defaultPageSize: 10,
      defaultView: "table" as "table" | "list",
      emptyMessage: "No templates found",
      filterable: true,
      getRowId: (row: ReportTemplate) => row.id,
      hoverable: true,
      loadingMessage: "Loading templates...",
      multiSelect: true,
      pageSizeOptions: [10, 25, 50, 100],
      paginated: true,
      primaryAction: (
        <Button asChild size="sm">
          <Link href="/reports/templates/new">
            <Plus className="size-4" />
            <span className="hidden sm:inline">New Template</span>
          </Link>
        </Button>
      ),
      rowActions,
      searchable: true,
      selectable: true,
      sortable: true,
      striped: true,
      toolbarLeft: <SearchInput showFieldSelector />,
      toolbarRight: (
        <>
          <ViewToggle />
          <ColumnsButton />
          <FilterButton />
          <SortButton />
          <ExportButton />
        </>
      ),
    };

    return (
      <>
        {modeIndicator}
        {useServerMode ? (
          <DataViewComponent<ReportTemplate>
            {...commonProps}
            data={[]}
            mode="server"
            onFetchData={fetchTemplates}
          />
        ) : (
          <DataViewComponent<ReportTemplate>
            {...commonProps}
            data={templates}
          />
        )}
      </>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="font-bold text-2xl">Report Templates</h1>
        <p className="mt-1 text-muted-foreground">
          Create and manage report templates for CSV, Excel, PDF, and printer
          outputs.
        </p>
      </div>

      {renderContent()}
    </div>
  );
}
