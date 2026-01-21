"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@workspace/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@workspace/ui/components/card";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import { Separator } from "@workspace/ui/components/separator";
import { Textarea } from "@workspace/ui/components/textarea";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "@/components/layouts/page-header";
import { authClient, useActiveOrganization } from "@/lib/auth";

const organizationSchema = z.object({
	name: z.string().min(2, "Name must be at least 2 characters"),
	slug: z.string().min(2, "Slug must be at least 2 characters"),
	logo: z.string().optional(),
	metadata: z.string().optional(), // Metadata as JSON string for editing
});

type OrganizationFormValues = z.infer<typeof organizationSchema>;

export default function OrganizationSettingsPage() {
	const {
		data: activeOrg,
		isPending: isOrgLoading,
		refetch,
	} = useActiveOrganization();
	const [loading, setLoading] = useState(false);

	const form = useForm<OrganizationFormValues>({
		resolver: zodResolver(organizationSchema),
		defaultValues: {
			name: "",
			slug: "",
			logo: "",
			metadata: "{}",
		},
	});

	useEffect(() => {
		if (activeOrg) {
			form.reset({
				name: activeOrg.name,
				slug: activeOrg.slug,
				logo: activeOrg.logo || "",
				metadata: JSON.stringify(activeOrg.metadata || {}, null, 2),
			});
		}
	}, [activeOrg, form]);

	async function onSubmit(data: OrganizationFormValues) {
		if (!activeOrg?.id) {
			return;
		}

		setLoading(true);
		try {
			let parsedMetadata = {};
			try {
				parsedMetadata = data.metadata ? JSON.parse(data.metadata) : {};
			} catch (_e) {
				toast.error("Invalid JSON in metadata");
				setLoading(false);
				return;
			}

			await authClient.organization.update({
				organizationId: activeOrg.id,
				data: {
					name: data.name,
					slug: data.slug,
					logo: data.logo,
					metadata: parsedMetadata,
				},
			});

			await refetch();
			toast.success("Organization settings updated");
		} catch (_error) {
			toast.error("Failed to update organization settings");
		} finally {
			setLoading(false);
		}
	}

	if (isOrgLoading) {
		return (
			<div className="flex h-[50vh] items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!activeOrg) {
		return (
			<div className="flex h-[50vh] items-center justify-center text-muted-foreground">
				Please select an organization.
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<PageHeader
				description="Manage your organization's profile and settings."
				title="Organization Settings"
			/>
			<Separator />

			<Form {...form}>
				<form className="space-y-8" onSubmit={form.handleSubmit(onSubmit)}>
					<Card>
						<CardHeader>
							<CardTitle>General Information</CardTitle>
							<CardDescription>
								Basic details about your organization.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Organization Name</FormLabel>
										<FormControl>
											<Input placeholder="Acme Inc." {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="slug"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Slug</FormLabel>
										<FormControl>
											<Input placeholder="acme-inc" {...field} />
										</FormControl>
										<FormDescription>
											The URL-friendly identifier for your organization.
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="logo"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Logo URL</FormLabel>
										<FormControl>
											<Input placeholder="https://..." {...field} />
										</FormControl>
										<FormDescription>
											A link to your organization's logo.
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Metadata</CardTitle>
							<CardDescription>
								Additional configuration and metadata (JSON format).
							</CardDescription>
						</CardHeader>
						<CardContent>
							<FormField
								control={form.control}
								name="metadata"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Metadata (JSON)</FormLabel>
										<FormControl>
											<Textarea
												className="min-h-[150px] font-mono"
												placeholder="{}"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</CardContent>
					</Card>

					<div className="flex justify-end">
						<Button disabled={loading} type="submit">
							{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Save Changes
						</Button>
					</div>
				</form>
			</Form>
		</div>
	);
}
