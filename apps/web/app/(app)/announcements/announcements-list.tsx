"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AnnouncementWithInteraction } from "@workspace/contracts";
import {
  announcementsAcknowledgeMutation,
  announcementsDismissMutation,
  announcementsListOptions,
  announcementsMarkReadMutation,
} from "@workspace/contracts/query";
import { Badge } from "@workspace/ui/components/badge";
import { Item, ItemContent, ItemTitle } from "@workspace/ui/components/item";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import {
  type ColumnDef,
  DataViewActionMenu,
  DataView as DataViewComponent,
  FilterButton,
  type RowAction,
  SearchInput,
  SortButton,
} from "@workspace/ui/composed/data-view";
import { MarkdownRenderer } from "@workspace/ui/composed/markdown-renderer";
import { cn } from "@workspace/ui/lib/utils";
import { format } from "date-fns";
import {
  AlertCircle,
  AlertTriangle,
  BellOff,
  CheckCircle,
  Info,
  Lightbulb,
  X,
} from "lucide-react";
import { useCallback, useState } from "react";
import { PageHeader } from "@/components/layouts/page-header";
import { apiClient } from "@/lib/api-client";
import { useActiveOrganization } from "@/lib/auth";

// Priority configuration for icons and badge variants
const PRIORITY_CONFIG = {
  info: {
    icon: Info,
    badgeClass:
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30",
  },
  warning: {
    icon: AlertTriangle,
    badgeClass:
      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30",
  },
  critical: {
    icon: AlertCircle,
    badgeClass:
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30",
  },
  success: {
    icon: Lightbulb,
    badgeClass:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30",
  },
};

export function AnnouncementsList() {
  const { data: activeOrganization } = useActiveOrganization();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");

  const invalidateAnnouncements = useCallback(() => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        if (typeof key === "object" && key !== null && "_id" in key) {
          const id = (key as { _id: string })._id;
          return (
            id === "announcementsList" || id === "announcementsGetUnreadCount"
          );
        }
        return false;
      },
    });
  }, [queryClient]);

  const queryParams = {
    page: 1,
    pageSize: 100,
    orderBy: "-priority,-publishAt",
    readStatus: activeTab === "unread" ? ("unread" as const) : undefined,
  };

  const { data, isLoading } = useQuery({
    ...announcementsListOptions({
      client: apiClient,
      path: { orgId: activeOrganization?.id ?? "" },
      query: queryParams,
    }),
    enabled: !!activeOrganization?.id,
  });

  const markReadMutation = useMutation({
    ...announcementsMarkReadMutation({ client: apiClient }),
    onSuccess: invalidateAnnouncements,
  });

  const dismissMutation = useMutation({
    ...announcementsDismissMutation({ client: apiClient }),
    onSuccess: invalidateAnnouncements,
  });

  const acknowledgeMutation = useMutation({
    ...announcementsAcknowledgeMutation({ client: apiClient }),
    onSuccess: invalidateAnnouncements,
  });

  const announcements =
    (data as { data?: AnnouncementWithInteraction[] })?.data ?? [];
  const unreadCount = announcements.filter((a) => !a.hasRead).length;

  // Column definitions (used for types, though list view uses custom renderer)
  const columns: ColumnDef<AnnouncementWithInteraction>[] = [
    {
      id: "title",
      header: "Title",
      accessorKey: "title",
      sortable: true,
      filterable: true,
      filterType: "text",
    },
    {
      id: "priority",
      header: "Priority",
      accessorKey: "priority",
      sortable: true,
      filterable: true,
      filterType: "select",
      filterOptions: [
        { value: "critical", label: "Critical" },
        { value: "warning", label: "Warning" },
        { value: "info", label: "Info" },
        { value: "success", label: "Success" },
      ],
    },
    {
      id: "publishAt",
      header: "Published",
      accessorKey: "publishAt",
      sortable: true,
    },
  ];

  // Row actions
  const rowActions: RowAction<AnnouncementWithInteraction>[] = [
    {
      id: "markRead",
      label: "Mark as read",
      icon: CheckCircle,
      onAction: (row) => {
        markReadMutation.mutate({
          path: {
            orgId: activeOrganization?.id ?? "",
            announcementId: row.id,
          },
        });
      },
      hidden: (row) => !!row.hasRead,
    },
    {
      id: "acknowledge",
      label: "Acknowledge",
      icon: CheckCircle,
      onAction: (row) => {
        acknowledgeMutation.mutate({
          path: {
            orgId: activeOrganization?.id ?? "",
            announcementId: row.id,
          },
        });
      },
      hidden: (row) => row.priority !== "critical" || !!row.hasAcknowledged,
    },
    {
      id: "dismiss",
      label: "Dismiss",
      icon: X,
      variant: "destructive",
      onAction: (row) => {
        dismissMutation.mutate({
          path: {
            orgId: activeOrganization?.id ?? "",
            announcementId: row.id,
          },
        });
      },
      hidden: (row) => !row.isDismissible,
    },
  ];

  // Custom empty state
  const emptyState = (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <BellOff className="mb-4 size-12 text-muted-foreground" />
      <h3 className="mb-2 font-semibold text-lg">No announcements</h3>
      <p className="max-w-md text-muted-foreground text-sm">
        {activeTab === "unread"
          ? "You're all caught up! No unread announcements."
          : "There are no announcements at this time."}
      </p>
    </div>
  );

  const listItemRenderer = ({ row }: { row: AnnouncementWithInteraction }) => {
    const priority = row.priority as keyof typeof PRIORITY_CONFIG;
    const config = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.info;
    const Icon = config.icon;
    const isUnread = !row.hasRead;

    return (
      <Item
        className={cn(
          "transition-colors hover:bg-muted/50",
          isUnread && "bg-blue-50/50 dark:bg-blue-900/10"
        )}
      >
        <ItemContent>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-1.5">
              <ItemTitle className="flex items-center gap-2 font-semibold text-base leading-none">
                {row.title}
                {isUnread && (
                  <Badge
                    className="h-5 bg-blue-600 px-1.5 text-[10px] hover:bg-blue-700"
                    variant="default"
                  >
                    New
                  </Badge>
                )}
              </ItemTitle>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs">
                <Badge
                  className={cn(
                    "h-5 gap-1 border px-1.5 font-medium capitalize",
                    config.badgeClass
                  )}
                  variant="outline"
                >
                  <Icon className="size-3" />
                  {priority}
                </Badge>

                <span className="flex items-center gap-1">
                  {format(new Date(row.publishAt), "MMM d, yyyy")}
                  <span className="ml-0.5 text-[10px] text-muted-foreground/50">
                    • {format(new Date(row.publishAt), "p")}
                  </span>
                </span>
              </div>

              <div className="mt-1 line-clamp-2 text-muted-foreground/90 text-sm">
                <MarkdownRenderer
                  className="[&>p]:m-0 [&>p]:inline [&_a]:text-primary [&_a]:underline"
                  content={row.content}
                />
              </div>
            </div>

            <DataViewActionMenu
              actions={rowActions}
              row={row}
              triggerVariant="ghost-button"
            />
          </div>
        </ItemContent>
      </Item>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        description="Stay updated with system and organization announcements"
        title="Announcements"
      />

      <DataViewComponent<AnnouncementWithInteraction>
        availableViews={["list"]}
        columns={columns}
        data={announcements}
        defaultPageSize={10}
        defaultView="list"
        emptyState={emptyState}
        getRowId={(row) => row.id}
        hoverable
        listItemRenderer={listItemRenderer}
        loading={isLoading}
        loadingMessage="Loading announcements..."
        pageSizeOptions={[10, 25, 50]}
        paginated
        rowActions={rowActions}
        searchable
        selectable={false}
        sortable
        toolbarLeft={
          <>
            <Tabs
              className="w-auto"
              onValueChange={setActiveTab}
              value={activeTab}
            >
              <TabsList>
                <TabsTrigger value="all">
                  All {announcements.length > 0 && `(${announcements.length})`}
                </TabsTrigger>
                <TabsTrigger value="unread">
                  Unread {unreadCount > 0 && `(${unreadCount})`}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <SearchInput />
          </>
        }
        toolbarRight={
          <>
            <FilterButton />
            <SortButton />
          </>
        }
      />
    </div>
  );
}
