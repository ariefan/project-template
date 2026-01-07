"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Announcement, AnnouncementPriority } from "@workspace/contracts";
import {
  announcementsDeleteMutation,
  announcementsListOptions,
} from "@workspace/contracts/query";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty";
import {
  type BulkAction,
  type ColumnDef,
  DataView as DataViewComponent,
  type RowAction,
} from "@workspace/ui/composed/data-view";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle, AlertTriangle, Info, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { PageHeader } from "@/components/layouts/page-header";
import { apiClient } from "@/lib/api-client";
import { useActiveOrganization } from "@/lib/auth";

const PRIORITY_CONFIG = {
  info: {
    icon: Info,
    variant: "default" as const,
    color: "text-blue-500",
  },
  warning: {
    icon: AlertTriangle,
    variant: "secondary" as const,
    color: "text-amber-500",
  },
  critical: {
    icon: AlertCircle,
    variant: "destructive" as const,
    color: "text-red-500",
  },
};

export function AdminAnnouncementsList() {
  const router = useRouter();
  const { data: activeOrganization } = useActiveOrganization();
  const queryClient = useQueryClient();

  const invalidateAnnouncements = useCallback(() => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        if (typeof key === "object" && key !== null && "_id" in key) {
          const id = (key as { _id: string })._id;
          return id === "announcementsList";
        }
        return false;
      },
    });
  }, [queryClient]);

  const { data } = useQuery({
    ...announcementsListOptions({
      client: apiClient,
      path: { orgId: activeOrganization?.id ?? "" },
      query: {
        page: 1,
        pageSize: 100,
        orderBy: "-publishAt",
        includeInactive: true,
        includeExpired: true,
      },
    }),
    enabled: !!activeOrganization?.id,
  });

  const deleteMutation = useMutation({
    ...announcementsDeleteMutation({ client: apiClient }),
    onSuccess: invalidateAnnouncements,
  });

  const announcements = (data as { data?: Announcement[] })?.data ?? [];

  // Column definitions
  const columns: ColumnDef<Announcement>[] = [
    {
      id: "priority-icon",
      header: "",
      accessorKey: "priority",
      width: 40,
      cell: ({ value }) => {
        const priority = value as AnnouncementPriority;
        const config = PRIORITY_CONFIG[priority];
        const Icon = config.icon;
        return <Icon className={`size-4 ${config.color}`} />;
      },
    },
    {
      id: "title",
      header: "Title",
      accessorKey: "title",
      sortable: true,
      filterable: true,
      filterType: "text",
      minWidth: 250,
      cell: ({ row, value }) => (
        <div className="space-y-1">
          <p className="font-medium">{String(value)}</p>
          <p className="line-clamp-1 text-muted-foreground text-xs">
            {row.content}
          </p>
        </div>
      ),
    },
    {
      id: "priority",
      header: "Priority",
      accessorKey: "priority",
      sortable: true,
      filterable: true,
      filterType: "select",
      filterOptions: [
        { value: "info", label: "Info" },
        { value: "warning", label: "Warning" },
        { value: "critical", label: "Critical" },
      ],
      width: 120,
      cell: ({ value }) => {
        const priority = value as AnnouncementPriority;
        const config = PRIORITY_CONFIG[priority];
        return (
          <Badge className="capitalize" variant={config.variant}>
            {String(value)}
          </Badge>
        );
      },
    },
    {
      id: "scope",
      header: "Scope",
      accessorKey: "scope",
      sortable: true,
      filterable: true,
      filterType: "select",
      filterOptions: [
        { value: "system", label: "System" },
        { value: "organization", label: "Organization" },
      ],
      width: 130,
      cell: ({ value }) => (
        <Badge className="capitalize" variant="outline">
          {String(value)}
        </Badge>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessorKey: "isActive",
      sortable: true,
      filterable: true,
      filterType: "select",
      filterOptions: [
        { value: "true", label: "Active" },
        { value: "false", label: "Inactive" },
      ],
      width: 100,
      cell: ({ value, row }) => {
        const isActive = value as boolean;
        const isExpired = row.expiresAt && new Date(row.expiresAt) < new Date();
        const isPublished = new Date(row.publishAt) <= new Date();

        if (!isActive) {
          return <Badge variant="secondary">Inactive</Badge>;
        }
        if (isExpired) {
          return <Badge variant="secondary">Expired</Badge>;
        }
        if (!isPublished) {
          return <Badge variant="outline">Scheduled</Badge>;
        }
        return <Badge variant="default">Active</Badge>;
      },
    },
    {
      id: "stats",
      header: "Engagement",
      accessorKey: "viewCount",
      sortable: true,
      width: 150,
      cell: ({ row }) => (
        <div className="space-y-0.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Views:</span>
            <span className="font-medium">{row.viewCount ?? 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Reads:</span>
            <span className="font-medium">{row.readCount ?? 0}</span>
          </div>
        </div>
      ),
    },
    {
      id: "publishAt",
      header: "Published",
      accessorKey: "publishAt",
      sortable: true,
      width: 150,
      cell: ({ value }) =>
        formatDistanceToNow(new Date(String(value)), { addSuffix: true }),
    },
  ];

  // Row actions
  const rowActions: RowAction<Announcement>[] = [
    {
      id: "edit",
      label: "Edit",
      onAction: (row) => {
        router.push(`/admin/announcements/${row.id}/edit`);
      },
    },
    {
      id: "stats",
      label: "View stats",
      onAction: (row) => {
        router.push(`/admin/announcements/${row.id}/stats`);
      },
    },
    {
      id: "delete",
      label: "Delete",
      onAction: async (row) => {
        await deleteMutation.mutateAsync({
          path: {
            orgId: activeOrganization?.id ?? "",
            announcementId: row.id,
          },
        });
      },
      variant: "destructive",
    },
  ];

  // Bulk actions
  const bulkActions: BulkAction<Announcement>[] = [
    {
      id: "delete",
      label: "Delete Selected",
      icon: Trash2,
      confirmMessage:
        "Are you sure you want to delete the selected announcements?",
      onAction: async (rows) => {
        await Promise.all(
          rows.map((row) =>
            deleteMutation.mutateAsync({
              path: {
                orgId: activeOrganization?.id ?? "",
                announcementId: row.id,
              },
            })
          )
        );
      },
      variant: "destructive",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button onClick={() => router.push("/admin/announcements/new")}>
            <Plus className="mr-2 size-4" />
            New announcement
          </Button>
        }
        description="Manage system and organization announcements"
        title="Announcements"
      />

      <DataViewComponent
        bulkActions={bulkActions}
        columns={columns}
        data={announcements}
        defaultView="table"
        emptyState={
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Plus />
              </EmptyMedia>
              <EmptyTitle>No announcements</EmptyTitle>
              <EmptyDescription>
                Get started by creating your first announcement.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => router.push("/admin/announcements/new")}>
                <Plus className="mr-2 size-4" />
                Create announcement
              </Button>
            </EmptyContent>
          </Empty>
        }
        getRowId={(row) => row.id}
        rowActions={rowActions}
        searchPlaceholder="Search announcements..."
      />
    </div>
  );
}
