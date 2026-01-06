"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreateReportTemplateRequest,
  ReportTemplate,
  UpdateReportTemplateRequest,
} from "@workspace/contracts";
import {
  reportTemplatesClone,
  reportTemplatesCreate,
  reportTemplatesDelete,
  reportTemplatesList,
  reportTemplatesUpdate,
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
    format: request.filters.find((f) => f.field === "format")?.value as
      | "csv"
      | "excel"
      | "pdf"
      | "thermal"
      | "dotmatrix"
      | undefined,
    isPublic: request.filters.find((f) => f.field === "isPublic")?.value as
      | boolean
      | undefined,
    orderBy: request.sort
      ? `${request.sort.direction === "desc" ? "-" : ""}${request.sort.field}`
      : undefined,
  };
}

export function useTemplatesData() {
  const { data: orgData } = useActiveOrganization();
  const orgId = orgData?.id ?? "";

  const fetchTemplates = useCallback(
    async (
      request: ServerSideRequest
    ): Promise<ServerSideResponse<ReportTemplate>> => {
      if (!orgId) {
        return { data: [], total: 0 };
      }

      try {
        const queryParams = buildQueryParams(request);

        const response = await reportTemplatesList({
          client: apiClient,
          path: { orgId },
          query: queryParams,
        });

        if (response.error) {
          console.error("Failed to fetch templates:", response.error);
          return { data: [], total: 0 };
        }

        const { data } = response;
        if (!data) {
          console.error("No data in response:", response);
          return { data: [], total: 0 };
        }

        const templates = (data as { data?: ReportTemplate[] })?.data ?? [];
        const pagination = (data as { pagination?: { totalCount: number } })
          ?.pagination;

        return {
          data: templates,
          total: pagination?.totalCount ?? 0,
        };
      } catch (error) {
        console.error("Failed to fetch templates:", error);
        return { data: [], total: 0 };
      }
    },
    [orgId]
  );

  return { fetchTemplates, orgId };
}

export function useTemplateMutations() {
  const queryClient = useQueryClient();
  const { orgId } = useTemplatesData();

  const createMutation = useMutation({
    mutationFn: async (data: CreateReportTemplateRequest) => {
      return await reportTemplatesCreate({
        client: apiClient,
        path: { orgId },
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0] as { _id?: string } | undefined;
          return key?._id === "reportTemplatesList";
        },
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateReportTemplateRequest;
    }) => {
      return await reportTemplatesUpdate({
        client: apiClient,
        path: { orgId, templateId: id },
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0] as { _id?: string } | undefined;
          return key?._id === "reportTemplatesList";
        },
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await reportTemplatesDelete({
        client: apiClient,
        path: { orgId, templateId: id },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0] as { _id?: string } | undefined;
          return key?._id === "reportTemplatesList";
        },
      });
    },
  });

  const cloneMutation = useMutation({
    mutationFn: async ({
      id,
      name,
      description,
    }: {
      id: string;
      name: string;
      description?: string;
    }) => {
      return await reportTemplatesClone({
        client: apiClient,
        path: { orgId, templateId: id },
        body: { name, description },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0] as { _id?: string } | undefined;
          return key?._id === "reportTemplatesList";
        },
      });
    },
  });

  return {
    createTemplate: createMutation.mutateAsync,
    updateTemplate: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateReportTemplateRequest;
    }) => updateMutation.mutateAsync({ id, data }),
    deleteTemplate: deleteMutation.mutateAsync,
    cloneTemplate: ({
      id,
      name,
      description,
    }: {
      id: string;
      name: string;
      description?: string;
    }) => cloneMutation.mutateAsync({ id, name, description }),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isCloning: cloneMutation.isPending,
  };
}

export function useRunTemplate() {
  const queryClient = useQueryClient();
  const { orgId } = useTemplatesData();

  const runMutation = useMutation({
    mutationFn: async ({
      templateId,
      format,
    }: {
      templateId: string;
      format: "csv" | "excel" | "pdf" | "thermal" | "dotmatrix";
    }) => {
      // Dynamic import to avoid issues with the linter removing unused imports
      const { reportExportsExport } = await import("@workspace/contracts");
      return await reportExportsExport({
        client: apiClient,
        path: { orgId },
        body: {
          templateId,
          format,
          async: true,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0] as { _id?: string } | undefined;
          return key?._id === "reportJobsList";
        },
      });
    },
  });

  return {
    runTemplate: runMutation.mutateAsync,
    isRunning: runMutation.isPending,
  };
}
