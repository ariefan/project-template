"use client";

import type { Job, JobListResponse } from "@workspace/contracts";
import { jobsList } from "@workspace/contracts";
import type {
  ServerSideRequest,
  ServerSideResponse,
} from "@workspace/ui/composed/data-view";
import { useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { useActiveOrganization } from "@/lib/auth";

export function useReportHistory() {
  const { data: orgData } = useActiveOrganization();
  const orgId = orgData?.id ?? "";

  const fetchHistory = useCallback(
    async (request: ServerSideRequest): Promise<ServerSideResponse<Job>> => {
      if (!orgId) {
        return { data: [], total: 0 };
      }

      try {
        // Use the official SDK jobsList function
        const response = await jobsList({
          client: apiClient,
          path: { orgId },
          query: {
            page: request.page,
            pageSize: request.pageSize,
            type: "report",
            status:
              // biome-ignore lint/suspicious/noExplicitAny: type conversion
              request.filters.find((f) => f.field === "status")?.value as any,
          },
        });

        if (response.error || !response.data) {
          console.error("Failed to fetch report history:", response.error);
          return { data: [], total: 0 };
        }

        const result = response.data as JobListResponse;
        const data = result?.data ?? [];
        const pagination = result?.pagination;

        return {
          data: data as Job[],
          total: pagination?.totalCount ?? 0,
        };
      } catch (error) {
        console.error("Failed to fetch report history:", error);
        return { data: [], total: 0 };
      }
    },
    [orgId]
  );

  return { fetchHistory, orgId };
}
