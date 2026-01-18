"use client";

import { type Query, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSSE } from "@/hooks/use-sse";

interface QueryKeyWithId {
  _id: string;
}

function isQueryKeyWithId(key: unknown): key is QueryKeyWithId {
  return typeof key === "object" && key !== null && "_id" in key;
}

function getQueryKeyId(query: Query): string | null {
  const key = query.queryKey[0];
  if (isQueryKeyWithId(key)) {
    return key._id;
  }
  return null;
}

function matchesQueryIds(query: Query, ...ids: string[]): boolean {
  const id = getQueryKeyId(query);
  if (id === null) {
    return false;
  }
  return ids.some((targetId) => id === targetId || id.startsWith(targetId));
}

function shouldInvalidateForJobEvent(query: Query, dataType: string): boolean {
  const queryKeyId = getQueryKeyId(query);
  if (queryKeyId?.startsWith("jobs")) {
    return true;
  }
  const key = query.queryKey[0];
  if (dataType === "system-backup" && key === "system-backups") {
    return true;
  }
  if (dataType === "backup:org-create" && key === "backups") {
    return true;
  }
  return false;
}

function shouldInvalidateForProgressEvent(
  query: Query,
  dataType: string
): boolean {
  const queryKeyId = getQueryKeyId(query);
  if (queryKeyId?.startsWith("jobs")) {
    return true;
  }
  const key = query.queryKey[0];
  if (dataType === "system:backup-create" && key === "system-backups") {
    return true;
  }
  if (dataType === "system-backup" && key === "system-backups") {
    return true;
  }
  if (dataType === "backup:org-create" && key === "backups") {
    return true;
  }
  return false;
}

export function NotificationListener() {
  const queryClient = useQueryClient();

  useSSE((event) => {
    switch (event.type) {
      case "notification:created": {
        const data = event.data as {
          id: string;
          channel: string;
          category: string;
          subject?: string;
          body?: string;
        };

        // Only show toast for in-app notifications (channel='none')
        // Email/SMS users are already notified externally
        if (data.channel === "none") {
          toast(data.subject || "New notification", {
            description: data.body,
          });
        }

        // Invalidate notifications list query
        queryClient.invalidateQueries({
          predicate: (query) => matchesQueryIds(query, "notificationsList"),
        });
        break;
      }

      case "notification:read":
      case "notification:unread":
      case "notification:deleted": {
        // Invalidate both notifications list and unread count
        queryClient.invalidateQueries({
          predicate: (query) =>
            matchesQueryIds(
              query,
              "notificationsList",
              "notificationsGetUnreadCount"
            ),
        });
        break;
      }

      case "notification:unread_count": {
        // Invalidate unread count query
        queryClient.invalidateQueries({
          predicate: (query) =>
            matchesQueryIds(query, "notificationsGetUnreadCount"),
        });
        break;
      }

      case "notification:bulk_read": {
        const data = event.data as { markedCount: number };
        toast.success(`Marked ${data.markedCount} notifications as read`);

        // Invalidate both notifications list and unread count
        queryClient.invalidateQueries({
          predicate: (query) =>
            matchesQueryIds(
              query,
              "notificationsList",
              "notificationsGetUnreadCount"
            ),
        });
        break;
      }

      case "job:completed": {
        const data = event.data as { id: string; type: string };
        toast.success(`Job completed: ${data.type}`);

        // Invalidate jobs queries
        queryClient.invalidateQueries({
          predicate: (query) => shouldInvalidateForJobEvent(query, data.type),
        });
        break;
      }

      case "job:progress": {
        const data = event.data as { id: string; type: string };
        // Don't toast for every progress update (too spammy)

        // Invalidate queries to refresh progress bars
        queryClient.invalidateQueries({
          predicate: (query) =>
            shouldInvalidateForProgressEvent(query, data.type),
        });
        break;
      }

      case "job:failed": {
        const data = event.data as { id: string; type: string };
        toast.error(`Job failed: ${data.type}`);

        // Invalidate jobs queries
        queryClient.invalidateQueries({
          predicate: (query) => shouldInvalidateForJobEvent(query, data.type),
        });
        break;
      }

      case "webhook:delivered":
      case "webhook:failed": {
        // Invalidate webhook queries
        queryClient.invalidateQueries({
          predicate: (query) => matchesQueryIds(query, "webhooks"),
        });
        break;
      }

      case "sse:connected": {
        break;
      }

      default: {
        // Ignore unknown event types
      }
    }
  }, true);

  // This component doesn't render anything
  return null;
}
