"use client";

import { PageHeader } from "@/components/layouts/page-header";
import { NotificationsTester } from "./notifications-tester";

export default function DeveloperNotificationsPage() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        description="Test and demonstrate notification system with API integration and code examples."
        title="Notifications Tester"
      />
      <NotificationsTester />
    </div>
  );
}
