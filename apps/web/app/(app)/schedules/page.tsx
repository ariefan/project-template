"use client";

import { useQuery } from "@tanstack/react-query";
import type { ScheduledJob } from "@workspace/contracts";
import { scheduledJobsListOptions } from "@workspace/contracts/query";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
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
import { Edit, Pause, Play, Plus, Trash2, Zap } from "lucide-react";
import { useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useActiveOrganization } from "@/lib/auth";
import { ScheduleFormDialog } from "./components/schedule-form-dialog";
import {
  useScheduleMutations,
  useSchedulesData,
} from "./hooks/use-schedules-data";

const MODE_THRESHOLD = 1000;

const frequencyLabels: Record<string, string> = {
  once: "Once",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  custom: "Custom",
};

const deliveryLabels: Record<string, string> = {
  email: "Email",
  none: "None",
  webhook: "Webhook",
  storage: "Storage",
};

const jobTypeLabels: Record<string, string> = {
  report: "Report",
  export: "Export",
  import: "Import",
};

function getJobTypeLabel(jobType: string): string {
  return jobTypeLabels[jobType] ?? jobType;
}

export default function SchedulesPage() {
  const { data: orgData, isPending: orgLoading } = useActiveOrganization();
  const orgId = orgData?.id ?? "";
  const { deleteSchedule, pauseSchedule, resumeSchedule, runSchedule } =
    useScheduleMutations();
  const { fetchSchedules } = useSchedulesData();

  const { data: countData } = useQuery({
    ...scheduledJobsListOptions({
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
    ...scheduledJobsListOptions({
      client: apiClient,
      path: { orgId },
      query: { page: 1, pageSize: Math.max(totalCount, 100) },
    }),
    enabled: Boolean(orgId) && !useServerMode,
  });

  const schedules = (clientData as { data?: ScheduledJob[] })?.data ?? [];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<
    ScheduledJob | undefined
  >();

  const columns: ColumnDef<ScheduledJob>[] = [
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
      id: "jobType",
      header: "Job Type",
      accessorKey: "jobType",
      filterable: true,
      filterType: "select",
      filterOptions: [
        { value: "report", label: "Report" },
        { value: "export", label: "Export" },
        { value: "import", label: "Import" },
      ],
      width: 120,
      cell: ({ value }) => (
        <Badge variant="secondary">{getJobTypeLabel(String(value))}</Badge>
      ),
    },
    {
      id: "frequency",
      header: "Frequency",
      accessorKey: "frequency",
      sortable: true,
      filterable: true,
      filterType: "select",
      filterOptions: [
        { value: "once", label: "Once" },
        { value: "daily", label: "Daily" },
        { value: "weekly", label: "Weekly" },
        { value: "monthly", label: "Monthly" },
        { value: "custom", label: "Custom" },
      ],
      width: 120,
      cell: ({ value }) => (
        <Badge variant="secondary">
          {frequencyLabels[String(value)] ?? String(value)}
        </Badge>
      ),
    },
    {
      id: "deliveryMethod",
      header: "Delivery",
      accessorKey: "deliveryMethod",
      filterable: true,
      filterType: "select",
      filterOptions: [
        { value: "email", label: "Email" },
        { value: "none", label: "None" },
        { value: "webhook", label: "Webhook" },
        { value: "storage", label: "Storage" },
      ],
      width: 100,
      cell: ({ value }) => (
        <Badge variant="outline">
          {deliveryLabels[String(value)] ?? String(value)}
        </Badge>
      ),
    },
    {
      id: "isActive",
      header: "Status",
      accessorKey: "isActive",
      filterable: true,
      filterType: "boolean",
      width: 100,
      cell: ({ value }) => (
        <Badge variant={value ? "default" : "secondary"}>
          {value ? "Active" : "Paused"}
        </Badge>
      ),
    },
    {
      id: "nextRunAt",
      header: "Next Run",
      accessorKey: "nextRunAt",
      sortable: true,
      width: 150,
      cell: ({ value }) =>
        value ? new Date(String(value)).toLocaleString() : "-",
    },
    {
      id: "lastRunAt",
      header: "Last Run",
      accessorKey: "lastRunAt",
      sortable: true,
      width: 150,
      cell: ({ value }) =>
        value ? new Date(String(value)).toLocaleString() : "Never",
    },
    {
      id: "failureCount",
      header: "Failures",
      accessorKey: "failureCount",
      width: 80,
      cell: ({ value }) => {
        const count = Number(value) || 0;
        return count > 0 ? (
          <Badge variant="destructive">{count}</Badge>
        ) : (
          <span className="text-muted-foreground">0</span>
        );
      },
    },
  ];

  const rowActions: RowAction<ScheduledJob>[] = [
    {
      id: "run",
      label: "Run Now",
      icon: Zap,
      onAction: async (row) => {
        await runSchedule(row.id);
      },
    },
    {
      id: "edit",
      label: "Edit",
      icon: Edit,
      onAction: (row) => {
        setEditingSchedule(row);
        setDialogOpen(true);
      },
    },
    {
      id: "pause",
      label: "Pause",
      icon: Pause,
      onAction: async (row) => {
        await pauseSchedule(row.id);
      },
      hidden: (row) => !row.isActive,
    },
    {
      id: "resume",
      label: "Resume",
      icon: Play,
      onAction: async (row) => {
        await resumeSchedule(row.id);
      },
      hidden: (row) => row.isActive,
    },
    {
      id: "delete",
      label: "Delete",
      icon: Trash2,
      variant: "destructive",
      onAction: async (row) => {
        await deleteSchedule(row.id);
      },
    },
  ];

  const bulkActions: BulkAction<ScheduledJob>[] = [
    {
      id: "pause",
      label: "Pause Selected",
      icon: Pause,
      onAction: async (rows) => {
        await Promise.all(
          rows.filter((r) => r.isActive).map((row) => pauseSchedule(row.id))
        );
      },
      disabled: (rows) => rows.every((r) => !r.isActive),
    },
    {
      id: "resume",
      label: "Resume Selected",
      icon: Play,
      onAction: async (rows) => {
        await Promise.all(
          rows.filter((r) => !r.isActive).map((row) => resumeSchedule(row.id))
        );
      },
      disabled: (rows) => rows.every((r) => r.isActive),
    },
    {
      id: "delete",
      label: "Delete Selected",
      icon: Trash2,
      variant: "destructive",
      confirmMessage: "Are you sure you want to delete the selected schedules?",
      onAction: async (rows) => {
        await Promise.all(rows.map((row) => deleteSchedule(row.id)));
      },
    },
  ];

  function handleCreateNew() {
    setEditingSchedule(undefined);
    setDialogOpen(true);
  }

  function renderContent() {
    if (orgLoading || clientLoading) {
      return (
        <div className="py-8 text-center text-muted-foreground">
          Loading schedules...
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
          ? `Server mode (${totalCount.toLocaleString()} schedules)`
          : `Client mode (${totalCount.toLocaleString()} schedules)`}
      </div>
    );

    const commonProps = {
      availableViews: ["table", "list"] as ("table" | "list")[],
      bulkActions,
      columns,
      defaultPageSize: 10,
      defaultView: "table" as "table" | "list",
      emptyMessage: "No schedules found",
      filterable: true,
      getRowId: (row: ScheduledJob) => row.id,
      hoverable: true,
      loadingMessage: "Loading schedules...",
      multiSelect: true,
      pageSizeOptions: [10, 25, 50, 100],
      paginated: true,
      primaryAction: (
        <Button onClick={handleCreateNew} size="sm">
          <Plus className="size-4" />
          <span className="hidden sm:inline">New Schedule</span>
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
          <FilterButton />
          <SortButton />
          <ViewToggle />
          <DataViewExport />
        </>
      ),
    };

    return (
      <>
        {modeIndicator}
        {useServerMode ? (
          <DataViewComponent<ScheduledJob>
            {...commonProps}
            data={[]}
            mode="server"
            onFetchData={fetchSchedules}
          />
        ) : (
          <DataViewComponent<ScheduledJob> {...commonProps} data={schedules} />
        )}
      </>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="font-bold text-2xl">Scheduled Jobs</h1>
        <p className="mt-1 text-muted-foreground">
          Automate any job type with flexible scheduling. Set up recurring tasks
          for reports, exports, imports, and custom jobs.
        </p>
      </div>

      {renderContent()}

      <ScheduleFormDialog
        mode={editingSchedule ? "edit" : "create"}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingSchedule(undefined);
          }
        }}
        open={dialogOpen}
        schedule={editingSchedule}
      />
    </div>
  );
}
