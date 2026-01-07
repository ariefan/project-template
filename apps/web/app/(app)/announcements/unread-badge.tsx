"use client";

import { useQuery } from "@tanstack/react-query";
import { announcementsGetUnreadCountOptions } from "@workspace/contracts/query";
import { Badge } from "@workspace/ui/components/badge";
import { apiClient } from "@/lib/api-client";
import { useActiveOrganization } from "@/lib/auth";

export function UnreadAnnouncementsBadge() {
  const { data: activeOrganization } = useActiveOrganization();

  const { data } = useQuery({
    ...announcementsGetUnreadCountOptions({
      client: apiClient,
      path: { orgId: activeOrganization?.id ?? "" },
    }),
    enabled: !!activeOrganization?.id,
    refetchInterval: 30_000, // Refetch every 30 seconds
  });

  const counts = (
    data as { data?: { unreadCount: number; criticalCount: number } }
  )?.data;
  const unreadCount = counts?.unreadCount ?? 0;
  const criticalCount = counts?.criticalCount ?? 0;

  if (unreadCount === 0) {
    return null;
  }

  return (
    <Badge
      className="ml-auto shrink-0"
      variant={criticalCount > 0 ? "destructive" : "default"}
    >
      {unreadCount}
    </Badge>
  );
}
