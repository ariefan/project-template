"use client";

import { PageHeader } from "@/components/layouts/page-header";
import { AnnouncementForm } from "../announcement-form";

export default function NewAnnouncementPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        description="Create a new system or organization announcement"
        title="Create announcement"
      />
      <AnnouncementForm mode="create" />
    </div>
  );
}
