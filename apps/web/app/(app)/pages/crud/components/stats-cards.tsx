"use client";

import { useQuery } from "@tanstack/react-query";
import { examplePostsListOptions } from "@workspace/contracts/query";
import { Archive, FileCheck, FilePlus, FileText } from "lucide-react";
import type { Stat } from "@/components/layouts/stats-grid";
import { StatsGrid } from "@/components/layouts/stats-grid";
import { apiClient } from "@/lib/api-client";
import { useActiveOrganization } from "@/lib/auth";

export function StatsCards() {
  const { data: orgData } = useActiveOrganization();
  const orgId = orgData?.id ?? "";

  // Query for total count
  const { data: totalData } = useQuery({
    ...examplePostsListOptions({
      client: apiClient,
      path: { orgId },
      query: { page: 1, pageSize: 1 },
    }),
    enabled: Boolean(orgId),
  });

  // Query for draft count
  const { data: draftData } = useQuery({
    ...examplePostsListOptions({
      client: apiClient,
      path: { orgId },
      query: { page: 1, pageSize: 1, status: "draft" },
    }),
    enabled: Boolean(orgId),
  });

  // Query for published count
  const { data: publishedData } = useQuery({
    ...examplePostsListOptions({
      client: apiClient,
      path: { orgId },
      query: { page: 1, pageSize: 1, status: "published" },
    }),
    enabled: Boolean(orgId),
  });

  // Query for archived count
  const { data: archivedData } = useQuery({
    ...examplePostsListOptions({
      client: apiClient,
      path: { orgId },
      query: { page: 1, pageSize: 1, status: "archived" },
    }),
    enabled: Boolean(orgId),
  });

  const totalPosts =
    totalData && "pagination" in totalData
      ? totalData.pagination.totalCount
      : 0;
  const draftCount =
    draftData && "pagination" in draftData
      ? draftData.pagination.totalCount
      : 0;
  const publishedCount =
    publishedData && "pagination" in publishedData
      ? publishedData.pagination.totalCount
      : 0;
  const archivedCount =
    archivedData && "pagination" in archivedData
      ? archivedData.pagination.totalCount
      : 0;

  const stats: Stat[] = [
    {
      label: "Total Posts",
      value: totalPosts.toLocaleString(),
      icon: FileText,
    },
    {
      label: "Drafts",
      value: draftCount.toLocaleString(),
      icon: FilePlus,
    },
    {
      label: "Published",
      value: publishedCount.toLocaleString(),
      icon: FileCheck,
    },
    {
      label: "Archived",
      value: archivedCount.toLocaleString(),
      icon: Archive,
    },
  ];

  return <StatsGrid stats={stats} />;
}
