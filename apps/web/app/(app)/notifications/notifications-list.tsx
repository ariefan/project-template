"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Notification, NotificationCategory } from "@workspace/contracts";
import {
  notificationsDeleteMutation,
  notificationsListOptions,
  notificationsMarkAllReadMutation,
  notificationsMarkReadMutation,
  notificationsMarkUnreadMutation,
} from "@workspace/contracts/query";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  type BulkAction,
  type ColumnDef,
  DataView as DataViewComponent,
  FilterButton,
  type RowAction,
  SearchInput,
  SortButton,
  type ViewMode,
  ViewToggle,
} from "@workspace/ui/composed/data-view";
import { formatDistanceToNow } from "date-fns";
import { Bell, Check, CheckCheck, Circle, Trash2 } from "lucide-react";
import { useCallback } from "react";
import { PageHeader } from "@/components/layouts/page-header";
import { apiClient } from "@/lib/api-client";

const CATEGORY_COLORS: Record<
  NotificationCategory,
  "default" | "secondary" | "destructive" | "outline"
> = {
  transactional: "default",
  marketing: "secondary",
  security: "destructive",
  system: "outline",
};

export function NotificationsList() {
  const queryClient = useQueryClient();

  const invalidateNotifications = useCallback(() => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        if (typeof key === "object" && key !== null && "_id" in key) {
          const id = (key as { _id: string })._id;
          return (
            id === "notificationsList" || id === "notificationsGetUnreadCount"
          );
        }
        return false;
      },
    });
  }, [queryClient]);

  const { data } = useQuery({
    ...notificationsListOptions({
      client: apiClient,
      query: { page: 1, pageSize: 100 },
    }),
  });

  const markReadMutation = useMutation({
    ...notificationsMarkReadMutation({ client: apiClient }),
    onSuccess: invalidateNotifications,
  });

  const markUnreadMutation = useMutation({
    ...notificationsMarkUnreadMutation({ client: apiClient }),
    onSuccess: invalidateNotifications,
  });

  const markAllReadMutation = useMutation({
    ...notificationsMarkAllReadMutation({ client: apiClient }),
    onSuccess: invalidateNotifications,
  });

  const deleteMutation = useMutation({
    ...notificationsDeleteMutation({ client: apiClient }),
    onSuccess: invalidateNotifications,
  });

  const notifications = (data as { data?: Notification[] })?.data ?? [];
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  // Column definitions
  const columns: ColumnDef<Notification>[] = [
    {
      id: "status",
      header: "",
      accessorKey: "readAt",
      width: 40,
      cell: ({ value }) => {
        const isUnread = !value;
        return isUnread ? (
          <Circle className="size-2 fill-primary text-primary" />
        ) : null;
      },
    },
    {
      id: "subject",
      header: "Notification",
      accessorKey: "subject",
      sortable: true,
      filterable: true,
      filterType: "text",
      minWidth: 300,
      cell: ({ row, value }) => (
        <div className="space-y-1">
          <p className={row.readAt ? "font-normal" : "font-semibold"}>
            {String(value) || row.category}
          </p>
          <p className="line-clamp-2 text-muted-foreground text-sm">
            {row.body || "No content"}
          </p>
        </div>
      ),
    },
    {
      id: "category",
      header: "Category",
      accessorKey: "category",
      sortable: true,
      filterable: true,
      filterType: "select",
      filterOptions: [
        { value: "transactional", label: "Transactional" },
        { value: "marketing", label: "Marketing" },
        { value: "security", label: "Security" },
        { value: "system", label: "System" },
      ],
      width: 150,
      cell: ({ value }) => (
        <Badge variant={CATEGORY_COLORS[value as NotificationCategory]}>
          {String(value)}
        </Badge>
      ),
    },
    {
      id: "createdAt",
      header: "Received",
      accessorKey: "createdAt",
      sortable: true,
      width: 150,
      cell: ({ value }) =>
        formatDistanceToNow(new Date(String(value)), { addSuffix: true }),
    },
  ];

  // Row actions
  const rowActions: RowAction<Notification>[] = [
    {
      id: "mark-read",
      label: "Mark as read",
      icon: Check,
      onAction: async (row) => {
        await markReadMutation.mutateAsync({ path: { id: row.id } });
      },
      hidden: (row) => Boolean(row.readAt),
    },
    {
      id: "mark-unread",
      label: "Mark as unread",
      icon: Bell,
      onAction: async (row) => {
        await markUnreadMutation.mutateAsync({ path: { id: row.id } });
      },
      hidden: (row) => !row.readAt,
    },
    {
      id: "delete",
      label: "Delete",
      icon: Trash2,
      variant: "destructive",
      onAction: async (row) => {
        await deleteMutation.mutateAsync({ path: { id: row.id } });
      },
    },
  ];

  // Bulk actions
  const bulkActions: BulkAction<Notification>[] = [
    {
      id: "mark-all-read",
      label: "Mark as Read",
      icon: CheckCheck,
      onAction: async (rows) => {
        await Promise.all(
          rows
            .filter((r) => !r.readAt)
            .map((row) =>
              markReadMutation.mutateAsync({ path: { id: row.id } })
            )
        );
      },
      disabled: (rows) => rows.every((r) => Boolean(r.readAt)),
    },
    {
      id: "delete",
      label: "Delete Selected",
      icon: Trash2,
      variant: "destructive",
      confirmMessage:
        "Are you sure you want to delete the selected notifications?",
      onAction: async (rows) => {
        await Promise.all(
          rows.map((row) =>
            deleteMutation.mutateAsync({ path: { id: row.id } })
          )
        );
      },
    },
  ];

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        actions={
          <Button
            disabled={markAllReadMutation.isPending || unreadCount === 0}
            onClick={() => markAllReadMutation.mutate({})}
            size="sm"
            variant="outline"
          >
            <CheckCheck className="size-4" />
            <span className="hidden sm:inline">Mark all as read</span>
          </Button>
        }
        badge={
          unreadCount > 0 ? (
            <Badge variant="default">{unreadCount} unread</Badge>
          ) : null
        }
        description="View and manage your notifications. Stay updated on important events and activities."
        title="Notifications"
      />

      <DataViewComponent<Notification>
        availableViews={["table", "list"] as ViewMode[]}
        bulkActions={bulkActions}
        columns={columns}
        data={notifications}
        defaultPageSize={20}
        defaultView="list"
        emptyMessage="No notifications found"
        filterable
        getRowId={(row) => row.id}
        hoverable
        loadingMessage="Loading notifications..."
        multiSelect
        pageSizeOptions={[10, 20, 50, 100]}
        paginated
        responsiveBreakpoints={{
          list: 1024,
          grid: 640,
        }}
        rowActions={rowActions}
        searchable
        selectable
        sortable
        striped
        toolbarLeft={<SearchInput showFieldSelector />}
        toolbarRight={
          <>
            <FilterButton />
            <SortButton />
            <ViewToggle />
          </>
        }
      />
    </div>
  );
}
