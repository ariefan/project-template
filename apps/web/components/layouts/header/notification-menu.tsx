"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Notification } from "@workspace/contracts";
import {
  notificationsGetUnreadCountOptions,
  notificationsListOptions,
  notificationsMarkAllReadMutation,
  notificationsMarkReadMutation,
} from "@workspace/contracts/query";
import { Button } from "@workspace/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Separator } from "@workspace/ui/components/separator";
import { formatDistanceToNow } from "date-fns";
import { Bell, Loader2 } from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";

export function NotificationMenu() {
  const queryClient = useQueryClient();

  // Fetch unread count
  const { data: unreadCountData } = useQuery({
    ...notificationsGetUnreadCountOptions({
      client: apiClient,
    }),
  });

  const unreadCount =
    (unreadCountData as { data?: { count: number } })?.data?.count ?? 0;

  // Fetch recent notifications
  const { data: notificationsData, isLoading } = useQuery({
    ...notificationsListOptions({
      client: apiClient,
      query: { pageSize: 5 },
    }),
  });

  const notifications: Notification[] =
    (notificationsData as { data?: Notification[] })?.data ?? [];

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    ...notificationsMarkAllReadMutation({ client: apiClient }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["notificationsList"],
      });
      queryClient.invalidateQueries({
        queryKey: ["notificationsGetUnreadCount"],
      });
    },
  });

  // Mark single notification as read
  const markReadMutation = useMutation({
    ...notificationsMarkReadMutation({ client: apiClient }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["notificationsList"],
      });
      queryClient.invalidateQueries({
        queryKey: ["notificationsGetUnreadCount"],
      });
    },
  });

  function handleMarkAllRead() {
    markAllReadMutation.mutate({});
  }

  function handleNotificationClick(notification: Notification) {
    if (!notification.readAt) {
      markReadMutation.mutate({
        path: { id: notification.id },
      });
    }
  }

  function formatTime(dateString: string) {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return "Recently";
    }
  }

  function renderNotificationContent() {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (notifications.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <Bell className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">No notifications yet</p>
        </div>
      );
    }

    return (
      <div className="divide-y">
        {notifications.map((notification) => (
          <button
            className="flex w-full flex-col gap-1 p-4 text-left transition-colors hover:bg-muted"
            key={notification.id}
            onClick={() => handleNotificationClick(notification)}
            type="button"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-sm leading-none">
                {notification.subject ?? notification.category}
              </p>
              {!notification.readAt && (
                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
              )}
            </div>
            <p className="line-clamp-2 text-muted-foreground text-sm">
              {notification.body ?? "No content"}
            </p>
            <p className="text-muted-foreground text-xs">
              {formatTime(notification.createdAt)}
            </p>
          </button>
        ))}
      </div>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button className="relative h-9 w-9 p-0" variant="outline">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive font-medium text-[10px] text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-4">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              className="h-auto p-0 text-xs"
              disabled={markAllReadMutation.isPending}
              onClick={handleMarkAllRead}
              size="sm"
              variant="ghost"
            >
              {markAllReadMutation.isPending && (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              )}
              Mark all as read
            </Button>
          )}
        </div>
        <Separator />
        <ScrollArea className="h-[300px]">
          {renderNotificationContent()}
        </ScrollArea>
        <Separator />
        <div className="p-2">
          <Button
            asChild
            className="w-full justify-center text-sm"
            variant="ghost"
          >
            <Link href="/notifications">View all notifications</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
