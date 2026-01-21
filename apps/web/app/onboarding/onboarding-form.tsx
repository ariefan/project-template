"use client";

import { Button } from "@workspace/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@workspace/ui/components/card";
import { LogOut, Rocket } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CreateOrganizationForm } from "@/components/organizations/create-organization-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOut } from "@/lib/auth";

export default function OnboardingForm() {
	const router = useRouter();

	const handleSignOut = async () => {
		await signOut();
		router.push("/login");
	};

	return (
		<div className="relative flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
			<div className="absolute top-4 right-4 flex items-center gap-2">
				<ThemeToggle />
				<Button
					onClick={handleSignOut}
					size="icon"
					title="Sign Out"
					variant="ghost"
				>
					<LogOut className="h-[1.2rem] w-[1.2rem]" />
				</Button>
			</div>

			<div className="mb-8 space-y-2 text-center">
				<div className="mx-auto mb-4 w-fit rounded-full bg-primary/10 p-3 text-primary">
					<Rocket className="h-8 w-8" />
				</div>
				<h1 className="font-bold text-3xl tracking-tight">
					Welcome to Acme Inc
				</h1>
				<p className="mx-auto max-w-md text-muted-foreground">
					To get started, let's create your first workspace. This is where your
					team will collaborate and manage resources.
				</p>
			</div>

			<Card className="w-full max-w-lg border-primary/20 shadow-xl">
				<CardHeader>
					<CardTitle>Create Workspace</CardTitle>
					<CardDescription>
						Give your workspace a name. You can change this later.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<CreateOrganizationForm />
				</CardContent>
			</Card>

			<p className="mt-8 text-center text-muted-foreground text-sm">
				Already have an invite? Check your email or{" "}
				<button
					className="underline hover:text-primary"
					onClick={() =>
						toast.info("Check your email for the invitation link!")
					}
					type="button"
				>
					check pending invites
				</button>
				.
			</p>
		</div>
	);
}
