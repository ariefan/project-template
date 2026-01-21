"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { format } from "date-fns";
import { ChevronRight, CreditCard, History, Zap } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layouts/page-header";
import { UsageBar } from "@/components/subscriptions/usage-bar";
import { useCurrentSubscription } from "@/hooks/use-subscriptions";

export default function SubscriptionDashboard() {
	const { data: response, isLoading } = useCurrentSubscription();
	const subscription =
		response && !("error" in response) ? response.data : null;

	if (isLoading) {
		return (
			<div className="mx-auto max-w-5xl space-y-8 p-8">
				<div className="flex items-end justify-between">
					<div className="space-y-2">
						<Skeleton className="h-10 w-64" />
						<Skeleton className="h-4 w-96" />
					</div>
				</div>
				<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
					<Skeleton className="col-span-2 h-48" />
					<Skeleton className="h-48" />
				</div>
			</div>
		);
	}

	if (!subscription) {
		return (
			<div className="mx-auto max-w-4xl p-8">
				<Card className="border-2 border-dashed bg-muted/30">
					<CardContent className="flex flex-col items-center space-y-6 pt-12 pb-12 text-center">
						<div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
							<Zap className="h-8 w-8 text-primary" />
						</div>
						<div className="space-y-2">
							<h2 className="font-bold text-2xl uppercase italic tracking-tight underline decoration-4 decoration-primary underline-offset-4">
								Unlock Your Potential
							</h2>
							<p className="max-w-sm text-muted-foreground">
								You don't have an active subscription. Upgrade today to access
								premium features and scale your productivity.
							</p>
						</div>
						<Button
							asChild
							className="px-8 font-bold shadow-primary/20 shadow-xl"
							size="lg"
						>
							<Link href="/pricing">View Pricing Plans</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	const isCanceled = subscription.status === "canceled";
	// const _isTrial = subscription.status === "trialing";

	return (
		<div className="mx-auto max-w-6xl space-y-8 p-8">
			<PageHeader
				actions={
					<Button className="gap-2 font-semibold" variant="outline">
						<History className="h-4 w-4" />
						Billing History
					</Button>
				}
				description="Manage your organization's subscription and track usage."
				title="Billing & Subscription"
			/>

			<div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
				{/* Active Plan Card */}
				<Card className="overflow-hidden border-border/50 shadow-sm lg:col-span-2">
					<div className="absolute top-0 left-0 h-full w-1 bg-primary" />
					<CardHeader className="flex flex-row items-start justify-between">
						<div className="space-y-1">
							<CardDescription className="font-bold text-primary/70 text-xs uppercase tracking-widest">
								Current Plan
							</CardDescription>
							<CardTitle className="font-black text-3xl">
								{subscription.plan?.name ?? "Unknown Plan"}
							</CardTitle>
						</div>
						<Badge
							className="px-3 py-1 font-bold uppercase tracking-tighter"
							variant={isCanceled ? "destructive" : "secondary"}
						>
							{subscription.status}
						</Badge>
					</CardHeader>
					<CardContent className="space-y-6 pt-2">
						<div className="flex items-center gap-6 text-sm">
							<div className="space-y-1">
								<p className="text-muted-foreground">Amount</p>
								<p className="font-bold text-lg">
									${(subscription.plan?.priceCents ?? 0) / 100} /{" "}
									{subscription.plan?.billingPeriod ?? "mo"}
								</p>
							</div>
							<div className="h-10 w-px bg-border/50" />
							<div className="space-y-1">
								<p className="text-muted-foreground">Next Invoice</p>
								<p className="font-bold text-lg">
									{subscription.currentPeriodEnd
										? format(
												new Date(subscription.currentPeriodEnd),
												"MMM dd, yyyy",
											)
										: "N/A"}
								</p>
							</div>
						</div>

						{isCanceled && subscription.currentPeriodEnd && (
							<div className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/10 p-4">
								<p className="font-medium text-destructive text-sm">
									Your subscription will end on{" "}
									{format(new Date(subscription.currentPeriodEnd), "MMM dd")}.
								</p>
								<Button className="font-bold" size="sm" variant="destructive">
									Resume Subscription
								</Button>
							</div>
						)}

						<div className="flex flex-wrap gap-3 border-border/40 border-t pt-4">
							<Button
								asChild
								className="font-extrabold shadow-lg shadow-primary/10"
							>
								<Link className="gap-2" href="/pricing">
									Change Plan <ChevronRight className="h-4 w-4" />
								</Link>
							</Button>
							{!isCanceled && (
								<Button
									className="font-semibold text-muted-foreground hover:text-destructive"
									variant="ghost"
								>
									Cancel Subscription
								</Button>
							)}
						</div>
					</CardContent>
				</Card>

				{/* Usage Card */}
				<Card className="border-border/50 shadow-sm">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-lg uppercase italic tracking-tighter underline decoration-2 decoration-primary/40 underline-offset-4">
							Plan Usage
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-8">
						<UsageBar
							current={1250}
							label="API Requests"
							limit={5000}
							unit="req"
						/>
						<UsageBar current={420} label="Storage" limit={500} unit="MB" />
						<UsageBar current={8} label="Team Members" limit={10} />
					</CardContent>
				</Card>
			</div>

			{/* Payment Method Stub */}
			<Card className="border-primary/20 bg-primary/5">
				<CardContent className="flex flex-col items-center justify-between gap-6 p-6 md:flex-row">
					<div className="flex items-center gap-4">
						<div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border/50 bg-background shadow-inner">
							<CreditCard className="h-6 w-6 text-foreground/70" />
						</div>
						<div>
							<p className="font-extrabold text-lg uppercase italic tracking-tighter">
								Payment Method
							</p>
							<p className="select-none font-medium text-muted-foreground text-sm italic">
								Visa ending in 4242 (Expired? Upgrade now!)
							</p>
						</div>
					</div>
					<Button
						className="h-11 px-8 font-bold hover:bg-background"
						variant="outline"
					>
						Update Payment Method
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
