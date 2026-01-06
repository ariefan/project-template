"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSSE } from "@/hooks/use-sse";

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
          predicate: (query) => {
            const key = query.queryKey[0];
            if (typeof key === "object" && key !== null && "_id" in key) {
              const id = (key as { _id: string })._id;
              return id === "notificationsList";
            }
            return false;
          },
        });
        break;
      }

      case "notification:read":
      case "notification:unread":
      case "notification:deleted": {
        // Invalidate both notifications list and unread count
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey[0];
            if (typeof key === "object" && key !== null && "_id" in key) {
              const id = (key as { _id: string })._id;
              return (
                id === "notificationsList" ||
                id === "notificationsGetUnreadCount"
              );
            }
            return false;
          },
        });
        break;
      }

      case "notification:unread_count": {
        // Invalidate unread count query
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey[0];
            if (typeof key === "object" && key !== null && "_id" in key) {
              const id = (key as { _id: string })._id;
              return id === "notificationsGetUnreadCount";
            }
            return false;
          },
        });
        break;
      }

      case "notification:bulk_read": {
        const data = event.data as { markedCount: number };
        toast.success(`Marked ${data.markedCount} notifications as read`);

        // Invalidate both notifications list and unread count
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey[0];
            if (typeof key === "object" && key !== null && "_id" in key) {
              const id = (key as { _id: string })._id;
              return (
                id === "notificationsList" ||
                id === "notificationsGetUnreadCount"
              );
            }
            return false;
          },
        });
        break;
      }

      case "job:completed": {
        const data = event.data as { id: string; type: string };
        toast.success(`Job completed: ${data.type}`);

        // Invalidate jobs queries
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey[0];
            if (typeof key === "object" && key !== null && "_id" in key) {
              const id = (key as { _id: string })._id;
              return id.startsWith("jobs");
            }
            return false;
          },
        });
        break;
      }

      case "job:failed": {
        const data = event.data as { id: string; type: string };
        toast.error(`Job failed: ${data.type}`);

        // Invalidate jobs queries
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey[0];
            if (typeof key === "object" && key !== null && "_id" in key) {
              const id = (key as { _id: string })._id;
              return id.startsWith("jobs");
            }
            return false;
          },
        });
        break;
      }

      case "webhook:delivered":
      case "webhook:failed": {
        // Invalidate webhook queries
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey[0];
            if (typeof key === "object" && key !== null && "_id" in key) {
              const id = (key as { _id: string })._id;
              return id.startsWith("webhooks");
            }
            return false;
          },
        });
        break;
      }

      case "sse:connected": {
        console.log("[NotificationListener] SSE connected", event.data);
        break;
      }

      default: {
        // Log unknown event types for debugging
        console.log("[NotificationListener] Unknown event type:", event.type);
      }
    }
  }, true);

  // This component doesn't render anything
  return null;
}
