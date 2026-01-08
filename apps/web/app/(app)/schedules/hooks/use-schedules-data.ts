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
  scheduledJobsList,
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

export function useSchedulesData() {
  const { data: orgData } = useActiveOrganization();
  const orgId = orgData?.id ?? "";

  const fetchSchedules = useCallback(
    async (
      request: ServerSideRequest
    ): Promise<ServerSideResponse<ScheduledJob>> => {
      if (!orgId) {
        return { data: [], total: 0 };
      }

      try {
        const queryParams = buildQueryParams(request);

        const response = await scheduledJobsList({
          client: apiClient,
          path: { orgId },
          query: queryParams,
        });

        if (response.error) {
          console.error("Failed to fetch schedules:", response.error);
          return { data: [], total: 0 };
        }

        const { data } = response;
        if (!data) {
          console.error("No data in response:", response);
          return { data: [], total: 0 };
        }

        const schedules = (data as { data?: ScheduledJob[] })?.data ?? [];
        const pagination = (data as { pagination?: { totalCount: number } })
          ?.pagination;

        return {
          data: schedules,
          total: pagination?.totalCount ?? 0,
        };
      } catch (error) {
        console.error("Failed to fetch schedules:", error);
        return { data: [], total: 0 };
      }
    },
    [orgId]
  );

  return { fetchSchedules, orgId };
}

export function useScheduleMutations() {
  const queryClient = useQueryClient();
  const { orgId } = useSchedulesData();

  const invalidateSchedules = () => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0] as { _id?: string } | undefined;
        return key?._id === "scheduledJobsList";
      },
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
