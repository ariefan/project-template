"use client";

import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import { Building2, Key, Shield, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layouts/page-header";

const navItems = [
  {
    id: "general",
    label: "General",
    href: "/organization/general",
    icon: Building2,
  },
  {
    id: "members",
    label: "Members",
    href: "/organization/members",
    icon: Users,
  },
  {
    id: "roles",
    label: "Roles",
    href: "/organization/roles",
    icon: Shield,
  },
  {
    id: "sso",
    label: "SSO",
    href: "/organization/sso",
    icon: Key,
  },
] as const;

export default function OrganizationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <div className="flex items-center gap-3 px-4 md:px-0">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>

        <div className="flex flex-col gap-8 md:flex-row">
          <aside className="w-full flex-shrink-0 md:w-64">
            <div className="flex space-x-2 overflow-x-auto pb-2 md:flex-col md:space-x-0 md:space-y-1 md:overflow-visible md:pb-0">
              {Array.from({ length: 4 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed number of skeleton placeholders
                <Skeleton className="h-10 w-full" key={`skeleton-${i}`} />
              ))}
            </div>
          </aside>
          <div className="min-w-0 flex-1 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-full p-4">
      <PageHeader
        description="Manage your organization's profile, members, and security settings."
        icon={<Building2 className="h-8 w-8 text-primary" />}
        title="Organization Settings"
      />

      <div className="flex flex-col gap-8 md:flex-row">
        {/* Sidebar Navigation */}
        <aside className="w-full flex-shrink-0 md:w-64">
          <nav className="flex space-x-2 overflow-x-auto pb-2 md:flex-col md:space-x-0 md:space-y-1 md:overflow-visible md:pb-0">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Button
                  asChild
                  className={cn(
                    "justify-start",
                    isActive && "bg-muted font-medium"
                  )}
                  key={item.id}
                  variant={isActive ? "secondary" : "ghost"}
                >
                  <Link href={item.href}>
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </Link>
                </Button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content Area */}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
