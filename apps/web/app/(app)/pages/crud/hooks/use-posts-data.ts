"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreateExamplePostRequest,
  ExamplePost,
  UpdateExamplePostRequest,
} from "@workspace/contracts";
import {
  examplePostsCreate,
  examplePostsDelete,
  examplePostsList,
  examplePostsRestore,
  examplePostsUpdate,
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
    status: request.filters.find((f) => f.field === "status")?.value as
      | "draft"
      | "published"
      | "archived"
      | undefined,
    authorId: request.filters.find((f) => f.field === "authorId")?.value as
      | string
      | undefined,
    orderBy: request.sort
      ? `${request.sort.direction === "desc" ? "-" : ""}${request.sort.field}`
      : undefined,
  };
}

export function usePostsData() {
  const { data: orgData } = useActiveOrganization();
  const orgId = orgData?.id ?? "";

  const fetchPosts = useCallback(
    async (
      request: ServerSideRequest
    ): Promise<ServerSideResponse<ExamplePost>> => {
      // Return empty data if orgId is not available yet
      if (!orgId) {
        return { data: [], total: 0 };
      }

      try {
        const queryParams = buildQueryParams(request);

        const response = await examplePostsList({
          client: apiClient,
          path: { orgId },
          query: queryParams,
        });

        // Handle both success and error responses
        if (response.error) {
          console.error("Failed to fetch posts:", response.error);
          return { data: [], total: 0 };
        }

        const { data } = response;
        if (!data) {
          console.error("No data in response:", response);
          return { data: [], total: 0 };
        }

        // Type guard: data is ExamplePostListResponse when successful
        const posts = (data as { data?: ExamplePost[] })?.data ?? [];
        const pagination = (data as { pagination?: { totalCount: number } })
          ?.pagination;

        return {
          data: posts,
          total: pagination?.totalCount ?? 0,
        };
      } catch (error) {
        console.error("Failed to fetch posts:", error);
        return { data: [], total: 0 };
      }
    },
    [orgId]
  );

  return { fetchPosts, orgId };
}

export function usePostMutations() {
  const queryClient = useQueryClient();
  const { orgId } = usePostsData();

  const createMutation = useMutation({
    mutationFn: async (data: CreateExamplePostRequest) => {
      return await examplePostsCreate({
        client: apiClient,
        path: { orgId },
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0] as { _id?: string } | undefined;
          return key?._id === "examplePostsList";
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
      data: UpdateExamplePostRequest;
    }) => {
      return await examplePostsUpdate({
        client: apiClient,
        path: { orgId, id },
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0] as { _id?: string } | undefined;
          return key?._id === "examplePostsList";
        },
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await examplePostsDelete({
        client: apiClient,
        path: { orgId, id },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0] as { _id?: string } | undefined;
          return key?._id === "examplePostsList";
        },
      });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      return await examplePostsRestore({
        client: apiClient,
        path: { orgId, id },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0] as { _id?: string } | undefined;
          return key?._id === "examplePostsList";
        },
      });
    },
  });

  return {
    createPost: createMutation.mutateAsync,
    updatePost: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateExamplePostRequest;
    }) => updateMutation.mutateAsync({ id, data }),
    deletePost: deleteMutation.mutateAsync,
    restorePost: restoreMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isRestoring: restoreMutation.isPending,
  };
}
