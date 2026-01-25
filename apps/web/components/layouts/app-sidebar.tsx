"use client";

import { SystemRoles } from "@workspace/db/schema";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@workspace/ui/components/sidebar";
import {
  Activity,
  Building2,
  CalendarClock,
  Clock,
  Code,
  CreditCard,
  Database,
  DatabaseBackup,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Gavel,
  Home,
  Megaphone,
  Package,
  UserCog,
  Webhook,
} from "lucide-react";
import * as React from "react";
import { NavMain } from "@/components/layouts/nav-main";
import { NavUser } from "@/components/layouts/nav-user";
import { OrgSwitcher } from "@/components/layouts/org-switcher";
import { useActiveOrganization, useSession } from "@/lib/auth";
import { AppVersion } from "./app-version";

// Core application features
const navGeneral = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
];

const navApplication = [
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
    title: "Webhooks",
    url: "/webhooks",
    icon: Webhook,
  },
  {
    title: "Reports",
    url: "/reports/templates",
    icon: FileSpreadsheet,
  },
  {
    title: "Report History",
    url: "/reports/history",
    icon: Clock,
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
      {
        title: "Database",
        url: "/developer/database",
        icon: Database,
      },
    ],
  },
];

// Administration and settings
const navAdmin = [
  {
    title: "Background Jobs",
    url: "/jobs",
    icon: Activity,
  },
  {
    title: "Scheduler",
    url: "/schedules",
    icon: CalendarClock,
  },
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
  {
    title: "System Backups",
    url: "/admin/backups",
    icon: DatabaseBackup,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const activeOrg = useActiveOrganization();
  const { data: session } = useSession();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // biome-ignore lint/suspicious/noExplicitAny: better-auth extension
  const isImpersonating = Boolean((session?.session as any)?.impersonatedBy);
  const isSystemAdmin =
    (session?.user?.role === SystemRoles.SUPER_ADMIN ||
      session?.user?.role === SystemRoles.SUPPORT) &&
    !isImpersonating;

  if (!mounted) {
    return (
      <Sidebar collapsible="icon" {...props}>
        <SidebarHeader>
          <div className="h-12 w-full animate-pulse rounded-lg bg-sidebar-accent/50" />
        </SidebarHeader>
        <SidebarContent>
          <div className="space-y-4 p-4">
            <div className="h-8 w-full animate-pulse rounded-lg bg-sidebar-accent/50" />
            <div className="h-8 w-full animate-pulse rounded-lg bg-sidebar-accent/50" />
          </div>
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
    );
  }

  return (
    <Sidebar
      className={isImpersonating ? "!top-12 !h-[calc(100svh-48px)]" : ""}
      collapsible="icon"
      {...props}
    >
      <SidebarHeader>
        <OrgSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navGeneral} label="General" />
        {activeOrg.data && (
          <>
            <NavMain items={navApplication} label="Application" />
            <NavMain items={navSystem} label="System" />
          </>
        )}
        {isSystemAdmin && (
          <>
            <NavMain items={navAdmin} label="System Admin" />
            <NavMain items={navDeveloper} label="Developer" />
          </>
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
        <AppVersion />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
