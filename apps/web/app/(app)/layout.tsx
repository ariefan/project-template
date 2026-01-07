import {
  SidebarInset,
  SidebarProvider,
} from "@workspace/ui/components/sidebar";
import type { ReactNode } from "react";
import { AppSidebar } from "@/components/layouts/app-sidebar";
import { AppHeader } from "@/components/layouts/header/app-header";

export default async function AppLayout({ children }: { children: ReactNode }) {
  // Check authentication - redirect to login if not authenticated
  // const session = await getSession();

  // if (!session?.data?.user) {
  //   redirect("/login");
  // }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
