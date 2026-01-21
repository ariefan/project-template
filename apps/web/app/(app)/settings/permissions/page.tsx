"use client";

import { Badge } from "@workspace/ui/components/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Shield } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { useActiveOrganization } from "@/lib/auth";
export default function PermissionsPage() {
	const { data: activeOrg } = useActiveOrganization();
	const orgId = activeOrg?.id;

	// Use the new hook to get effective permissions directly
	const { permissions: effectivePermissions, isLoading } = usePermissions();

	if (!orgId) {
		return (
			<Card>
				<CardContent className="pt-6">
					<div className="text-center text-muted-foreground">
						Please select an organization.
					</div>
				</CardContent>
			</Card>
		);
	}

	// Group effective permissions by resource
	const groupedPerms = (() => {
		if (!effectivePermissions?.effectivePermissions) {
			return {};
		}

		// Convert to a minimal format similar to Role["permissions"] for display
		// The hook returns { resource, action, effect: "allow", condition? }
		// We only care about allowed ones effectively, but the API returns effective ones.

		const grouped: Record<string, { action: string; condition?: string }[]> =
			{};

		// Local type definition to handle potential missing property in generated types
		interface PermissionWithCondition {
			resource: string;
			action: string;
			effect: string;
			condition?: string;
		}

		// Also include allowedActions strings (e.g. "posts:create")
		// effectivePermissions object structure:
		// { allowedActions: string[], effectivePermissions: { resource, action, effect, condition }[] }

		for (const rawP of effectivePermissions.effectivePermissions) {
			const p = rawP as unknown as PermissionWithCondition;
			if (p.effect !== "allow") {
				continue; // We usually typically want to show what they CAN do.
			}

			const list = grouped[p.resource] ?? [];
			list.push({
				action: p.action,
				condition:
					p.condition && p.condition !== "none" ? p.condition : undefined,
			});
			grouped[p.resource] = list;
		}

		return grouped;
	})();

	const resources = Object.keys(groupedPerms).sort();

	return (
		<div className="space-y-6">
			<div className="mb-6 flex items-center gap-3">
				<Shield className="h-8 w-8 text-primary" />
				<div>
					<h1 className="font-bold text-2xl tracking-tight">
						My Effective Permissions
					</h1>
					<p className="text-muted-foreground">
						View your combined access rights in{" "}
						<strong>{activeOrg?.name ?? "your organization"}</strong>. These are
						calculated from all your assigned roles.
					</p>
				</div>
			</div>

			{isLoading ? (
				<Card>
					<CardHeader>
						<Skeleton className="mb-2 h-6 w-32" />
						<Skeleton className="h-4 w-48" />
					</CardHeader>
					<CardContent>
						<Skeleton className="h-32 w-full" />
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-6">
					{/* Roles Section */}
					<Card>
						<CardHeader>
							<CardTitle>Assigned Roles</CardTitle>
							<CardDescription>
								Your access is determined by these roles.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="flex flex-wrap gap-2">
								{/* Global Roles */}
								{effectivePermissions?.globalRoles?.map((role) => (
									<Badge
										className="px-3 py-1"
										key={role.id}
										variant="secondary"
									>
										{role.name}
										<span className="ml-2 border-border/50 border-l pl-2 text-[10px] text-muted-foreground uppercase">
											Global
										</span>
									</Badge>
								))}

								{/* Tenant Roles */}
								{effectivePermissions?.tenantRoles?.map((role) => (
									<Badge
										className="px-3 py-1"
										key={role.id}
										variant="secondary"
									>
										{role.name}
									</Badge>
								))}

								{!(
									effectivePermissions?.globalRoles?.length ||
									effectivePermissions?.tenantRoles?.length
								) && (
									<span className="text-muted-foreground text-sm italic">
										No roles assigned.
									</span>
								)}
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Permissions Overview</CardTitle>
							<CardDescription>
								You have the following capabilities in this organization:
							</CardDescription>
						</CardHeader>
						<CardContent>
							{resources.length === 0 ? (
								<div className="flex h-full items-center justify-center rounded-md border bg-muted/10 p-8 text-center text-muted-foreground text-sm italic">
									No explicit permissions found. You might be a basic member or
									have no role assigned.
								</div>
							) : (
								<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
									{resources.map((resource) => (
										<div
											className="h-fit rounded-md border p-3 text-sm"
											key={resource}
										>
											<div className="mb-3 flex items-center gap-2 border-b pb-2 font-semibold text-foreground/80 capitalize">
												<div className="h-1.5 w-1.5 rounded-full bg-primary/70" />
												{resource.replace(/_/g, " ")}
											</div>
											<div className="flex flex-wrap gap-2">
												{(groupedPerms[resource] ?? []).map((perm) => (
													<Badge
														className="border-green-200 bg-green-500/10 px-2 py-0.5 font-normal text-green-700 text-xs dark:border-green-800 dark:text-green-400"
														key={`${resource}-${perm.action}`}
														variant="outline"
													>
														{perm.action}
														{perm.condition && (
															<span className="ml-1 text-[10px] uppercase opacity-75">
																({perm.condition})
															</span>
														)}
													</Badge>
												))}
											</div>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			)}
		</div>
	);
}
