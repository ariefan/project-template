"use client";

import { Button } from "@workspace/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@workspace/ui/components/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@workspace/ui/components/table";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@workspace/ui/components/tabs";
import { Textarea } from "@workspace/ui/components/textarea";
import { ClipboardCopy, Loader2, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { authClient, useActiveOrganization } from "@/lib/auth";

interface OIDCConfig {
	clientId: string;
	clientSecret: string;
}

interface SAMLConfig {
	entryPoint: string;
	issuer: string;
	cert: string;
}

interface SSOProvider {
	id: string;
	providerId: string;
	issuer: string;
	domain: string;
	oidcConfig: OIDCConfig | null;
	samlConfig: SAMLConfig | null;
	organizationId: string;
}

export function SsoSettings() {
	const { data: activeOrg, isPending: isOrgLoading } = useActiveOrganization();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [fetching, setFetching] = useState(false);
	const [providers, setProviders] = useState<SSOProvider[]>([]);
	const [activeTab, setActiveTab] = useState("oidc");

	const [newProvider, setNewProvider] = useState({
		name: "", // maps to providerId
		issuer: "",
		domain: "",
		// OIDC
		clientId: "",
		clientSecret: "",
		// SAML
		entryPoint: "",
		cert: "",
	});

	const fetchProviders = useCallback(async () => {
		if (!activeOrg?.id) {
			return;
		}
		setFetching(true);

		try {
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/v1/orgs/${activeOrg.id}/sso-providers`,
				{
					headers: {
						"Content-Type": "application/json",
					},
					credentials: "include",
				},
			);

			if (!response.ok) {
				throw new Error("Failed to fetch providers");
			}

			const json = await response.json();
			setProviders(json.data || []);
		} catch (_e) {
			// biome-ignore lint/suspicious/noExplicitAny: error handling
			const err = _e as any;
			toast.error(
				`Failed to load SSO providers: ${err.message || "Unknown error"}`,
			);
		} finally {
			setFetching(false);
		}
	}, [activeOrg?.id]);

	useEffect(() => {
		fetchProviders();
	}, [fetchProviders]);

	async function handleDeleteProvider(providerId: string) {
		// biome-ignore lint/suspicious/noAlert: simple confirmation for admin action
		if (!confirm("Are you sure you want to remove this provider?")) {
			return;
		}
		if (!activeOrg?.id) {
			return;
		}

		try {
			setLoading(true);
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/v1/orgs/${activeOrg.id}/sso-providers/${providerId}`,
				{
					method: "DELETE",
					credentials: "include",
				},
			);

			if (!response.ok) {
				throw new Error("Failed to delete provider");
			}

			toast.success("Provider removed");
			fetchProviders();
		} catch (_e) {
			toast.error("Failed to remove provider");
		} finally {
			setLoading(false);
		}
	}

	// Hydration mismatch fix: Don't render conditional content until mounted
	if (!mounted || isOrgLoading) {
		return (
			<div className="py-6 text-center text-muted-foreground">
				<Loader2 className="mx-auto h-6 w-6 animate-spin" />
			</div>
		);
	}

	if (!activeOrg) {
		return (
			<div className="py-6 text-center text-muted-foreground">
				Please select an organization to configure SSO.
			</div>
		);
	}

	const renderContent = () => {
		if (fetching) {
			return (
				<div className="flex justify-center py-8">
					<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
				</div>
			);
		}

		if (providers.length === 0) {
			return (
				<div className="py-6 text-center text-muted-foreground text-sm">
					No identity providers configured.
				</div>
			);
		}

		return (
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Type</TableHead>
						<TableHead>Name (Provider ID)</TableHead>
						<TableHead>Domain</TableHead>
						<TableHead>Issuer / Entity ID</TableHead>
						<TableHead>SP Metadata (SAML)</TableHead>
						<TableHead className="w-[50px]" />
					</TableRow>
				</TableHeader>
				<TableBody>
					{providers.map((p) => (
						<TableRow key={p.id}>
							<TableCell className="font-medium">
								{p.oidcConfig ? "OIDC" : "SAML"}
							</TableCell>
							<TableCell className="font-medium">{p.providerId}</TableCell>
							<TableCell className="font-mono text-xs">{p.domain}</TableCell>
							<TableCell
								className="max-w-[200px] truncate font-mono text-xs"
								title={p.issuer}
							>
								{p.issuer}
							</TableCell>
							<TableCell>
								{p.samlConfig ? (
									<Dialog>
										<DialogTrigger asChild>
											<Button
												className="h-7 text-xs"
												size="sm"
												variant="outline"
											>
												View Metadata
											</Button>
										</DialogTrigger>
										<DialogContent className="sm:max-w-md">
											<DialogHeader>
												<DialogTitle>Service Provider Metadata</DialogTitle>
												<DialogDescription>
													Use these values to configure your Identity Provider
													(IdP).
												</DialogDescription>
											</DialogHeader>
											<div className="space-y-4 pt-4">
												<div className="space-y-2">
													<Label>Entity ID (Issuer)</Label>
													<div className="flex items-center gap-2">
														<Input
															readOnly
															value={`${process.env.NEXT_PUBLIC_API_URL}/api/auth/sso/saml2/sp/metadata?providerId=${p.providerId}`}
														/>
														<Button
															onClick={() => {
																navigator.clipboard.writeText(
																	`${process.env.NEXT_PUBLIC_API_URL}/api/auth/sso/saml2/sp/metadata?providerId=${p.providerId}`,
																);
																toast.success("Copied to clipboard");
															}}
															size="icon"
															variant="ghost"
														>
															<ClipboardCopy className="h-4 w-4" />
														</Button>
													</div>
												</div>
												<div className="space-y-2">
													<Label>ACS URL (Callback)</Label>
													<div className="flex items-center gap-2">
														<Input
															readOnly
															value={`${process.env.NEXT_PUBLIC_API_URL}/api/auth/sso/saml2/callback/${p.providerId}`}
														/>
														<Button
															onClick={() => {
																navigator.clipboard.writeText(
																	`${process.env.NEXT_PUBLIC_API_URL}/api/auth/sso/saml2/callback/${p.providerId}`,
																);
																toast.success("Copied to clipboard");
															}}
															size="icon"
															variant="ghost"
														>
															<ClipboardCopy className="h-4 w-4" />
														</Button>
													</div>
												</div>
												<div className="space-y-2">
													<Label>Metadata URL</Label>
													<div className="flex items-center gap-2">
														<Input
															readOnly
															value={`${process.env.NEXT_PUBLIC_API_URL}/api/auth/sso/saml2/sp/metadata?providerId=${p.providerId}`}
														/>
														<Button asChild size="icon" variant="ghost">
															<a
																href={`${process.env.NEXT_PUBLIC_API_URL}/api/auth/sso/saml2/sp/metadata?providerId=${p.providerId}`}
																rel="noreferrer"
																target="_blank"
															>
																<ClipboardCopy className="h-4 w-4 rotate-90" />
															</a>
														</Button>
													</div>
												</div>
											</div>
										</DialogContent>
									</Dialog>
								) : (
									<span className="text-muted-foreground text-xs">-</span>
								)}
							</TableCell>
							<TableCell>
								<Button
									onClick={() => handleDeleteProvider(p.providerId)}
									size="icon"
									variant="ghost"
								>
									<Trash2 className="h-4 w-4 text-destructive" />
								</Button>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		);
	};

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div className="space-y-1">
							<CardTitle>Identity Providers</CardTitle>
							<CardDescription>
								Connect your organization to Okta, Google Workspace, or other
								OIDC/SAML providers.
							</CardDescription>
						</div>
						<Dialog onOpenChange={setOpen} open={open}>
							<DialogTrigger asChild>
								<Button size="sm">
									<Plus className="mr-2 h-4 w-4" />
									Add Provider
								</Button>
							</DialogTrigger>
							<DialogContent className="sm:max-w-[500px]">
								<DialogHeader>
									<DialogTitle>Add Identity Provider</DialogTitle>
									<DialogDescription>
										Configure a new identity provider.
									</DialogDescription>
								</DialogHeader>
								<Tabs
									className="w-full"
									onValueChange={setActiveTab}
									value={activeTab}
								>
									<TabsList className="grid w-full grid-cols-2">
										<TabsTrigger value="oidc">OIDC / OAuth 2</TabsTrigger>
										<TabsTrigger value="saml">SAML 2.0</TabsTrigger>
									</TabsList>

									<div className="space-y-4 py-4">
										<div className="grid grid-cols-2 gap-4">
											<div className="space-y-2">
												<Label>Provider ID</Label>
												<Input
													onChange={(e) =>
														setNewProvider({
															...newProvider,
															name: e.target.value,
														})
													}
													placeholder={
														activeTab === "oidc" ? "okta-oidc" : "okta-saml"
													}
													value={newProvider.name}
												/>
												<p className="text-[10px] text-muted-foreground">
													Unique ID (e.g. okta, google)
												</p>
											</div>
											<div className="space-y-2">
												<Label>Domain</Label>
												<Input
													onChange={(e) =>
														setNewProvider({
															...newProvider,
															domain: e.target.value,
														})
													}
													placeholder="example.com"
													value={newProvider.domain}
												/>
											</div>
										</div>

										<TabsContent className="mt-0 space-y-4" value="oidc">
											<div className="space-y-2">
												<Label>Issuer URL</Label>
												<Input
													onChange={(e) =>
														setNewProvider({
															...newProvider,
															issuer: e.target.value,
														})
													}
													placeholder="https://your-org.okta.com"
													value={newProvider.issuer}
												/>
											</div>
											<div className="space-y-2">
												<Label>Client ID</Label>
												<Input
													onChange={(e) =>
														setNewProvider({
															...newProvider,
															clientId: e.target.value,
														})
													}
													value={newProvider.clientId}
												/>
											</div>
											<div className="space-y-2">
												<Label>Client Secret</Label>
												<Input
													onChange={(e) =>
														setNewProvider({
															...newProvider,
															clientSecret: e.target.value,
														})
													}
													type="password"
													value={newProvider.clientSecret}
												/>
											</div>
										</TabsContent>

										<TabsContent className="mt-0 space-y-4" value="saml">
											<div className="space-y-2">
												<Label>Entry Point (SSO URL)</Label>
												<Input
													onChange={(e) =>
														setNewProvider({
															...newProvider,
															entryPoint: e.target.value,
														})
													}
													placeholder="https://idp.example.com/sso"
													value={newProvider.entryPoint}
												/>
											</div>
											<div className="space-y-2">
												<Label>Issuer (Entity ID)</Label>
												<Input
													onChange={(e) =>
														setNewProvider({
															...newProvider,
															issuer: e.target.value,
														})
													}
													placeholder="http://www.okta.com/exk..."
													value={newProvider.issuer}
												/>
											</div>
											<div className="space-y-2">
												<Label>Certificate (X.509)</Label>
												<Textarea
													className="min-h-[100px] font-mono text-xs"
													onChange={(e) =>
														setNewProvider({
															...newProvider,
															cert: e.target.value,
														})
													}
													placeholder="-----BEGIN CERTIFICATE-----..."
													value={newProvider.cert}
												/>
											</div>
										</TabsContent>

										<Button
											className="mt-2 w-full"
											disabled={loading}
											onClick={async () => {
												setLoading(true);
												try {
													// Prepare payload based on active tab
													// biome-ignore lint/suspicious/noExplicitAny: complex payload type construction
													const payload: any = {
														providerId: newProvider.name,
														domain: newProvider.domain,
														organizationId: activeOrg.id,
													};

													if (activeTab === "oidc") {
														payload.issuer = newProvider.issuer; // OIDC issuer
														payload.oidcConfig = {
															clientId: newProvider.clientId,
															clientSecret: newProvider.clientSecret,
														};
													} else {
														// SAML
														// For SAML, issuer in payload is the IdP Entity ID?
														// Better Auth docs say: issuer: "https://idp.example.com"
														payload.issuer = newProvider.issuer; // IdP Entity ID
														payload.samlConfig = {
															entryPoint: newProvider.entryPoint,
															cert: newProvider.cert,
															// Standard callback is auto-generated but can be explicit
														};
													}

													const { error } =
														await authClient.sso.register(payload);

													if (error) {
														throw error;
													}

													toast.success("Provider added successfully");
													setOpen(false);
													fetchProviders();
												} catch (_e) {
													// biome-ignore lint/suspicious/noExplicitAny: error handling
													const err = _e as any;
													toast.error(
														`Failed to add provider: ${err.message || err.statusText}`,
													);
												} finally {
													setLoading(false);
												}
											}}
										>
											{loading && (
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											)}
											Add Provider
										</Button>
									</div>
								</Tabs>
							</DialogContent>
						</Dialog>
					</div>
				</CardHeader>
				<CardContent>{renderContent()}</CardContent>
			</Card>
		</div>
	);
}
