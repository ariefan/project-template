"use client";

import type { JobStatus } from "@workspace/contracts";
import { Badge } from "@workspace/ui/components/badge";
import { Progress } from "@workspace/ui/components/progress";
import {
  type BulkAction,
  type ColumnDef,
  DataView as DataViewComponent,
  DataViewExport,
  FilterButton,
  type RowAction,
  SearchInput,
  SortButton,
  ViewToggle,
} from "@workspace/ui/composed/data-view";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { Suspense } from "react";
import { PageHeader } from "@/components/layouts/page-header";
import {
  JobCategoryFilter,
  useJobCategoryFromUrl,
} from "./components/job-category-filter";
import {
  type UnifiedJob,
  useJobMutations,
  useUnifiedJobsData,
} from "./hooks/use-unified-jobs";

const statusLabels: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

const statusVariants: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "secondary",
  processing: "default",
  completed: "default",
  failed: "destructive",
  cancelled: "outline",
};

const statusIcons: Record<string, typeof Clock> = {
  pending: Clock,
  processing: Loader2,
  completed: CheckCircle,
  failed: AlertCircle,
  cancelled: XCircle,
};

const categoryLabels: Record<string, string> = {
  background: "Background",
  report: "Report",
};

const formatLabels: Record<string, string> = {
  csv: "CSV",
  excel: "Excel",
  pdf: "PDF",
  thermal: "Thermal",
  dotmatrix: "Dot Matrix",
};

function JobsContent() {
  const { category, setCategory } = useJobCategoryFromUrl();
  const { jobs, totalCount, fetchJobs, isLoading, orgId } =
    useUnifiedJobsData(category);
  const { cancelJob, retryJob } = useJobMutations();

  const columns: ColumnDef<UnifiedJob>[] = [
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
      id: "jobCategory",
      header: "Category",
      accessorKey: "jobCategory",
      width: 100,
      cell: ({ value }) => (
        <Badge variant="outline">
          {categoryLabels[String(value)] ?? String(value)}
        </Badge>
      ),
    },
    {
      id: "type",
      header: "Type",
      accessorKey: "type",
      width: 100,
      cell: ({ value }) => (
        <span className="text-muted-foreground">{String(value)}</span>
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
        { value: "pending", label: "Pending" },
        { value: "processing", label: "Processing" },
        { value: "completed", label: "Completed" },
        { value: "failed", label: "Failed" },
        { value: "cancelled", label: "Cancelled" },
      ],
      width: 130,
      cell: ({ value }) => {
        const status = String(value) as JobStatus;
        const Icon = statusIcons[status] ?? Clock;
        return (
          <Badge
            className="flex items-center gap-1"
            variant={statusVariants[status] ?? "outline"}
          >
            <Icon
              className={`size-3 ${status === "processing" ? "animate-spin" : ""}`}
            />
            {statusLabels[status] ?? status}
          </Badge>
        );
      },
    },
    {
      id: "progress",
      header: "Progress",
      accessorKey: "progress",
      width: 150,
      cell: ({ row, value }) => {
        const progress = Number(value) || 0;
        const status = row.status;
        if (status === "completed") {
          return <span className="text-green-600">100%</span>;
        }
        if (status === "failed" || status === "cancelled") {
          return <span className="text-muted-foreground">-</span>;
        }
        return (
          <div className="flex items-center gap-2">
            <Progress className="h-2 w-20" value={progress} />
            <span className="text-muted-foreground text-xs">{progress}%</span>
          </div>
        );
      },
    },
    {
      id: "format",
      header: "Format",
      accessorKey: "format",
      width: 80,
      cell: ({ row, value }) => {
        if (row.jobCategory !== "report" || !value) {
          return <span className="text-muted-foreground">-</span>;
        }
        return formatLabels[String(value)] ?? String(value);
      },
    },
    {
      id: "message",
      header: "Message",
      accessorKey: "message",
      minWidth: 150,
      cell: ({ value }) => (
        <span className="truncate text-muted-foreground text-sm">
          {value ? String(value).substring(0, 50) : "-"}
          {String(value ?? "").length > 50 ? "..." : ""}
        </span>
      ),
    },
    {
      id: "createdAt",
      header: "Created",
      accessorKey: "createdAt",
      sortable: true,
      width: 150,
      cell: ({ value }) => new Date(String(value)).toLocaleString(),
    },
    {
      id: "completedAt",
      header: "Completed",
      accessorKey: "completedAt",
      sortable: true,
      width: 150,
      cell: ({ value }) =>
        value ? new Date(String(value)).toLocaleString() : "-",
    },
  ];

  const rowActions: RowAction<UnifiedJob>[] = [
    {
      id: "download",
      label: "Download",
      icon: Download,
      onAction: async (row) => {
        const { toast } = await import("sonner");
        try {
          const apiUrl =
            process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
          window.open(
            `${apiUrl}/v1/orgs/${orgId}/reports/jobs/${row.id}/download`,
            "_blank"
          );
        } catch (error) {
          toast.error("Download failed", {
            description:
              error instanceof Error ? error.message : "An error occurred",
          });
        }
      },
      hidden: (row) =>
        row.jobCategory !== "report" || row.status !== "completed",
    },
    {
      id: "cancel",
      label: "Cancel",
      icon: XCircle,
      variant: "destructive",
      onAction: async (row) => {
        await cancelJob(row);
      },
      hidden: (row) => row.status !== "pending" && row.status !== "processing",
    },
    {
      id: "retry",
      label: "Retry",
      icon: RefreshCw,
      onAction: async (row) => {
        await retryJob(row.id);
      },
      hidden: (row) => row.jobCategory !== "report" || row.status !== "failed",
    },
  ];

  const bulkActions: BulkAction<UnifiedJob>[] = [
    {
      id: "cancel",
      label: "Cancel Selected",
      icon: XCircle,
      variant: "destructive",
      confirmMessage: "Are you sure you want to cancel the selected jobs?",
      onAction: async (rows) => {
        await Promise.all(
          rows
            .filter((r) => r.status === "pending" || r.status === "processing")
            .map((row) => cancelJob(row))
        );
      },
      disabled: (rows) =>
        rows.every((r) => r.status !== "pending" && r.status !== "processing"),
    },
    {
      id: "retry",
      label: "Retry Selected",
      icon: RefreshCw,
      onAction: async (rows) => {
        await Promise.all(
          rows
            .filter((r) => r.jobCategory === "report" && r.status === "failed")
            .map((row) => retryJob(row.id))
        );
      },
      disabled: (rows) =>
        rows.every((r) => r.jobCategory !== "report" || r.status !== "failed"),
    },
  ];

  function renderContent() {
    if (isLoading) {
      return (
        <div className="py-8 text-center text-muted-foreground">
          Loading jobs...
        </div>
      );
    }

    if (!orgId) {
      return (
        <div className="py-8 text-center text-muted-foreground">
          Please select an organization
        </div>
      );
    }

    return (
      <DataViewComponent<UnifiedJob>
        availableViews={["table", "list"]}
        bulkActions={bulkActions}
        columns={columns}
        data={jobs}
        defaultPageSize={10}
        defaultView="table"
        emptyMessage="No jobs found"
        filterable
        getRowId={(row) => row.id}
        hoverable
        loadingMessage="Loading jobs..."
        multiSelect
        onFetchData={fetchJobs}
        pageSizeOptions={[10, 25, 50, 100]}
        paginated
        rowActions={rowActions}
        searchable
        selectable
        sortable
        striped
        toolbarLeft={
          <>
            <JobCategoryFilter onChange={setCategory} value={category} />
            <SearchInput showFieldSelector />
          </>
        }
        toolbarRight={
          <>
            <FilterButton />
            <SortButton />
            <ViewToggle />
            <DataViewExport />
          </>
        }
        totalCount={totalCount}
      />
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        description="Monitor background jobs and report generation tasks. Track progress, download completed reports, and manage job status."
        title="Jobs"
      />

      {renderContent()}
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-7xl px-4 py-8">
          <div className="py-8 text-center text-muted-foreground">
            Loading...
          </div>
        </div>
      }
    >
      <JobsContent />
    </Suspense>
  );
}
