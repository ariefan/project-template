"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Badge } from "@workspace/ui/components/badge";
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
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@workspace/ui/components/dialog";
import { Field, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { Spinner } from "@workspace/ui/components/spinner";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@workspace/ui/components/table";
import { Textarea } from "@workspace/ui/components/textarea";
import { format } from "date-fns";
import {
	Ban,
	Key,
	LogOut,
	Monitor,
	ShieldOff,
	Trash2,
	Unlock,
} from "lucide-react";
import { useState } from "react";
import { authClient } from "@/lib/auth";

interface UserAdminActionsCardProps {
	userId: string;
	userName: string;
	userEmail: string;
	isBanned?: boolean;
	banReason?: string | null;
	banExpires?: Date | null;
	isCurrentUser: boolean;
	canManage: boolean;
}

interface UserSession {
	id: string;
	userAgent?: string;
	ipAddress?: string;
	createdAt: string;
	expiresAt: string;
}

/**
 * Admin actions card for user management.
 * Provides ban/unban, password reset, session management, and delete user actions.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: legacy component
export function UserAdminActionsCard({
	userId,
	userName,
	userEmail,
	isBanned = false,
	banReason,
	banExpires,
	isCurrentUser,
	canManage,
}: UserAdminActionsCardProps) {
	// Dialog states
	const [banDialogOpen, setBanDialogOpen] = useState(false);
	const [banReasonInput, setBanReasonInput] = useState("");
	const [banDurationInput, setBanDurationInput] = useState("");
	const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [sessionsDialogOpen, setSessionsDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [deleteConfirmInput, setDeleteConfirmInput] = useState("");

	// Error states
	const [actionError, setActionError] = useState<string | null>(null);

	// Fetch user sessions
	const {
		data: sessionsData,
		isLoading: sessionsLoading,
		refetch: refetchSessions,
	} = useQuery({
		queryKey: ["user-sessions", userId],
		queryFn: async () => {
			const result = await authClient.admin.listUserSessions({ userId });
			if (result.error) {
				throw new Error(result.error.message);
			}
			return result.data as UserSession[];
		},
		enabled: sessionsDialogOpen,
	});

	// Ban user mutation
	const banMutation = useMutation({
		mutationFn: async () => {
			const banOptions: {
				userId: string;
				reason?: string;
				expiresIn?: number;
			} = {
				userId,
			};
			if (banReasonInput.trim()) {
				banOptions.reason = banReasonInput.trim();
			}
			if (banDurationInput.trim()) {
				// Convert hours to seconds
				const hours = Number.parseInt(banDurationInput, 10);
				if (!Number.isNaN(hours) && hours > 0) {
					banOptions.expiresIn = hours * 60 * 60;
				}
			}
			const result = await authClient.admin.banUser(banOptions);
			if (result.error) {
				throw new Error(result.error.message || "Failed to ban user");
			}
			return result;
		},
		onSuccess: () => {
			setBanDialogOpen(false);
			setBanReasonInput("");
			setBanDurationInput("");
			setActionError(null);
			// Force page refresh to update UI
			window.location.reload();
		},
		onError: (err: Error) => {
			setActionError(err.message);
		},
	});

	// Unban user mutation
	const unbanMutation = useMutation({
		mutationFn: async () => {
			const result = await authClient.admin.unbanUser({ userId });
			if (result.error) {
				throw new Error(result.error.message || "Failed to unban user");
			}
			return result;
		},
		onSuccess: () => {
			setActionError(null);
			window.location.reload();
		},
		onError: (err: Error) => {
			setActionError(err.message);
		},
	});

	// Set password mutation
	const setPasswordMutation = useMutation({
		mutationFn: async () => {
			if (newPassword !== confirmPassword) {
				throw new Error("Passwords do not match");
			}
			if (newPassword.length < 8) {
				throw new Error("Password must be at least 8 characters");
			}
			const result = await authClient.admin.setUserPassword({
				userId,
				newPassword,
			});
			if (result.error) {
				throw new Error(result.error.message || "Failed to set password");
			}
			return result;
		},
		onSuccess: () => {
			setPasswordDialogOpen(false);
			setNewPassword("");
			setConfirmPassword("");
			setActionError(null);
		},
		onError: (err: Error) => {
			setActionError(err.message);
		},
	});

	// Revoke session mutation
	const revokeSessionMutation = useMutation({
		mutationFn: async (sessionToken: string) => {
			const result = await authClient.admin.revokeUserSession({
				sessionToken,
			});
			if (result.error) {
				throw new Error(result.error.message || "Failed to revoke session");
			}
			return result;
		},
		onSuccess: () => {
			refetchSessions();
		},
	});

	// Revoke all sessions mutation
	const revokeAllSessionsMutation = useMutation({
		mutationFn: async () => {
			const result = await authClient.admin.revokeUserSessions({ userId });
			if (result.error) {
				throw new Error(result.error.message || "Failed to revoke sessions");
			}
			return result;
		},
		onSuccess: () => {
			refetchSessions();
		},
	});

	// Delete user mutation
	const deleteMutation = useMutation({
		mutationFn: async () => {
			const result = await authClient.admin.removeUser({ userId });
			if (result.error) {
				throw new Error(result.error.message || "Failed to delete user");
			}
			return result;
		},
		onSuccess: () => {
			// Redirect to users list after deletion
			window.location.href = "/admin/users";
		},
		onError: (err: Error) => {
			setActionError(err.message);
		},
	});

	if (!canManage) {
		return null;
	}

	const sessions = sessionsData ?? [];

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<ShieldOff className="size-5" />
						Admin Actions
					</CardTitle>
					<CardDescription>
						Manage user access, security, and account status
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{actionError && (
						<div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
							{actionError}
						</div>
					)}

					{/* Ban Status */}
					{isBanned && (
						<div className="rounded-md border border-destructive/50 bg-destructive/5 p-3">
							<div className="flex items-center justify-between">
								<div>
									<Badge variant="destructive">Banned</Badge>
									{banReason && (
										<p className="mt-1 text-muted-foreground text-sm">
											Reason: {banReason}
										</p>
									)}
									{banExpires && (
										<p className="text-muted-foreground text-sm">
											Expires: {format(new Date(banExpires), "PPp")}
										</p>
									)}
								</div>
								<Button
									disabled={unbanMutation.isPending}
									onClick={() => unbanMutation.mutate()}
									size="sm"
									variant="outline"
								>
									{unbanMutation.isPending ? (
										<Spinner className="mr-2" />
									) : (
										<Unlock className="mr-2 size-4" />
									)}
									Unban User
								</Button>
							</div>
						</div>
					)}

					{/* Action Buttons */}
					<div className="grid gap-2 sm:grid-cols-2">
						{/* Ban User */}
						{!(isBanned || isCurrentUser) && (
							<Button
								className="justify-start"
								onClick={() => setBanDialogOpen(true)}
								variant="outline"
							>
								<Ban className="mr-2 size-4" />
								Ban User
							</Button>
						)}

						{/* Reset Password */}
						<Button
							className="justify-start"
							onClick={() => setPasswordDialogOpen(true)}
							variant="outline"
						>
							<Key className="mr-2 size-4" />
							Reset Password
						</Button>

						{/* Manage Sessions */}
						<Button
							className="justify-start"
							onClick={() => setSessionsDialogOpen(true)}
							variant="outline"
						>
							<Monitor className="mr-2 size-4" />
							Manage Sessions
						</Button>

						{/* Delete User */}
						{!isCurrentUser && (
							<Button
								className="justify-start text-destructive hover:text-destructive"
								onClick={() => setDeleteDialogOpen(true)}
								variant="outline"
							>
								<Trash2 className="mr-2 size-4" />
								Delete User
							</Button>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Ban User Dialog */}
			<Dialog onOpenChange={setBanDialogOpen} open={banDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Ban User</DialogTitle>
						<DialogDescription>
							Ban {userName} from accessing the application. They will not be
							able to log in while banned.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<Field>
							<FieldLabel>Reason (optional)</FieldLabel>
							<Textarea
								onChange={(e) => setBanReasonInput(e.target.value)}
								placeholder="Violation of terms of service..."
								value={banReasonInput}
							/>
						</Field>
						<Field>
							<FieldLabel>Duration in hours (optional)</FieldLabel>
							<Input
								onChange={(e) => setBanDurationInput(e.target.value)}
								placeholder="Leave empty for permanent ban"
								type="number"
								value={banDurationInput}
							/>
						</Field>
					</div>
					<DialogFooter>
						<Button onClick={() => setBanDialogOpen(false)} variant="outline">
							Cancel
						</Button>
						<Button
							disabled={banMutation.isPending}
							onClick={() => banMutation.mutate()}
							variant="destructive"
						>
							{banMutation.isPending && <Spinner className="mr-2" />}
							Ban User
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Reset Password Dialog */}
			<Dialog onOpenChange={setPasswordDialogOpen} open={passwordDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Reset Password</DialogTitle>
						<DialogDescription>
							Set a new password for {userName}. They will need to use this
							password to log in.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<Field>
							<FieldLabel>New Password</FieldLabel>
							<Input
								onChange={(e) => setNewPassword(e.target.value)}
								placeholder="••••••••"
								type="password"
								value={newPassword}
							/>
						</Field>
						<Field>
							<FieldLabel>Confirm Password</FieldLabel>
							<Input
								onChange={(e) => setConfirmPassword(e.target.value)}
								placeholder="••••••••"
								type="password"
								value={confirmPassword}
							/>
						</Field>
					</div>
					<DialogFooter>
						<Button
							onClick={() => setPasswordDialogOpen(false)}
							variant="outline"
						>
							Cancel
						</Button>
						<Button
							disabled={
								setPasswordMutation.isPending ||
								!newPassword ||
								!confirmPassword
							}
							onClick={() => setPasswordMutation.mutate()}
						>
							{setPasswordMutation.isPending && <Spinner className="mr-2" />}
							Set Password
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Sessions Dialog */}
			<Dialog onOpenChange={setSessionsDialogOpen} open={sessionsDialogOpen}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Active Sessions</DialogTitle>
						<DialogDescription>
							View and manage active sessions for {userName}
						</DialogDescription>
					</DialogHeader>
					{sessionsLoading && (
						<div className="flex justify-center py-8">
							<Spinner />
						</div>
					)}
					{!sessionsLoading && sessions.length === 0 && (
						<p className="py-8 text-center text-muted-foreground">
							No active sessions found
						</p>
					)}
					{!sessionsLoading && sessions.length > 0 && (
						<div className="max-h-[400px] overflow-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Device</TableHead>
										<TableHead>IP Address</TableHead>
										<TableHead>Created</TableHead>
										<TableHead>Expires</TableHead>
										<TableHead />
									</TableRow>
								</TableHeader>
								<TableBody>
									{sessions.map((session) => (
										<TableRow key={session.id}>
											<TableCell className="max-w-[200px] truncate text-sm">
												{session.userAgent || "Unknown device"}
											</TableCell>
											<TableCell className="text-sm">
												{session.ipAddress || "Unknown"}
											</TableCell>
											<TableCell className="text-sm">
												{format(new Date(session.createdAt), "MMM d, HH:mm")}
											</TableCell>
											<TableCell className="text-sm">
												{format(new Date(session.expiresAt), "MMM d, HH:mm")}
											</TableCell>
											<TableCell>
												<Button
													disabled={revokeSessionMutation.isPending}
													onClick={() =>
														revokeSessionMutation.mutate(session.id)
													}
													size="icon"
													variant="ghost"
												>
													<LogOut className="size-4" />
												</Button>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
					<DialogFooter>
						<Button
							onClick={() => setSessionsDialogOpen(false)}
							variant="outline"
						>
							Close
						</Button>
						{sessions.length > 0 && (
							<Button
								disabled={revokeAllSessionsMutation.isPending}
								onClick={() => revokeAllSessionsMutation.mutate()}
								variant="destructive"
							>
								{revokeAllSessionsMutation.isPending && (
									<Spinner className="mr-2" />
								)}
								Revoke All Sessions
							</Button>
						)}
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete User Confirmation */}
			<AlertDialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete User</AlertDialogTitle>
						<AlertDialogDescription>
							This action cannot be undone. This will permanently delete{" "}
							<strong>{userName}</strong> ({userEmail}) and remove all their
							data.
							<br />
							<br />
							Type <strong>DELETE</strong> to confirm.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<Input
						onChange={(e) => setDeleteConfirmInput(e.target.value)}
						placeholder="Type DELETE to confirm"
						value={deleteConfirmInput}
					/>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							disabled={
								deleteConfirmInput !== "DELETE" || deleteMutation.isPending
							}
							onClick={() => deleteMutation.mutate()}
						>
							{deleteMutation.isPending && <Spinner className="mr-2" />}
							Delete User
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
