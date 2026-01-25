"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreateScheduledJobRequest,
  ScheduledJob,
  UpdateScheduledJobRequest,
} from "@workspace/contracts";
import {
  scheduledJobsCreate,
  scheduledJobsDelete,
  scheduledJobsPause,
  scheduledJobsResume,
  scheduledJobsRunNow,
  scheduledJobsUpdate,
} from "@workspace/contracts";
import type {
  ServerSideRequest,
  ServerSideResponse,
} from "@workspace/ui/composed/data-view";
import { useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { useActiveOrganization } from "@/lib/auth";

function buildQueryParams(request: ServerSideRequest) {
  return {
    page: request.page,
    pageSize: request.pageSize,
    search: request.search || undefined,
    jobType: request.filters.find((f) => f.field === "jobType")?.value as
      | string
      | undefined,
    frequency: request.filters.find((f) => f.field === "frequency")?.value as
      | "once"
      | "daily"
      | "weekly"
      | "monthly"
      | "custom"
      | undefined,
    deliveryMethod: request.filters.find((f) => f.field === "deliveryMethod")
      ?.value as "email" | "webhook" | "storage" | "none" | undefined,
    isActive: request.filters.find((f) => f.field === "isActive")?.value as
      | boolean
      | undefined,
    orderBy: request.sort
      ? `${request.sort.direction === "desc" ? "-" : ""}${request.sort.field}`
      : undefined,
  };
}

export function useSchedulesData(isGlobal = false) {
  const { data: orgData } = useActiveOrganization();
  const orgId = isGlobal ? "global" : (orgData?.id ?? "");

  const getSchedulesUrl = isGlobal
    ? "/v1/admin/system/schedules"
    : `/v1/orgs/${orgId}/schedules`;

  const fetchSchedules = useCallback(
    async (
      request: ServerSideRequest
    ): Promise<ServerSideResponse<ScheduledJob>> => {
      if (!(isGlobal || orgId)) {
        return { data: [], total: 0 };
      }

      try {
        const queryParams = buildQueryParams(request);

        const response = await apiClient.get({
          url: getSchedulesUrl,
          query: queryParams,
        });

        if (!response.data) {
          return { data: [], total: 0 };
        }

        const data = response.data as {
          data?: ScheduledJob[];
          pagination?: { totalCount: number };
        };

        const schedules = data.data ?? [];
        const pagination = data.pagination;

        return {
          data: schedules,
          total: pagination?.totalCount ?? 0,
        };
      } catch (error) {
        console.error("Failed to fetch schedules:", error);
        return { data: [], total: 0 };
      }
    },
    [orgId, isGlobal, getSchedulesUrl]
  );

  return { fetchSchedules, orgId, isGlobal };
}

export function useScheduleMutations(isGlobal = false) {
  const queryClient = useQueryClient();
  const { orgId } = useSchedulesData(isGlobal);

  const invalidateSchedules = () => {
    queryClient.invalidateQueries({
      queryKey: ["scheduledJobs", orgId],
    });
  };

  const createMutation = useMutation({
    mutationFn: async (data: CreateScheduledJobRequest) => {
      return await scheduledJobsCreate({
        client: apiClient,
        path: { orgId },
        body: data,
      });
    },
    onSuccess: invalidateSchedules,
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateScheduledJobRequest;
    }) => {
      return await scheduledJobsUpdate({
        client: apiClient,
        path: { orgId, scheduleId: id },
        body: data,
      });
    },
    onSuccess: invalidateSchedules,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await scheduledJobsDelete({
        client: apiClient,
        path: { orgId, scheduleId: id },
      });
    },
    onSuccess: invalidateSchedules,
  });

  const pauseMutation = useMutation({
    mutationFn: async (id: string) => {
      return await scheduledJobsPause({
        client: apiClient,
        path: { orgId, scheduleId: id },
      });
    },
    onSuccess: invalidateSchedules,
  });

  const resumeMutation = useMutation({
    mutationFn: async (id: string) => {
      return await scheduledJobsResume({
        client: apiClient,
        path: { orgId, scheduleId: id },
      });
    },
    onSuccess: invalidateSchedules,
  });

  const runMutation = useMutation({
    mutationFn: async (id: string) => {
      return await scheduledJobsRunNow({
        client: apiClient,
        path: { orgId, scheduleId: id },
      });
    },
    onSuccess: invalidateSchedules,
  });

  return {
    createSchedule: createMutation.mutateAsync,
    updateSchedule: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateScheduledJobRequest;
    }) => updateMutation.mutateAsync({ id, data }),
    deleteSchedule: deleteMutation.mutateAsync,
    pauseSchedule: pauseMutation.mutateAsync,
    resumeSchedule: resumeMutation.mutateAsync,
    runSchedule: runMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isPausing: pauseMutation.isPending,
    isResuming: resumeMutation.isPending,
    isRunning: runMutation.isPending,
  };
}
