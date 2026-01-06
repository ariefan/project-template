"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@workspace/ui/components/sidebar";
import {
  Bell,
  Briefcase,
  Code,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Home,
  LetterTextIcon,
  Settings,
  Shield,
  Webhook,
} from "lucide-react";
import type * as React from "react";
import { NavMain } from "@/components/layouts/nav-main";
import { NavUser } from "@/components/layouts/nav-user";
import { OrgSwitcher } from "@/components/layouts/org-switcher";

const navMain = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Posts",
    url: "/posts",
    icon: FileText,
  },
  {
    title: "Files",
    url: "/files",
    icon: FolderOpen,
  },
  {
    title: "Jobs",
    url: "/jobs",
    icon: Briefcase,
  },
  {
    title: "Webhooks",
    url: "/webhooks",
    icon: Webhook,
  },
  {
    title: "Notifications",
    url: "/notifications",
    icon: Bell,
  },
  {
    title: "Reports",
    url: "/reports/templates",
    icon: FileSpreadsheet,
    items: [
      {
        title: "Templates",
        url: "/reports/templates",
      },
      {
        title: "Schedules",
        url: "/reports/schedules",
      },
    ],
  },
  {
    title: "Developer",
    url: "/developer/notifications",
    icon: Code,
    items: [
      {
        title: "Notifications",
        url: "/developer/notifications",
      },
      {
        title: "Jobs",
        url: "/developer/jobs",
      },
      {
        title: "Email",
        url: "/developer/email",
      },
    ],
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
  {
    title: "Admin",
    url: "/admin/users",
    icon: Shield,
    items: [
      {
        title: "Users",
        url: "/admin/users",
      },
      {
        title: "Roles",
        url: "/admin/roles",
      },
    ],
  },
  {
    title: "Pages",
    url: "/pages/crud",
    icon: LetterTextIcon,
    items: [
      {
        title: "CRUD",
        url: "/pages/crud",
      },
    ],
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <OrgSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
