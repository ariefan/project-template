"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AnnouncementWithInteraction } from "@workspace/contracts";
import {
  announcementsDismissMutation,
  announcementsListOptions,
} from "@workspace/contracts/query";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { MarkdownRenderer } from "@workspace/ui/composed/markdown-renderer";
import { cn } from "@workspace/ui/lib/utils";
import { AlertCircle, AlertTriangle, Info, Lightbulb, X } from "lucide-react";
import { useCallback, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useActiveOrganization } from "@/lib/auth";

const PRIORITY_CONFIG = {
  info: {
    icon: Info,
    alertVariant: "default" as const,
  },
  warning: {
    icon: AlertTriangle,
    alertVariant: "default" as const,
  },
  critical: {
    icon: AlertCircle,
    alertVariant: "destructive" as const,
  },
  success: {
    icon: Lightbulb,
    alertVariant: "default" as const,
  },
};

export function AnnouncementBanner() {
  const { data: activeOrganization } = useActiveOrganization();
  const queryClient = useQueryClient();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

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

  const { data } = useQuery({
    ...announcementsListOptions({
      client: apiClient,
      path: { orgId: activeOrganization?.id ?? "" },
      query: {
        page: 1,
        pageSize: 10,
        orderBy: "-priority,publishAt",
        dismissedStatus: "not-dismissed",
        includeExpired: true,
        includeInactive: true,
      },
    }),
    enabled: !!activeOrganization?.id,
  });

  const dismissMutation = useMutation({
    ...announcementsDismissMutation({ client: apiClient }),
    onSuccess: (_, variables) => {
      setDismissedIds((prev) =>
        new Set(prev).add(variables.path.announcementId)
      );
      invalidateAnnouncements();
    },
  });

  const announcements =
    (data as { data?: AnnouncementWithInteraction[] })?.data?.filter(
      (a) => !dismissedIds.has(a.id)
    ) ?? [];

  const [isExpanded, setIsExpanded] = useState(false);

  const filteredAnnouncements = announcements.filter((a) => {
    if (a.priority === "critical" && !a.hasAcknowledged) {
      return true;
    }
    return !a.hasRead;
  });

  const displayAnnouncements = isExpanded
    ? filteredAnnouncements
    : filteredAnnouncements.slice(0, 3);

  if (displayAnnouncements.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {displayAnnouncements.map((announcement) => {
        const config = PRIORITY_CONFIG[announcement.priority];
        const Icon = config.icon;

        return (
          <Alert
            className={cn(
              "relative border transition-all has-[>svg]:grid-cols-[calc(var(--spacing)*5)_1fr] [&>svg]:size-5",
              announcement.priority === "warning" &&
                "border-amber-500/50 bg-amber-500/5 text-amber-600 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-400",
              announcement.priority === "success" &&
                "border-emerald-500/50 bg-emerald-500/5 text-emerald-600 dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-400",
              announcement.priority === "info" &&
                "border-blue-500/50 bg-blue-500/5 text-blue-600 dark:border-blue-500/50 dark:bg-blue-500/10 dark:text-blue-400",
              // Critical uses destructive variant usually, but we can style it manually for consistency
              announcement.priority === "critical" &&
                "border-red-500/50 bg-red-500/5 text-red-600 dark:border-red-500/50 dark:bg-red-500/10 dark:text-red-400"
            )}
            key={announcement.id}
            variant={
              announcement.priority === "critical" ? "destructive" : "default"
            } // Keep semantics but override styles
          >
            <Icon className="size-5" />
            <AlertTitle className="font-semibold tracking-tight">
              {announcement.title}
            </AlertTitle>
            <AlertDescription>
              <MarkdownRenderer
                className={cn(
                  "text-foreground/90 text-sm/relaxed dark:text-foreground/90",
                  // Override prose colors to match alert theme if needed, but generic foreground usually looks best in alerts
                  "[&_p]:mb-1 [&_p]:last:mb-0"
                )}
                content={announcement.content}
              />
            </AlertDescription>

            {announcement.isDismissible && (
              <Button
                className="absolute top-2 right-2 size-6 text-foreground/50 hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
                disabled={dismissMutation.isPending}
                onClick={() => {
                  dismissMutation.mutate({
                    path: {
                      orgId: activeOrganization?.id ?? "",
                      announcementId: announcement.id,
                    },
                  });
                }}
                size="icon"
                variant="ghost"
              >
                <X className="size-4" />
              </Button>
            )}
          </Alert>
        );
      })}
      {filteredAnnouncements.length > 3 && (
        <div className="mb-2 flex w-full justify-center">
          <Button
            className="w-full"
            onClick={() => setIsExpanded(!isExpanded)}
            size="sm"
            variant="outline"
          >
            {isExpanded
              ? "Show less"
              : `Show ${filteredAnnouncements.length - 3} more`}
          </Button>
        </div>
      )}
    </div>
  );
}
