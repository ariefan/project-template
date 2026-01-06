"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Job, JobStatus, ReportJob } from "@workspace/contracts";
import {
  jobsCancel,
  jobsList,
  reportJobsCancel,
  reportJobsList,
  reportJobsRetry,
} from "@workspace/contracts";
import type {
  ServerSideRequest,
  ServerSideResponse,
} from "@workspace/ui/composed/data-view";
import { useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { useActiveOrganization } from "@/lib/auth";

export type JobCategory = "all" | "background" | "report";

export interface UnifiedJob {
  id: string;
  jobCategory: "background" | "report";
  type: string;
  status: JobStatus;
  progress?: number;
  message?: string;
  format?: string;
  templateId?: string;
  result?: unknown;
  error?: { code?: string; message: string };
  createdBy: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

function transformBackgroundJob(job: Job): UnifiedJob {
  return {
    id: job.jobId,
    jobCategory: "background",
    type: job.type,
    status: job.status,
    progress: job.progress,
    message: job.message ?? job.error?.message,
    result: job.result,
    error: job.error
      ? { code: job.error.code, message: job.error.message }
      : undefined,
    createdBy: job.createdBy,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  };
}

function transformReportJob(job: ReportJob): UnifiedJob {
  return {
    id: job.id,
    jobCategory: "report",
    type: job.type,
    status: job.status,
    progress: job.progress,
    message: job.error?.message,
    format: job.format,
    templateId: job.templateId,
    result: job.result,
    error: job.error
      ? { code: job.error.code, message: job.error.message }
      : undefined,
    createdBy: job.createdBy,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  };
}

// Helper to check if category filter includes a specific type
function includesCategory(
  filter: JobCategory,
  category: "background" | "report"
): boolean {
  return filter === "all" || filter === category;
}

// Response type for paginated data
interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
}

// Helper to sort jobs by createdAt descending
function sortJobsByDate(jobs: UnifiedJob[]): UnifiedJob[] {
  return [...jobs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function buildBackgroundJobsQuery(request: ServerSideRequest) {
  return {
    page: request.page,
    pageSize: request.pageSize,
    status: request.filters.find((f) => f.field === "status")?.value as
      | JobStatus
      | undefined,
  };
}

function buildReportJobsQuery(request: ServerSideRequest) {
  return {
    page: request.page,
    pageSize: request.pageSize,
    search: request.search || undefined,
    status: request.filters.find((f) => f.field === "status")?.value as
      | JobStatus
      | undefined,
    type: request.filters.find((f) => f.field === "type")?.value as
      | "manual"
      | "scheduled"
      | undefined,
    format: request.filters.find((f) => f.field === "format")?.value as
      | "csv"
      | "excel"
      | "pdf"
      | "thermal"
      | "dotmatrix"
      | undefined,
    orderBy: request.sort
      ? `${request.sort.direction === "desc" ? "-" : ""}${request.sort.field}`
      : undefined,
  };
}

async function fetchBackgroundJobs(
  orgId: string,
  request: ServerSideRequest
): Promise<PaginatedResponse<UnifiedJob>> {
  const response = await jobsList({
    client: apiClient,
    path: { orgId },
    query: buildBackgroundJobsQuery(request),
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
    data: data.map(transformBackgroundJob),
    totalCount,
  };
}

async function fetchReportJobs(
  orgId: string,
  request: ServerSideRequest
): Promise<PaginatedResponse<UnifiedJob>> {
  const response = await reportJobsList({
    client: apiClient,
    path: { orgId },
    query: buildReportJobsQuery(request),
  });
  if (response.error) {
    return { data: [], totalCount: 0 };
  }
  const responseData = response.data as {
    data?: ReportJob[];
    pagination?: { totalCount: number };
  };
  const data = responseData.data ?? [];
  const totalCount = responseData.pagination?.totalCount ?? data.length;
  return {
    data: data.map(transformReportJob),
    totalCount,
  };
}

export function useUnifiedJobs(categoryFilter: JobCategory = "all") {
  const { data: orgData } = useActiveOrganization();
  const orgId = orgData?.id ?? "";

  const fetchJobs = useCallback(
    async (
      request: ServerSideRequest
    ): Promise<ServerSideResponse<UnifiedJob>> => {
      if (!orgId) {
        return { data: [], total: 0 };
      }

      try {
        const results: UnifiedJob[] = [];
        let totalCount = 0;

        if (includesCategory(categoryFilter, "background")) {
          const bg = await fetchBackgroundJobs(orgId, request);
          results.push(...bg.data);
          totalCount += bg.totalCount;
        }

        if (includesCategory(categoryFilter, "report")) {
          const report = await fetchReportJobs(orgId, request);
          results.push(...report.data);
          totalCount += report.totalCount;
        }

        const sorted = sortJobsByDate(results);

        // For "all" mode, we need to slice for pagination since we're merging two sources
        // In specific category mode, the API handles pagination
        const paginatedResults =
          categoryFilter === "all" ? sorted.slice(0, request.pageSize) : sorted;

        return {
          data: paginatedResults,
          total: totalCount,
        };
      } catch (error) {
        console.error("Failed to fetch jobs:", error);
        return { data: [], total: 0 };
      }
    },
    [orgId, categoryFilter]
  );

  return { fetchJobs, orgId };
}

export function useJobMutations() {
  const queryClient = useQueryClient();
  const { data: orgData } = useActiveOrganization();
  const orgId = orgData?.id ?? "";

  const invalidateJobs = () => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0] as { _id?: string } | undefined;
        return key?._id === "jobsList" || key?._id === "reportJobsList";
      },
    });
  };

  const cancelBackgroundJobMutation = useMutation({
    mutationFn: async (id: string) => {
      return await jobsCancel({
        client: apiClient,
        path: { orgId, jobId: id },
      });
    },
    onSuccess: invalidateJobs,
  });

  const cancelReportJobMutation = useMutation({
    mutationFn: async (id: string) => {
      return await reportJobsCancel({
        client: apiClient,
        path: { orgId, jobId: id },
      });
    },
    onSuccess: invalidateJobs,
  });

  const retryReportJobMutation = useMutation({
    mutationFn: async (id: string) => {
      return await reportJobsRetry({
        client: apiClient,
        path: { orgId, jobId: id },
      });
    },
    onSuccess: invalidateJobs,
  });

  return {
    cancelJob: (job: UnifiedJob) => {
      if (job.jobCategory === "background") {
        return cancelBackgroundJobMutation.mutateAsync(job.id);
      }
      return cancelReportJobMutation.mutateAsync(job.id);
    },
    retryJob: retryReportJobMutation.mutateAsync,
    isCancelling:
      cancelBackgroundJobMutation.isPending ||
      cancelReportJobMutation.isPending,
    isRetrying: retryReportJobMutation.isPending,
  };
}

export function useDownloadReport() {
  const { data: orgData } = useActiveOrganization();
  const orgId = orgData?.id ?? "";

  const downloadReport = useCallback(
    (jobId: string) => {
      // Direct download via URL - this triggers a file download
      window.open(`/api/${orgId}/reports/jobs/${jobId}/download`, "_blank");
    },
    [orgId]
  );

  return { downloadReport };
}

const MODE_THRESHOLD = 500;

// Helper to fetch all background jobs for client mode
async function fetchAllBackgroundJobs(
  orgId: string,
  pageSize: number
): Promise<Job[]> {
  const response = await jobsList({
    client: apiClient,
    path: { orgId },
    query: { page: 1, pageSize },
  });
  if (response.error) {
    throw new Error("Failed to fetch background jobs");
  }
  return (response.data as { data?: Job[] })?.data ?? [];
}

// Helper to fetch all report jobs for client mode
async function fetchAllReportJobs(
  orgId: string,
  pageSize: number
): Promise<ReportJob[]> {
  const response = await reportJobsList({
    client: apiClient,
    path: { orgId },
    query: { page: 1, pageSize },
  });
  if (response.error) {
    throw new Error("Failed to fetch report jobs");
  }
  return (response.data as { data?: ReportJob[] })?.data ?? [];
}

// Helper to combine and sort jobs for client mode
function combineClientModeJobs(
  categoryFilter: JobCategory,
  bgJobs: Job[],
  reportJobs: ReportJob[]
): UnifiedJob[] {
  const jobs: UnifiedJob[] = [];
  if (includesCategory(categoryFilter, "background")) {
    jobs.push(...bgJobs.map(transformBackgroundJob));
  }
  if (includesCategory(categoryFilter, "report")) {
    jobs.push(...reportJobs.map(transformReportJob));
  }
  return sortJobsByDate(jobs);
}

// Helper to fetch jobs for server mode
async function fetchServerModeJobs(
  orgId: string,
  categoryFilter: JobCategory,
  request: ServerSideRequest
): Promise<ServerSideResponse<UnifiedJob>> {
  const results: UnifiedJob[] = [];
  let total = 0;

  if (includesCategory(categoryFilter, "background")) {
    const bg = await fetchBackgroundJobs(orgId, request);
    results.push(...bg.data);
    total += bg.totalCount;
  }

  if (includesCategory(categoryFilter, "report")) {
    const report = await fetchReportJobs(orgId, request);
    results.push(...report.data);
    total += report.totalCount;
  }

  const sorted = sortJobsByDate(results);
  const data =
    categoryFilter === "all" ? sorted.slice(0, request.pageSize) : sorted;

  return { data, total };
}

/**
 * Hook for unified jobs with automatic client/server mode detection
 * - First fetches counts to determine total
 * - If total <= threshold: fetches all data for client-side filtering
 * - If total > threshold: uses server-side pagination via onFetchData
 */
export function useUnifiedJobsData(categoryFilter: JobCategory = "all") {
  const { data: orgData, isPending: orgLoading } = useActiveOrganization();
  const orgId = orgData?.id ?? "";

  const includeBg = includesCategory(categoryFilter, "background");
  const includeReport = includesCategory(categoryFilter, "report");

  // Step 1: Fetch counts to determine mode
  const bgCountQuery = useQuery({
    queryKey: ["jobsList", orgId, "count"],
    queryFn: async () => {
      const response = await jobsList({
        client: apiClient,
        path: { orgId },
        query: { page: 1, pageSize: 1 },
      });
      if (response.error) {
        return 0;
      }
      const data = response.data as { pagination?: { totalCount: number } };
      return data.pagination?.totalCount ?? 0;
    },
    enabled: Boolean(orgId) && includeBg,
  });

  const reportCountQuery = useQuery({
    queryKey: ["reportJobsList", orgId, "count"],
    queryFn: async () => {
      const response = await reportJobsList({
        client: apiClient,
        path: { orgId },
        query: { page: 1, pageSize: 1 },
      });
      if (response.error) {
        return 0;
      }
      const data = response.data as { pagination?: { totalCount: number } };
      return data.pagination?.totalCount ?? 0;
    },
    enabled: Boolean(orgId) && includeReport,
  });

  // Calculate total count based on filter
  const bgCount = includeBg ? (bgCountQuery.data ?? 0) : 0;
  const reportCount = includeReport ? (reportCountQuery.data ?? 0) : 0;
  const totalCount = bgCount + reportCount;
  const useServerMode = totalCount > MODE_THRESHOLD;

  // Step 2: Fetch all data only if using client mode
  const bgDataQuery = useQuery({
    queryKey: ["jobsList", orgId, "all"],
    queryFn: () => fetchAllBackgroundJobs(orgId, Math.max(totalCount, 100)),
    enabled: Boolean(orgId) && !useServerMode && includeBg,
  });

  const reportDataQuery = useQuery({
    queryKey: ["reportJobsList", orgId, "all"],
    queryFn: () => fetchAllReportJobs(orgId, Math.max(totalCount, 100)),
    enabled: Boolean(orgId) && !useServerMode && includeReport,
  });

  // Combine and transform jobs for client mode
  const jobs = useServerMode
    ? []
    : combineClientModeJobs(
        categoryFilter,
        bgDataQuery.data ?? [],
        reportDataQuery.data ?? []
      );

  // Step 3: Server-side fetch function for DataView
  const fetchJobs = useCallback(
    async (
      request: ServerSideRequest
    ): Promise<ServerSideResponse<UnifiedJob>> => {
      if (!orgId) {
        return { data: [], total: 0 };
      }

      try {
        return await fetchServerModeJobs(orgId, categoryFilter, request);
      } catch (error) {
        console.error("Failed to fetch jobs:", error);
        return { data: [], total: 0 };
      }
    },
    [orgId, categoryFilter]
  );

  const isLoading =
    orgLoading ||
    bgCountQuery.isLoading ||
    reportCountQuery.isLoading ||
    (!useServerMode && (bgDataQuery.isLoading || reportDataQuery.isLoading));

  return {
    jobs,
    totalCount,
    fetchJobs,
    isLoading,
    orgId,
    useServerMode,
  };
}
