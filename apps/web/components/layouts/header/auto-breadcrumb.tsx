"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb";
import { Home } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

const UUID_REGEX = /^[0-9a-f-]{36}$/;
const NUMERIC_ID_REGEX = /^\d+$/;

const ROUTE_LABELS: Record<string, string> = {
  // Main routes
  dashboard: "Dashboard",
  settings: "Settings",
  profile: "Profile",
  notifications: "Notifications",

  // Features
  posts: "Posts",
  files: "Files",
  jobs: "Jobs",
  webhooks: "Webhooks",

  // Admin
  admin: "Admin",
  users: "Users",
  roles: "Roles",

  // Actions
  new: "New",
  edit: "Edit",
};

interface BreadcrumbSegment {
  label: string;
  href: string;
  isLast: boolean;
}

function formatLabel(segment: string): string {
  return segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function isIdSegment(segment: string): boolean {
  return UUID_REGEX.test(segment) || NUMERIC_ID_REGEX.test(segment);
}

export function AutoBreadcrumb() {
  const pathname = usePathname();

  if (!pathname || pathname === "/" || pathname === "/dashboard") {
    return null;
  }

  const segments = pathname.split("/").filter(Boolean);
  const items: BreadcrumbSegment[] = [];

  let currentPath = "";
  for (const [i, segment] of segments.entries()) {
    currentPath += `/${segment}`;
    const isLast = i === segments.length - 1;

    if (isIdSegment(segment)) {
      if (isLast) {
        items.push({ label: "Detail", href: currentPath, isLast });
      }
    } else {
      const label = ROUTE_LABELS[segment] ?? formatLabel(segment);
      items.push({ label, href: currentPath, isLast });
    }
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link className="flex items-center" href="/dashboard">
              <Home className="h-4 w-4" />
              <span className="sr-only">Home</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />

        {items.map((item) => (
          <Fragment key={item.href}>
            <BreadcrumbItem>
              {item.isLast ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={item.href}>{item.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {!item.isLast && <BreadcrumbSeparator />}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
