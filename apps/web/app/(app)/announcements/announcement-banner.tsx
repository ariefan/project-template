"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AnnouncementWithInteraction } from "@workspace/contracts";
import {
  announcementsAcknowledgeMutation,
  announcementsDismissMutation,
  announcementsListOptions,
  announcementsMarkReadMutation,
} from "@workspace/contracts/query";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Info,
  X,
} from "lucide-react";
import Link from "next/link";
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
    icon: CheckCircle,
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
      },
    }),
    enabled: !!activeOrganization?.id,
  });

  const markReadMutation = useMutation({
    ...announcementsMarkReadMutation({ client: apiClient }),
    onSuccess: invalidateAnnouncements,
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

  const acknowledgeMutation = useMutation({
    ...announcementsAcknowledgeMutation({ client: apiClient }),
    onSuccess: invalidateAnnouncements,
  });

  const announcements =
    (data as { data?: AnnouncementWithInteraction[] })?.data?.filter(
      (a) => !dismissedIds.has(a.id)
    ) ?? [];

  // Show only critical unacknowledged, or the first 3 unread
  const displayAnnouncements = announcements
    .filter((a) => {
      if (a.priority === "critical" && !a.hasAcknowledged) {
        return true;
      }
      return !a.hasRead;
    })
    .slice(0, 3);

  if (displayAnnouncements.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {displayAnnouncements.map((announcement) => {
        const config = PRIORITY_CONFIG[announcement.priority];
        const Icon = config.icon;
        const isUnacknowledged =
          announcement.priority === "critical" && !announcement.hasAcknowledged;

        return (
          <Alert
            className={cn(
              "relative",
              announcement.priority === "warning" &&
                "border-amber-200 bg-amber-50"
            )}
            key={announcement.id}
            variant={config.alertVariant}
          >
            <Icon className="size-4" />
            <AlertTitle className="pr-8">{announcement.title}</AlertTitle>
            <AlertDescription className="mt-2">
              <p className="text-sm">{announcement.content}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {announcement.linkUrl && (
                  <Button asChild size="sm" variant="outline">
                    <Link
                      href={announcement.linkUrl}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {announcement.linkText || "Learn more"}
                      <ExternalLink className="ml-2 size-4" />
                    </Link>
                  </Button>
                )}

                {isUnacknowledged && (
                  <Button
                    className="gap-2"
                    disabled={acknowledgeMutation.isPending}
                    onClick={() => {
                      acknowledgeMutation.mutate({
                        path: {
                          orgId: activeOrganization?.id ?? "",
                          announcementId: announcement.id,
                        },
                      });
                    }}
                    size="sm"
                    variant="default"
                  >
                    <CheckCircle className="size-4" />
                    Acknowledge
                  </Button>
                )}

                {!(announcement.hasRead || isUnacknowledged) && (
                  <Button
                    className="gap-2"
                    disabled={markReadMutation.isPending}
                    onClick={() => {
                      markReadMutation.mutate({
                        path: {
                          orgId: activeOrganization?.id ?? "",
                          announcementId: announcement.id,
                        },
                      });
                    }}
                    size="sm"
                    variant="ghost"
                  >
                    <CheckCircle className="size-4" />
                    Mark as read
                  </Button>
                )}
              </div>
            </AlertDescription>

            {announcement.isDismissible && (
              <Button
                className="absolute top-2 right-2 size-6"
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
    </div>
  );
}
