"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { contextSwitchSwitchMutation } from "@workspace/contracts/query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@workspace/ui/components/sidebar";
import { Building2, Check, ChevronsUpDown, Loader2, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { apiClient } from "@/lib/api-client";
import { useActiveOrganization, useListOrganizations } from "@/lib/auth";

interface Organization {
  id: string;
  name: string;
  slug?: string;
  logo?: string | null;
  createdAt: string | Date;
}

export function TeamSwitcher() {
  const { isMobile } = useSidebar();
  const queryClient = useQueryClient();
  const { data: orgsData, isPending: orgsLoading } = useListOrganizations();
  const { data: activeOrgData, isPending: activeLoading } =
    useActiveOrganization();

  const organizations: Organization[] = orgsData ?? [];
  const activeOrg = activeOrgData;

  // Track if we've already auto-selected to prevent infinite loops
  const hasAutoSelected = useRef(false);

  const switchMutation = useMutation({
    ...contextSwitchSwitchMutation({ client: apiClient }),
    onSuccess: () => {
      hasAutoSelected.current = true;
      // Invalidate all queries to refetch with new context
      queryClient.invalidateQueries();
    },
  });

  // Auto-select the first organization if none is active
  const firstOrg = organizations[0];
  // biome-ignore lint/correctness/useExhaustiveDependencies: only run when orgs load and no active org
  useEffect(() => {
    if (
      !(hasAutoSelected.current || activeLoading || orgsLoading || activeOrg) &&
      firstOrg &&
      !switchMutation.isPending
    ) {
      hasAutoSelected.current = true;
      switchMutation.mutate({
        body: { tenantId: firstOrg.id },
      });
    }
  }, [activeLoading, orgsLoading, activeOrg, organizations]);

  function handleSwitchOrg(orgId: string) {
    if (orgId === activeOrg?.id) {
      return;
    }
    switchMutation.mutate({
      body: { tenantId: orgId },
    });
  }

  const isLoading = orgsLoading || activeLoading || switchMutation.isPending;

  if (isLoading && !activeOrg) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <Loader2 className="size-4 animate-spin" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">Loading...</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              size="lg"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                {activeOrg?.logo ? (
                  <Image
                    alt={activeOrg.name}
                    className="size-4 rounded"
                    height={16}
                    src={activeOrg.logo}
                    width={16}
                  />
                ) : (
                  <Building2 className="size-4" />
                )}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {activeOrg?.name ?? "Select Organization"}
                </span>
                <span className="truncate text-muted-foreground text-xs">
                  {activeOrg?.slug ?? "No organization selected"}
                </span>
              </div>
              {switchMutation.isPending ? (
                <Loader2 className="ml-auto size-4 animate-spin" />
              ) : (
                <ChevronsUpDown className="ml-auto" />
              )}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Organizations
            </DropdownMenuLabel>
            {organizations.length === 0 ? (
              <DropdownMenuItem disabled>
                No organizations found
              </DropdownMenuItem>
            ) : (
              organizations.map((org) => (
                <DropdownMenuItem
                  className="gap-2 p-2"
                  disabled={switchMutation.isPending}
                  key={org.id}
                  onClick={() => handleSwitchOrg(org.id)}
                >
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    {org.logo ? (
                      <Image
                        alt={org.name}
                        className="size-4 rounded"
                        height={16}
                        src={org.logo}
                        width={16}
                      />
                    ) : (
                      <Building2 className="size-3.5" />
                    )}
                  </div>
                  <span className="flex-1">{org.name}</span>
                  {org.id === activeOrg?.id && (
                    <Check className="size-4 text-primary" />
                  )}
                </DropdownMenuItem>
              ))
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="gap-2 p-2">
              <Link href="/settings/organizations/new">
                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                  <Plus className="size-4" />
                </div>
                <span className="font-medium text-muted-foreground">
                  Create organization
                </span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
