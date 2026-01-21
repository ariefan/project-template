"use client";

import { Button } from "@workspace/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@workspace/ui/components/card";
import { ConfirmDialog } from "@workspace/ui/composed/confirm-dialog";
import {
	AlertTriangle,
	Check,
	Copy,
	Database,
	Play,
	ShieldCheck,
	Terminal,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layouts/page-header";
import { signOut } from "@/lib/auth"; // Add this
import { env } from "@/lib/env";

const TRAILING_SLASH_REGEX = /\/$/;

export default function DatabaseSeedPage() {
	const [isLoading, setIsLoading] = useState(false);
	const [output, setOutput] = useState<string>("");
	const [isCopied, setIsCopied] = useState(false);
	const [confirmMode, setConfirmMode] = useState<"dev" | "prod" | null>(null);

	const executeSeed = async (mode: "dev" | "prod") => {
		setIsLoading(true);
		setOutput(`Starting seed request (Mode: ${mode.toUpperCase()})...\n`);

		try {
			const baseUrl = env.NEXT_PUBLIC_API_URL.replace(TRAILING_SLASH_REGEX, "");
			const res = await fetch(`${baseUrl}/v1/developer/database/seed`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ mode }),
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.message || "Failed to submit seed request");
			}

			setOutput(
				(prev) =>
					prev +
					"✓ Request successful\n" +
					"----------------------------------------\n" +
					(data.output || "No output captured") +
					"\n" +
					(data.warnings ? `Warnings:\n${data.warnings}` : ""),
			);
			if (mode === "dev") {
				toast.success("Database reset complete. Signing out...");
				await signOut(); // Clear local session state

				setTimeout(() => {
					window.location.href = "/login";
				}, 1500);
			} else {
				toast.success("Database updated successfully");
			}

			setConfirmMode(null);
		} catch (e: unknown) {
			const errorMessage =
				e instanceof Error ? e.message : "An unknown error occurred";
			setOutput((prev) => `${prev}\n❌ Error: ${errorMessage}`);
			toast.error(errorMessage || "Failed to seed database");
			// We don't auto-close on error so user can retry or see error
		} finally {
			if (mode === "prod") {
				setIsLoading(false);
			}
			// If dev, we keep loading state until redirect happens to prevent user interaction
		}
	};

	const copyToClipboard = () => {
		if (!output) {
			return;
		}
		navigator.clipboard.writeText(output);
		setIsCopied(true);
		toast.success("Logs copied to clipboard");
		setTimeout(() => setIsCopied(false), 2000);
	};

	return (
		<div className="container mx-auto max-w-7xl px-4 py-8">
			<PageHeader
				description="Manage and reset the development database."
				title="Database Tools"
			/>

			<div className="mt-6 grid gap-6 md:grid-cols-2">
				{/* SAFE ZONE - PROD SEED */}
				<Card className="border-emerald-500/20">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-emerald-500">
							<ShieldCheck className="h-5 w-5" />
							Safe Maintenance
						</CardTitle>
						<CardDescription>
							Update system data (roles, apps, plans) without deleting any user
							data.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="mb-6 text-muted-foreground text-sm">
							Use this to sync new system roles or application settings to your
							database. Safe to run anytime.
						</div>

						<Button
							className="w-full border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-500 sm:w-auto"
							disabled={isLoading}
							onClick={() => setConfirmMode("prod")}
							variant="outline"
						>
							<Play className="mr-2 h-4 w-4" />
							Run Safe Update
						</Button>
					</CardContent>
				</Card>

				{/* DANGER ZONE - DEV SEED */}
				<Card className="border-destructive/50 bg-destructive/5">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-destructive">
							<AlertTriangle className="h-5 w-5" />
							Danger Zone
						</CardTitle>
						<CardDescription>
							Actions here are destructive and cannot be undone.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="mb-6 text-destructive text-sm">
							<strong>Warning:</strong> Seeding the database will permanently
							delete all data (users, orgs, content) and reset it to the initial
							demo state.
						</p>

						<Button
							className="w-full sm:w-auto"
							disabled={isLoading}
							onClick={() => setConfirmMode("dev")}
							variant="destructive"
						>
							<Database className="mr-2 h-4 w-4" />
							Reset & Seed Database
						</Button>
					</CardContent>
				</Card>

				<Card className="md:col-span-2">
					<CardHeader className="flex flex-row items-center justify-between">
						<CardTitle className="flex items-center gap-2">
							<Terminal className="h-5 w-5" />
							Output Log
						</CardTitle>
						<Button
							className="h-8 w-8"
							disabled={!output}
							onClick={copyToClipboard}
							size="icon"
							title="Copy logs"
							variant="outline"
						>
							{isCopied ? (
								<Check className="h-4 w-4" />
							) : (
								<Copy className="h-4 w-4" />
							)}
						</Button>
					</CardHeader>
					<CardContent>
						<div className="h-[400px] overflow-auto whitespace-pre-wrap rounded-md border border-zinc-800 bg-zinc-950 p-4 font-mono text-emerald-400 text-xs shadow-inner">
							{output || "// Ready to executes command..."}
						</div>
					</CardContent>
				</Card>
			</div>

			<ConfirmDialog
				confirmLabel={
					confirmMode === "prod" ? "Yes, Update System" : "Yes, Wipe Everything"
				}
				description={
					confirmMode === "prod"
						? "This will update system roles and applications. No user data will be deleted."
						: "This will PERMANENTLY DELETE all data and reset the database to the demo state. This cannot be undone."
				}
				isLoading={isLoading}
				onConfirm={() => {
					if (confirmMode) {
						executeSeed(confirmMode);
					}
				}}
				onOpenChange={(open) => !open && setConfirmMode(null)}
				open={!!confirmMode}
				title={
					confirmMode === "prod"
						? "Start Safe Update?"
						: "Reset Entire Database?"
				}
				variant={confirmMode === "prod" ? "default" : "destructive"}
			/>
		</div>
	);
}
