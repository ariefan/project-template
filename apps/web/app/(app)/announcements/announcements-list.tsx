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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";

import { BellOff, Filter } from "lucide-react";
import { useCallback, useState } from "react";
import { PageHeader } from "@/components/layouts/page-header";
import { apiClient } from "@/lib/api-client";
import { useActiveOrganization } from "@/lib/auth";
import { AnnouncementCard } from "./announcement-card";

export function AnnouncementsList() {
  const { data: activeOrganization } = useActiveOrganization();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

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
    priority:
      priorityFilter !== "all"
        ? (priorityFilter as "info" | "warning" | "critical")
        : undefined,
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

  return (
    <div className="space-y-6">
      <PageHeader
        description="Stay updated with system and organization announcements"
        title="Announcements"
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          className="w-full sm:w-auto"
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

        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <Select onValueChange={setPriorityFilter} value={priorityFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading announcements...</div>
        </div>
      )}

      {!isLoading && announcements.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <BellOff className="mb-4 size-12 text-muted-foreground" />
          <h3 className="mb-2 font-semibold text-lg">No announcements</h3>
          <p className="max-w-md text-muted-foreground text-sm">
            {activeTab === "unread"
              ? "You're all caught up! No unread announcements."
              : "There are no announcements at this time."}
          </p>
        </div>
      )}

      {!isLoading && announcements.length > 0 && (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <AnnouncementCard
              announcement={announcement}
              key={announcement.id}
              onAcknowledge={
                announcement.priority === "critical" &&
                !announcement.hasAcknowledged
                  ? () => {
                      acknowledgeMutation.mutate({
                        path: {
                          orgId: activeOrganization?.id ?? "",
                          announcementId: announcement.id,
                        },
                      });
                    }
                  : undefined
              }
              onDismiss={
                announcement.isDismissible
                  ? () => {
                      dismissMutation.mutate({
                        path: {
                          orgId: activeOrganization?.id ?? "",
                          announcementId: announcement.id,
                        },
                      });
                    }
                  : undefined
              }
              onMarkRead={() => {
                markReadMutation.mutate({
                  path: {
                    orgId: activeOrganization?.id ?? "",
                    announcementId: announcement.id,
                  },
                });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
