"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@workspace/ui/components/sidebar";
import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type React from "react";

interface NavItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  badge?: React.ComponentType;
  items?: {
    title: string;
    url: string;
  }[];
}

function isExactMatch(pathname: string, url: string): boolean {
  const urlPath = url.split("?")[0];
  return pathname === urlPath;
}

function isNestedMatch(pathname: string, url: string): boolean {
  const urlPath = url.split("?")[0];
  return pathname === urlPath || pathname.startsWith(`${urlPath}/`);
}

export function NavMain({
  items,
  label,
}: {
  items: NavItem[];
  label?: string;
}) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarMenu>
        {items.map((item) =>
          item.items && item.items.length > 0 ? (
            <CollapsibleMenuItem
              item={item}
              key={item.title}
              pathname={pathname}
            />
          ) : (
            <SimpleMenuItem item={item} key={item.title} pathname={pathname} />
          )
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}

function SimpleMenuItem({
  item,
  pathname,
}: {
  item: NavItem;
  pathname: string;
}) {
  const isActive = isNestedMatch(pathname, item.url);
  const Badge = item.badge;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
        <Link href={item.url}>
          {item.icon ? <item.icon /> : null}
          <span>{item.title}</span>
          {Badge ? <Badge /> : null}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function CollapsibleMenuItem({
  item,
  pathname,
}: {
  item: NavItem;
  pathname: string;
}) {
  // Check if any sub-item is active to auto-expand and highlight parent
  const hasActiveChild =
    item.items?.some((subItem) => isExactMatch(pathname, subItem.url)) ?? false;

  return (
    <Collapsible
      asChild
      className="group/collapsible"
      defaultOpen={hasActiveChild}
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton isActive={hasActiveChild} tooltip={item.title}>
            {item.icon ? <item.icon /> : null}
            <span>{item.title}</span>
            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.items?.map((subItem) => (
              <SidebarMenuSubItem key={subItem.title}>
                <SidebarMenuSubButton
                  asChild
                  isActive={isExactMatch(pathname, subItem.url)}
                >
                  <Link href={subItem.url}>
                    <span>{subItem.title}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
