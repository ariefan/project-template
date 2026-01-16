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
  Building2,
  CalendarClock,
  Code,
  CreditCard,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Gavel,
  Home,
  Key,
  Megaphone,
  Package,
  Settings,
  Shield,
  UserCog,
  Users,
  Webhook,
} from "lucide-react";
import type * as React from "react";
import { UnreadAnnouncementsBadge } from "@/app/(app)/announcements/unread-badge";
import { NavMain } from "@/components/layouts/nav-main";
import { NavUser } from "@/components/layouts/nav-user";
import { OrgSwitcher } from "@/components/layouts/org-switcher";
import { AppVersion } from "./app-version";

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
    title: "Schedules",
    url: "/schedules",
    icon: CalendarClock,
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
      {
        title: "Storage",
        url: "/developer/storage",
      },
      {
        title: "Dialog",
        url: "/developer/dialog",
      },
      {
        title: "File Preview",
        url: "/developer/file-preview",
      },
      {
        title: "CRUD Example",
        url: "/developer/crud",
      },
    ],
  },
];

// Organization Management
const navOrganization = [
  {
    title: "General",
    url: "/organization/general",
    icon: Settings,
  },
  {
    title: "Members",
    url: "/organization/members",
    icon: Users,
  },
  {
    title: "Roles",
    url: "/organization/roles",
    icon: Shield,
  },
  {
    title: "SSO",
    url: "/organization/sso",
    icon: Key,
  },
];

// Administration and settings
const navAdmin = [
  {
    title: "System Users",
    url: "/admin/system/users",
    icon: UserCog,
  },
  {
    title: "System Orgs",
    url: "/admin/system/organizations",
    icon: Building2,
  },
  {
    title: "Announcements",
    url: "/admin/announcements",
    icon: Megaphone,
  },
  {
    title: "Legal Documents",
    url: "/admin/legal-documents",
    icon: Gavel,
  },
  {
    title: "Subscription Plans",
    url: "/admin/subscriptions/plans",
    icon: Package,
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
        <NavMain items={navOrganization} label="Organization" />
        <NavMain items={navSystem} label="System" />
        <NavMain items={navDeveloper} label="Developer" />
        <NavMain items={navAdmin} label="System Admin" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
        <AppVersion />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
