import { SystemRoles } from "@workspace/db/schema";
import {
  SidebarInset,
  SidebarProvider,
} from "@workspace/ui/components/sidebar";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AnnouncementBanner } from "@/app/(app)/announcements/announcement-banner";
import { AppSidebar } from "@/components/layouts/app-sidebar";
import { AppHeader } from "@/components/layouts/header/app-header";
import { ImpersonationBanner } from "@/components/layouts/impersonation-banner";
import { getOrganizations, getSession } from "@/lib/auth.server";
// ... existing imports ...

export default async function AppLayout({ children }: { children: ReactNode }) {
  // Check authentication - redirect to login if not authenticated
  const session = await getSession();

  if (!session?.data?.user) {
    redirect("/login");
  }

  const orgs = await getOrganizations();
  const isSystemUser =
    session.data.user.role === SystemRoles.SUPER_ADMIN ||
    session.data.user.role === SystemRoles.SUPPORT;

  if (!(orgs?.data?.length || isSystemUser)) {
    redirect("/onboarding");
  }

  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

  return (
    <div className="flex min-h-svh flex-col">
      <ImpersonationBanner />
      <SidebarProvider className="min-h-0 flex-1" defaultOpen={defaultOpen}>
        <AppSidebar />
        <SidebarInset>
          <AppHeader />
          <div className="px-4">
            <AnnouncementBanner />
          </div>
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
