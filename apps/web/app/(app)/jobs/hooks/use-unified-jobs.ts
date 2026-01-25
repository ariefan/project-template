"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Job, JobStatus } from "@workspace/contracts";
import { jobsCancel, jobsList, jobsRetry } from "@workspace/contracts";
import type {
  ServerSideRequest,
  ServerSideResponse,
} from "@workspace/ui/composed/data-view";
import { useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { useActiveOrganization } from "@/lib/auth";

export type JobCategory = "all" | "report";

export interface UnifiedJob {
  id: string;
  type: string;
  status: JobStatus;
  progress?: number;
  message?: string;
  format?: string;
  templateId?: string;
  output?: Record<string, unknown>;
  error?: { code?: string; message: string };
  createdBy: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

function transformJob(job: Job): UnifiedJob {
  return {
    id: job.jobId,
    type: job.type,
    status: job.status,
    progress: job.progress,
    message: job.message ?? job.error?.message,
    format: job.metadata?.format,
    templateId: job.metadata?.templateId,
    output: job.output,
    error: job.error
      ? { code: job.error.code, message: job.error.message }
      : undefined,
    createdBy: job.createdBy,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  };
}

function buildJobsQuery(request: ServerSideRequest, typeFilter?: string) {
  return {
    page: request.page,
    pageSize: request.pageSize,
    status: request.filters.find((f) => f.field === "status")?.value as
      | JobStatus
      | undefined,
    type:
      typeFilter ||
      (request.filters.find((f) => f.field === "type")?.value as
        | string
        | undefined),
    format: request.filters.find((f) => f.field === "format")?.value as
      | string
      | undefined,
    templateId: request.filters.find((f) => f.field === "templateId")?.value as
      | string
      | undefined,
  };
}

async function fetchJobs(
  orgId: string,
  request: ServerSideRequest,
  typeFilter?: string
): Promise<{ data: UnifiedJob[]; totalCount: number }> {
  const response = await jobsList({
    client: apiClient,
    path: { orgId },
    query: buildJobsQuery(request, typeFilter),
  });
  if (response.error) {
    return { data: [], totalCount: 0 };
  }
  const responseData = response.data as {
    data?: Job[];
    pagination?: { totalCount: number };
  };
  const data = responseData.data ?? [];
  const totalCount = responseData.pagination?.totalCount ?? data.length;
  return {
    data: data.map(transformJob),
    totalCount,
  };
}

export function useUnifiedJobs(categoryFilter: JobCategory = "all") {
  const { data: orgData } = useActiveOrganization();
  const orgId = orgData?.id ?? "";

  // Map category filter to type filter
  const typeFilter = categoryFilter === "report" ? "report" : undefined;

  const fetchJobsCallback = useCallback(
    async (
      request: ServerSideRequest
    ): Promise<ServerSideResponse<UnifiedJob>> => {
      if (!orgId) {
        return { data: [], total: 0 };
      }

      try {
        const result = await fetchJobs(orgId, request, typeFilter);
        return {
          data: result.data,
          total: result.totalCount,
        };
      } catch (error) {
        console.error("Failed to fetch jobs:", error);
        return { data: [], total: 0 };
      }
    },
    [orgId, typeFilter]
  );

  return { fetchJobs: fetchJobsCallback, orgId };
}

export function useJobMutations() {
  const queryClient = useQueryClient();
  const { data: orgData } = useActiveOrganization();
  const orgId = orgData?.id ?? "";

  const invalidateJobs = () => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0] as { _id?: string } | undefined;
        return key?._id === "jobsList";
      },
    });
  };

  const cancelJobMutation = useMutation({
    mutationFn: async (id: string) => {
      return await jobsCancel({
        client: apiClient,
        path: { orgId, jobId: id },
      });
    },
    onSuccess: invalidateJobs,
  });

  const retryJobMutation = useMutation({
    mutationFn: async (id: string) => {
      return await jobsRetry({
        client: apiClient,
        path: { orgId, jobId: id },
      });
    },
    onSuccess: invalidateJobs,
  });

  return {
    cancelJob: (job: UnifiedJob) => cancelJobMutation.mutateAsync(job.id),
    retryJob: (id: string) => retryJobMutation.mutateAsync(id),
    isCancelling: cancelJobMutation.isPending,
    isRetrying: retryJobMutation.isPending,
  };
}

export function useDownloadReport() {
  const { data: orgData } = useActiveOrganization();
  const orgId = orgData?.id ?? "";

  const downloadReport = useCallback(
    (jobId: string) => {
      // Direct download via URL - this triggers a file download
      window.open(`/api/${orgId}/jobs/${jobId}/download`, "_blank");
    },
    [orgId]
  );

  return { downloadReport };
}

const MODE_THRESHOLD = 500;

/**
 * Hook for unified jobs with automatic client/server mode detection
 * - First fetches count to determine total
 * - If total <= threshold: fetches all data for client-side filtering
 * - If total > threshold: uses server-side pagination via onFetchData
 */
export function useUnifiedJobsData(
  categoryFilter: JobCategory = "all",
  isGlobal = false
) {
  const { data: orgData, isPending: orgLoading } = useActiveOrganization();
  const orgId = isGlobal ? "global" : (orgData?.id ?? "");

  // Map category filter to type filter
  const typeFilter = categoryFilter === "report" ? "report" : undefined;

  // Endpoint mapping
  const getJobsUrl = isGlobal
    ? "/v1/admin/system/jobs"
    : `/v1/orgs/${orgId}/jobs`;

  // Step 1: Fetch count to determine mode
  const countQuery = useQuery({
    queryKey: ["jobsList", orgId, "count", typeFilter],
    queryFn: async () => {
      const response = await apiClient.get({
        url: getJobsUrl,
        query: { page: 1, pageSize: 1, type: typeFilter },
      });
      if (!response.data) {
        return 0;
      }
      const data = response.data as { pagination?: { totalCount: number } };
      return data.pagination?.totalCount ?? 0;
    },
    enabled: isGlobal || Boolean(orgId),
  });

  const totalCount = countQuery.data ?? 0;
  const useServerMode = totalCount > MODE_THRESHOLD;

  // Step 2: Fetch all data only if using client mode
  const dataQuery = useQuery({
    queryKey: ["jobsList", orgId, "all", typeFilter],
    queryFn: async () => {
      const response = await apiClient.get({
        url: getJobsUrl,
        query: {
          page: 1,
          pageSize: Math.max(totalCount, 100),
          type: typeFilter,
        },
      });
      if (!response.data) {
        throw new Error("Failed to fetch jobs");
      }
      return (response.data as { data?: Job[] })?.data ?? [];
    },
    enabled: (isGlobal || Boolean(orgId)) && !useServerMode,
  });

  // Transform jobs for client mode
  const jobs = useServerMode ? [] : (dataQuery.data ?? []).map(transformJob);

  // Step 3: Server-side fetch function for DataView
  const fetchJobsCallback = useCallback(
    async (
      request: ServerSideRequest
    ): Promise<ServerSideResponse<UnifiedJob>> => {
      if (!(isGlobal || orgId)) {
        return { data: [], total: 0 };
      }

      try {
        const response = await apiClient.get({
          url: getJobsUrl,
          query: buildJobsQuery(request, typeFilter),
        });
        const responseData = response.data as {
          data?: Job[];
          pagination?: { totalCount: number };
        };
        const data = responseData.data ?? [];
        return {
          data: data.map(transformJob),
          total: responseData.pagination?.totalCount ?? data.length,
        };
      } catch (error) {
        console.error("Failed to fetch jobs:", error);
        return { data: [], total: 0 };
      }
    },
    [getJobsUrl, orgId, typeFilter, isGlobal]
  );

  const isLoading =
    (!isGlobal && orgLoading) ||
    countQuery.isLoading ||
    (!useServerMode && dataQuery.isLoading);

  return {
    jobs,
    totalCount,
    fetchJobs: fetchJobsCallback,
    isLoading,
    orgId,
    useServerMode,
  };
}
