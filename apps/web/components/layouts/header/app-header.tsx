"use client";

import { Separator } from "@workspace/ui/components/separator";
import { SidebarTrigger } from "@workspace/ui/components/sidebar";
import { cn } from "@workspace/ui/lib/utils";
import type { ReactNode } from "react";
import { ModeToggle } from "./mode-toggle";
import { NotificationMenu } from "./notification-menu";
import { SearchTrigger } from "./search-trigger";

type AppHeaderProps = {
  breadcrumb?: ReactNode;
  className?: string;
};

export function AppHeader({ breadcrumb, className }: AppHeaderProps) {
  return (
    <header
      className={cn(
        "flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12",
        className
      )}
    >
      {/* Left Section: Sidebar Toggle + Breadcrumb */}
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator className="mr-2 h-4" orientation="vertical" />
        {breadcrumb}
      </div>

      {/* Right Section: Search, Theme Toggle, Notifications */}
      <div className="ml-auto flex items-center gap-2 px-4">
        <SearchTrigger />
        <ModeToggle />
        <NotificationMenu />
      </div>
    </header>
  );
}
