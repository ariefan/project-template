"use client";

import { useQuery } from "@tanstack/react-query";
import { announcementsGetOptions } from "@workspace/contracts/query";
import { Loader2 } from "lucide-react";
import { notFound, useParams } from "next/navigation";
import { PageHeader } from "@/components/layouts/page-header";
import { apiClient } from "@/lib/api-client";
import { useActiveOrganization } from "@/lib/auth";
import { AnnouncementForm } from "../../announcement-form";

export default function EditAnnouncementPage() {
  const params = useParams<{ announcementId: string }>();
  const { data: activeOrganization } = useActiveOrganization();

  const { data, isLoading } = useQuery({
    ...announcementsGetOptions({
      client: apiClient,
      path: {
        orgId: activeOrganization?.id ?? "",
        announcementId: params.announcementId,
      },
    }),
    enabled: !!activeOrganization?.id && !!params.announcementId,
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || "error" in data) {
    return notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        description="Edit announcement details"
        title="Edit announcement"
      />
      <AnnouncementForm announcement={data.data} mode="edit" />
    </div>
  );
}
