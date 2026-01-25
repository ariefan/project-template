"use client";

import type { Job } from "@workspace/contracts";
import { Badge } from "@workspace/ui/components/badge";
import {
  type ColumnDef,
  DataView as DataViewComponent,
  FilterButton,
  type RowAction,
  SearchInput,
  SortButton,
  ViewToggle,
} from "@workspace/ui/composed/data-view";
import { format } from "date-fns";
import { Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useActiveOrganization } from "@/lib/auth";
import { useReportHistory } from "./hooks/use-report-history";

const statusVariants: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  pending: "outline",
  processing: "secondary",
  completed: "default",
  failed: "destructive",
  cancelled: "outline",
};

const formatLabels: Record<string, string> = {
  csv: "CSV",
  excel: "Excel",
  pdf: "PDF",
  thermal: "Thermal",
  dotmatrix: "Dot Matrix",
};

export default function ReportHistoryPage() {
  const { isPending: orgLoading } = useActiveOrganization(); // Removed unused orgData
  const { fetchHistory, orgId } = useReportHistory();

  const columns: ColumnDef<Job>[] = [
    {
      id: "report",
      header: "Report / Template ID",
      accessorKey: "metadata",
      minWidth: 200,
      cell: ({ value }) => {
        // biome-ignore lint/suspicious/noExplicitAny: complex metadata
        const metadata = value as any;
        return (
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-muted-foreground" />
            <span className="font-medium">
              {metadata?.templateId || "Custom Export"}
            </span>
          </div>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      accessorKey: "status",
      width: 120,
      cell: ({ value }) => (
        <Badge variant={statusVariants[String(value)] ?? "outline"}>
          {String(value).toUpperCase()}
        </Badge>
      ),
    },
    {
      id: "format",
      header: "Format",
      accessorKey: "metadata",
      width: 100,
      cell: ({ value }) => {
        // biome-ignore lint/suspicious/noExplicitAny: complex metadata
        const metadata = value as any;
        const fmt = metadata?.format || "csv";
        return (
          <Badge variant="outline">
            {formatLabels[fmt] ?? fmt.toUpperCase()}
          </Badge>
        );
      },
    },
    {
      id: "createdAt",
      header: "Requested At",
      accessorKey: "createdAt",
      sortable: true,
      width: 180,
      cell: ({ value }) => format(new Date(String(value)), "MMM d, yyyy HH:mm"),
    },
    {
      id: "completedAt",
      header: "Completed At",
      accessorKey: "completedAt",
      width: 180,
      cell: ({ value }) =>
        value ? format(new Date(String(value)), "MMM d, yyyy HH:mm") : "-",
    },
  ];

  const rowActions: RowAction<Job>[] = [
    {
      id: "download",
      label: "Download",
      icon: Download,
      disabled: (row) => row.status !== "completed",
      onAction: (row) => {
        // Use the dedicated download endpoint
        const downloadUrl = `${process.env.NEXT_PUBLIC_API_URL}/v1/orgs/${orgId}/jobs/${row.jobId}/download`;
        window.open(downloadUrl, "_blank");
        toast.success("Download started");
      },
    },
  ];

  function renderContent() {
    if (orgLoading) {
      return (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (!orgId) {
      return (
        <div className="py-8 text-center text-muted-foreground">
          Please select an organization to view history.
        </div>
      );
    }

    return (
      <DataViewComponent<Job>
        columns={columns}
        data={[]}
        emptyMessage="No report history found."
        getRowId={(row) => row.jobId}
        mode="server"
        onFetchData={fetchHistory}
        paginated
        rowActions={rowActions}
        searchable
        toolbarLeft={<SearchInput placeholder="Search reports..." />}
        toolbarRight={
          <>
            <ViewToggle />
            <FilterButton />
            <SortButton />
          </>
        }
      />
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="font-bold text-2xl">Report History</h1>
        <p className="mt-1 text-muted-foreground">
          View and download your previously generated reports.
        </p>
      </div>

      {renderContent()}
    </div>
  );
}
