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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  Check,
  CheckCheck,
  Loader2,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { apiClient } from "@/lib/api-client";

const CATEGORY_COLORS: Record<NotificationCategory, string> = {
  transactional: "bg-blue-100 text-blue-800",
  marketing: "bg-purple-100 text-purple-800",
  security: "bg-red-100 text-red-800",
  system: "bg-gray-100 text-gray-800",
};

export function NotificationsList() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState<
    NotificationCategory | "all"
  >("all");
  const [readFilter, setReadFilter] = useState<"all" | "read" | "unread">(
    "all"
  );
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    ...notificationsListOptions({
      client: apiClient,
      query: {
        page,
        pageSize: 20,
        category: categoryFilter === "all" ? undefined : categoryFilter,
      },
    }),
  });

  const markReadMutation = useMutation({
    ...notificationsMarkReadMutation({ client: apiClient }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificationsList"] });
      queryClient.invalidateQueries({
        queryKey: ["notificationsGetUnreadCount"],
      });
    },
  });

  const markUnreadMutation = useMutation({
    ...notificationsMarkUnreadMutation({ client: apiClient }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificationsList"] });
      queryClient.invalidateQueries({
        queryKey: ["notificationsGetUnreadCount"],
      });
    },
  });

  const markAllReadMutation = useMutation({
    ...notificationsMarkAllReadMutation({ client: apiClient }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificationsList"] });
      queryClient.invalidateQueries({
        queryKey: ["notificationsGetUnreadCount"],
      });
    },
  });

  const deleteMutation = useMutation({
    ...notificationsDeleteMutation({ client: apiClient }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificationsList"] });
      queryClient.invalidateQueries({
        queryKey: ["notificationsGetUnreadCount"],
      });
      setDeleteTarget(null);
    },
  });

  function handleDeleteConfirm() {
    if (deleteTarget) {
      deleteMutation.mutate({ path: { id: deleteTarget } });
    }
  }

  const notifications = (data as { data?: Notification[] })?.data ?? [];
  const pagination = (
    data as {
      pagination?: {
        totalPages: number;
        hasNext: boolean;
        hasPrevious: boolean;
        totalCount: number;
      };
    }
  )?.pagination;

  function renderContent() {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (error) {
      console.error("Notifications loading error:", error);
      return (
        <div className="py-12 text-center text-destructive">
          Failed to load notifications:{" "}
          {error instanceof Error ? error.message : "Unknown error"}
        </div>
      );
    }

    if (notifications.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Bell className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">No notifications found</p>
        </div>
      );
    }

    return (
      <>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]" />
              <TableHead>Subject</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Received</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {notifications.map((notification) => (
              <TableRow
                className={notification.readAt ? "opacity-60" : ""}
                key={notification.id}
              >
                <TableCell>
                  {!notification.readAt && (
                    <span className="block h-2 w-2 rounded-full bg-primary" />
                  )}
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <p className="font-medium">
                      {notification.subject ?? notification.category}
                    </p>
                    <p className="line-clamp-1 text-muted-foreground text-sm">
                      {notification.body ?? "No content"}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    className={CATEGORY_COLORS[notification.category]}
                    variant="secondary"
                  >
                    {notification.category}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDistanceToNow(new Date(notification.createdAt), {
                    addSuffix: true,
                  })}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {notification.readAt ? (
                        <DropdownMenuItem
                          onClick={() =>
                            markUnreadMutation.mutate({
                              path: { id: notification.id },
                            })
                          }
                        >
                          <Bell className="mr-2 h-4 w-4" />
                          Mark as unread
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() =>
                            markReadMutation.mutate({
                              path: { id: notification.id },
                            })
                          }
                        >
                          <Check className="mr-2 h-4 w-4" />
                          Mark as read
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteTarget(notification.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {pagination && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-muted-foreground text-sm">
              Page {page} of {pagination.totalPages} ({pagination.totalCount}{" "}
              total)
            </div>
            <div className="flex gap-2">
              <Button
                disabled={!pagination.hasPrevious}
                onClick={() => setPage((p) => p - 1)}
                size="sm"
                variant="outline"
              >
                Previous
              </Button>
              <Button
                disabled={!pagination.hasNext}
                onClick={() => setPage((p) => p + 1)}
                size="sm"
                variant="outline"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>
                  View and manage your notifications
                </CardDescription>
              </div>
            </div>
            <Button
              disabled={markAllReadMutation.isPending}
              onClick={() => markAllReadMutation.mutate({})}
              variant="outline"
            >
              {markAllReadMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck className="mr-2 h-4 w-4" />
              )}
              Mark all as read
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-4">
            <Select
              onValueChange={(value) => {
                setCategoryFilter(value as NotificationCategory | "all");
                setPage(1);
              }}
              value={categoryFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="transactional">Transactional</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="security">Security</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>

            <Select
              onValueChange={(value) => {
                setReadFilter(value as "all" | "read" | "unread");
                setPage(1);
              }}
              value={readFilter}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unread">Unread only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {renderContent()}
        </CardContent>
      </Card>

      <AlertDialog
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        open={Boolean(deleteTarget)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Notification</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this notification? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={handleDeleteConfirm}
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
