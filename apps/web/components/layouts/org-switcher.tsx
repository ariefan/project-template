"use client";

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
import { useEffect, useMemo, useRef, useState } from "react";
import {
	authClient,
	useActiveOrganization,
	useListOrganizations,
} from "@/lib/auth";

interface Organization {
	id: string;
	name: string;
	slug?: string;
	logo?: string | null;
	createdAt: string | Date;
}

export function OrgSwitcher() {
	const { isMobile } = useSidebar();
	const { data: orgsData, isPending: orgsLoading } = useListOrganizations();
	const { data: activeOrgData, isPending: activeLoading } =
		useActiveOrganization();

	const [isSwitching, setIsSwitching] = useState(false);
	const hasAutoSelected = useRef(false);

	// Deduplicate and memoize organizations
	const organizations = useMemo<Organization[]>(() => {
		if (!orgsData) {
			return [];
		}
		const seen = new Set<string>();
		return orgsData.filter((org) => {
			if (seen.has(org.id)) {
				return false;
			}
			seen.add(org.id);
			return true;
		});
	}, [orgsData]);

	const activeOrg = activeOrgData;

	// Auto-select first org when data loads and no active org
	const firstOrgId = organizations[0]?.id;
	useEffect(() => {
		// Skip if already attempted, still loading, or already have active org
		if (hasAutoSelected.current || orgsLoading || activeLoading) {
			return;
		}

		// If user already has an active org, mark as done
		if (activeOrg) {
			hasAutoSelected.current = true;
			return;
		}

		// Auto-select first org if available
		if (firstOrgId) {
			hasAutoSelected.current = true;
			setIsSwitching(true);

			async function selectOrg() {
				try {
					// @ts-expect-error - Better Auth organization.setActive exists at runtime
					await authClient.organization.setActive({
						organizationId: firstOrgId,
					});
				} catch (error) {
					console.error("Failed to auto-select organization:", error);
				} finally {
					setIsSwitching(false);
				}
			}
			selectOrg();
		}
	}, [orgsLoading, activeLoading, activeOrg, firstOrgId]);

	async function handleSwitchOrg(orgId: string) {
		if (orgId === activeOrg?.id || isSwitching) {
			return;
		}
		setIsSwitching(true);
		try {
			// @ts-expect-error - Better Auth organization.setActive exists at runtime
			await authClient.organization.setActive({ organizationId: orgId });
		} catch (error) {
			console.error("Failed to switch organization:", error);
		} finally {
			setIsSwitching(false);
		}
	}

	const isLoading = orgsLoading || activeLoading;

	// Show loading state only during initial load
	if (isLoading && !activeOrg && organizations.length === 0) {
		return (
			<SidebarMenu>
				<SidebarMenuItem>
					<DropdownMenu>
						<DropdownMenuTrigger asChild disabled>
							<SidebarMenuButton size="lg">
								<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
									<Loader2 className="size-4 animate-spin" />
								</div>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-medium">Loading...</span>
								</div>
							</SidebarMenuButton>
						</DropdownMenuTrigger>
					</DropdownMenu>
				</SidebarMenuItem>
			</SidebarMenu>
		);
	}

	// Use first org as fallback display while switching
	const displayOrg = activeOrg ?? organizations[0];

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
								{displayOrg?.logo ? (
									<Image
										alt={displayOrg.name}
										className="size-4 rounded"
										height={16}
										src={displayOrg.logo}
										width={16}
									/>
								) : (
									<Building2 className="size-4" />
								)}
							</div>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-medium">
									{displayOrg?.name ?? "Select Organization"}
								</span>
								<span className="truncate text-muted-foreground text-xs">
									{displayOrg?.slug ?? "No organization selected"}
								</span>
							</div>
							{isSwitching ? (
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
									disabled={isSwitching}
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
							<Link href="/organizations/new">
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
