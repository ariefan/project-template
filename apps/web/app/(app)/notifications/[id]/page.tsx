"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  notificationsDeleteMutation,
  notificationsGetOptions,
  notificationsMarkReadMutation,
  notificationsMarkUnreadMutation,
} from "@workspace/contracts/query";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Bell, Check, Circle, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use } from "react";
import { PageHeader } from "@/components/layouts/page-header";
import { apiClient } from "@/lib/api-client";

const CATEGORY_COLORS = {
  transactional: "default" as const,
  marketing: "secondary" as const,
  security: "destructive" as const,
  system: "outline" as const,
};

export default function NotificationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = use(params);

  const invalidateNotifications = () => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        if (typeof key === "object" && key !== null && "_id" in key) {
          const id = (key as { _id: string })._id;
          return (
            id === "notificationsList" ||
            id === "notificationsGetUnreadCount" ||
            id === "notificationsGet"
          );
        }
        return false;
      },
    });
  };

  const { data, isLoading } = useQuery({
    ...notificationsGetOptions({
      client: apiClient,
      path: { id },
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

  const deleteMutation = useMutation({
    ...notificationsDeleteMutation({ client: apiClient }),
    onSuccess: () => {
      invalidateNotifications();
      router.push("/notifications");
    },
  });

  const notification = data && "data" in data ? data.data : undefined;

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!notification) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <PageHeader
          description="This notification could not be found or has been deleted."
          title="Notification Not Found"
        />
        <div className="mt-6">
          <Button asChild variant="outline">
            <Link href="/notifications">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Notifications
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <Button asChild size="sm" variant="ghost">
          <Link href="/notifications">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Notifications
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    CATEGORY_COLORS[
                      notification.category as keyof typeof CATEGORY_COLORS
                    ]
                  }
                >
                  {notification.category}
                </Badge>
                {!notification.readAt && (
                  <Circle className="size-2 fill-primary text-primary" />
                )}
              </div>
              <CardTitle className="text-2xl">
                {notification.subject || notification.category}
              </CardTitle>
              <CardDescription>
                Received{" "}
                {notification.createdAt
                  ? formatDistanceToNow(new Date(notification.createdAt), {
                      addSuffix: true,
                    })
                  : "recently"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {notification.bodyHtml ? (
              <div
                // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML from trusted notification system
                dangerouslySetInnerHTML={{ __html: notification.bodyHtml }}
              />
            ) : (
              <p className="whitespace-pre-wrap">
                {notification.body || "No content"}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 border-t pt-4">
            {notification.readAt ? (
              <Button
                disabled={markUnreadMutation.isPending}
                onClick={() =>
                  markUnreadMutation.mutate({ path: { id: notification.id } })
                }
                size="sm"
                variant="outline"
              >
                <Bell className="mr-2 h-4 w-4" />
                Mark as Unread
              </Button>
            ) : (
              <Button
                disabled={markReadMutation.isPending}
                onClick={() =>
                  markReadMutation.mutate({ path: { id: notification.id } })
                }
                size="sm"
                variant="outline"
              >
                <Check className="mr-2 h-4 w-4" />
                Mark as Read
              </Button>
            )}

            <Button
              disabled={deleteMutation.isPending}
              onClick={() =>
                deleteMutation.mutate({ path: { id: notification.id } })
              }
              size="sm"
              variant="outline"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete
            </Button>
          </div>

          {notification.metadata && (
            <div className="rounded-lg border bg-muted/50 p-4">
              <h4 className="mb-2 font-medium text-sm">Metadata</h4>
              <pre className="overflow-x-auto text-xs">
                {JSON.stringify(notification.metadata, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
