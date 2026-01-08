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
  BellRing,
  Briefcase,
  Code,
  CreditCard,
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
import { UnreadAnnouncementsBadge } from "@/app/(app)/announcements/unread-badge";
import { NavMain } from "@/components/layouts/nav-main";
import { NavUser } from "@/components/layouts/nav-user";
import { OrgSwitcher } from "@/components/layouts/org-switcher";

// Core application features
const navApplication = [
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
    title: "Subscriptions",
    url: "/subscriptions",
    icon: CreditCard,
  },
];

// System integration features
const navSystem = [
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
    title: "Announcements",
    url: "/announcements",
    icon: BellRing,
    badge: UnreadAnnouncementsBadge,
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
];

// Developer tools
const navDeveloper = [
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
    ],
  },
];

// Administration and settings
const navAdmin = [
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
      {
        title: "Announcements",
        url: "/admin/announcements",
      },
      {
        title: "Subscription Plans",
        url: "/admin/subscriptions/plans",
      },
    ],
  },
];

// Demo pages (can be removed in production)
const navExamples = [
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
        <NavMain items={navApplication} label="Application" />
        <NavMain items={navSystem} label="System" />
        <NavMain items={navDeveloper} label="Developer" />
        <NavMain items={navAdmin} label="Administration" />
        <NavMain items={navExamples} label="Examples" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
