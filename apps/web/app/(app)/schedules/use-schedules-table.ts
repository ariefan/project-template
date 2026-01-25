import { useQuery } from "@tanstack/react-query";
import type { ScheduledJob } from "@workspace/contracts";
import type { BulkAction, RowAction } from "@workspace/ui/composed/data-view";
import { Edit, Pause, Play, Trash2, Zap } from "lucide-react";
import { useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useActiveOrganization } from "@/lib/auth";
import {
  useScheduleMutations,
  useSchedulesData,
} from "./hooks/use-schedules-data";

const MODE_THRESHOLD = 1000;

export function useSchedulesTable(isGlobal = false) {
  const { data: orgData, isPending: orgLoading } = useActiveOrganization();
  const orgId = isGlobal ? "global" : (orgData?.id ?? "");
  const { deleteSchedule, pauseSchedule, resumeSchedule, runSchedule } =
    useScheduleMutations(isGlobal);
  const { fetchSchedules } = useSchedulesData(isGlobal);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<
    ScheduledJob | undefined
  >();

  const getSchedulesUrl = isGlobal
    ? "/v1/admin/system/schedules"
    : `/v1/orgs/${orgId}/schedules`;

  // Use a minimal query to get total count
  const { data: countData } = useQuery({
    queryKey: ["scheduledJobs", orgId, "count"],
    queryFn: async () => {
      const response = await apiClient.get({
        url: getSchedulesUrl,
        query: { page: 1, pageSize: 1 },
      });
      return response.data ?? { data: [], pagination: { totalCount: 0 } };
    },
    enabled: isGlobal || Boolean(orgId),
  });

  const totalCount =
    (countData as { pagination?: { totalCount: number } })?.pagination
      ?.totalCount ?? 0;

  const useServerMode = totalCount > MODE_THRESHOLD;

  // If in client mode, fetch all data
  const { data: clientData, isLoading: clientLoading } = useQuery({
    queryKey: ["scheduledJobs", orgId, "all"],
    queryFn: async () => {
      const response = await apiClient.get({
        url: getSchedulesUrl,
        query: { page: 1, pageSize: Math.max(totalCount, 100) },
      });
      return response.data ?? { data: [] };
    },
    enabled: (isGlobal || Boolean(orgId)) && !useServerMode,
  });

  const schedules = (clientData as { data?: ScheduledJob[] })?.data ?? [];

  const rowActions: RowAction<ScheduledJob>[] = [
    {
      id: "run",
      label: "Run Now",
      icon: Zap,
      onAction: async (row: ScheduledJob) => {
        await runSchedule(row.id);
      },
    },
    {
      id: "edit",
      label: "Edit",
      icon: Edit,
      onAction: (row: ScheduledJob) => {
        setEditingSchedule(row);
        setDialogOpen(true);
      },
    },
    {
      id: "pause",
      label: "Pause",
      icon: Pause,
      onAction: async (row: ScheduledJob) => {
        await pauseSchedule(row.id);
      },
      hidden: (row: ScheduledJob) => !row.isActive,
    },
    {
      id: "resume",
      label: "Resume",
      icon: Play,
      onAction: async (row: ScheduledJob) => {
        await resumeSchedule(row.id);
      },
      hidden: (row: ScheduledJob) => row.isActive,
    },
    {
      id: "delete",
      label: "Delete",
      icon: Trash2,
      variant: "destructive",
      onAction: async (row: ScheduledJob) => {
        await deleteSchedule(row.id);
      },
    },
  ];

  const bulkActions: BulkAction<ScheduledJob>[] = [
    {
      id: "pause",
      label: "Pause Selected",
      icon: Pause,
      onAction: async (rows: ScheduledJob[]) => {
        await Promise.all(
          rows
            .filter((r: ScheduledJob) => r.isActive)
            .map((row: ScheduledJob) => pauseSchedule(row.id))
        );
      },
      disabled: (rows: ScheduledJob[]) =>
        rows.every((r: ScheduledJob) => !r.isActive),
    },
    {
      id: "resume",
      label: "Resume Selected",
      icon: Play,
      onAction: async (rows: ScheduledJob[]) => {
        await Promise.all(
          rows
            .filter((r: ScheduledJob) => !r.isActive)
            .map((row: ScheduledJob) => resumeSchedule(row.id))
        );
      },
      disabled: (rows: ScheduledJob[]) =>
        rows.every((r: ScheduledJob) => r.isActive),
    },
    {
      id: "delete",
      label: "Delete Selected",
      icon: Trash2,
      variant: "destructive",
      confirmMessage: "Are you sure you want to delete the selected schedules?",
      onAction: async (rows: ScheduledJob[]) => {
        await Promise.all(
          rows.map((row: ScheduledJob) => deleteSchedule(row.id))
        );
      },
    },
  ];

  const handleCreateNew = () => {
    setEditingSchedule(undefined);
    setDialogOpen(true);
  };

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingSchedule(undefined);
    }
  };

  return {
    orgId,
    isLoading: (!isGlobal && orgLoading) || clientLoading,
    totalCount,
    useServerMode,
    schedules,
    fetchSchedules,
    rowActions,
    bulkActions,
    dialogOpen,
    editingSchedule,
    handleCreateNew,
    handleDialogChange,
  };
}
