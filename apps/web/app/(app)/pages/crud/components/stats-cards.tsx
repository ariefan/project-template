"use client";

import { useQuery } from "@tanstack/react-query";
import { examplePostsListOptions } from "@workspace/contracts/query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Archive, FileCheck, FilePlus, FileText } from "lucide-react";
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

  const stats = [
    {
      title: "Total Posts",
      value: totalPosts,
      icon: FileText,
      description: "All posts",
    },
    {
      title: "Drafts",
      value: draftCount,
      icon: FilePlus,
      description: "Unpublished",
    },
    {
      title: "Published",
      value: publishedCount,
      icon: FileCheck,
      description: "Live posts",
    },
    {
      title: "Archived",
      value: archivedCount,
      icon: Archive,
      description: "Archived posts",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">
                {stat.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">{stat.value}</div>
              <p className="text-muted-foreground text-xs">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
