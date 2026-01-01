"use client";

import { Separator } from "@workspace/ui/components/separator";
import { SidebarTrigger } from "@workspace/ui/components/sidebar";
import { cn } from "@workspace/ui/lib/utils";
import { AutoBreadcrumb } from "./auto-breadcrumb";
import { ModeToggle } from "./mode-toggle";
import { NotificationMenu } from "./notification-menu";
import { SearchTrigger } from "./search-trigger";

interface AppHeaderProps {
  className?: string;
}

export function AppHeader({ className }: AppHeaderProps) {
  return (
    <header
      className={cn(
        "flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12",
        className
      )}
    >
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator className="mr-2 h-4" orientation="vertical" />
        <AutoBreadcrumb />
      </div>

      <div className="ml-auto flex items-center gap-2 px-4">
        <SearchTrigger />
        <ModeToggle />
        <NotificationMenu />
      </div>
    </header>
  );
}
