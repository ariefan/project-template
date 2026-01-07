import {
  SidebarInset,
  SidebarProvider,
} from "@workspace/ui/components/sidebar";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AnnouncementBanner } from "@/app/(app)/announcements/announcement-banner";
import { AppSidebar } from "@/components/layouts/app-sidebar";
import { AppHeader } from "@/components/layouts/header/app-header";
import { getSession } from "@/lib/auth.server";

export default async function AppLayout({ children }: { children: ReactNode }) {
  // Check authentication - redirect to login if not authenticated
  const session = await getSession();

  if (!session?.data?.user) {
    redirect("/login");
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <div className="px-4">
          <AnnouncementBanner />
        </div>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
