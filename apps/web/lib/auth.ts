import {
	type AuthClient,
	createAuthClientInstance,
} from "@workspace/auth/client";
import { env } from "@/lib/env";

/**
 * Auth client instance for the web app.
 *
 * Uses Better Auth with all configured plugins:
 * - Organization management
 * - Two-factor authentication
 * - Passkey (WebAuthn)
 * - Magic link
 * - Admin controls
 * - API key management
 * - SSO
 *
 * The baseURL is read from validated environment configuration.
 */
export const authClient = createAuthClientInstance({
	baseURL: env.NEXT_PUBLIC_API_URL,
}) as AuthClient & {
	organization: {
		create: (params: {
			name: string;
			slug: string;
			logo?: string;
			metadata?: Record<string, any>;
		}) => Promise<{ data: any; error: any }>;
		update: (params: {
			organizationId: string;
			data: {
				name?: string;
				slug?: string;
				logo?: string;
				metadata?: Record<string, any>;
			};
		}) => Promise<{ data: any; error: any }>;
		list: (params?: { query?: any; fetchOptions?: any }) => Promise<any>;
		getFullOrganization: (params: {
			query: { organizationId: string };
		}) => Promise<any>;
		listInvitations: (params: {
			query: { organizationId: string };
		}) => Promise<any>;
		inviteMember: (params: {
			email: string;
			role: string;
			organizationId: string;
		}) => Promise<any>;
		cancelInvitation: (params: { invitationId: string }) => Promise<any>;
		updateMemberRole: (params: {
			memberId: string;
			role: string;
		}) => Promise<{ data: any; error: any }>;
		removeMember: (params: {
			memberIdOrEmail: string;
		}) => Promise<{ data: any; error: any }>;
		leave: (params: {
			organizationId: string;
		}) => Promise<{ data: any; error: any }>;
		delete: (params: {
			organizationId: string;
		}) => Promise<{ data: any; error: any }>;
		useListMembers: (params: { organizationId: string }) => {
			data: any;
			isPending: boolean;
		};
	};
	admin: {
		impersonateUser: (params: { userId: string }) => Promise<any>;
		setRole: (params: { userId: string; role: string }) => Promise<any>;
		listUsers: (params?: any) => Promise<any>;
		removeUser: (params: { userId: string }) => Promise<any>;
		getUser: (params: { userId: string }) => Promise<any>;
		createUser: (params: {
			email: string;
			password?: string;
			name?: string;
			role?: string;
			data?: Record<string, any>;
		}) => Promise<any>;
		listUserSessions: (params: { userId: string }) => Promise<any>;
		banUser: (params: {
			userId: string;
			reason?: string;
			expiresIn?: number;
		}) => Promise<any>;
		unbanUser: (params: { userId: string }) => Promise<any>;
		setUserPassword: (params: {
			userId: string;
			newPassword: string;
		}) => Promise<any>;
		revokeUserSession: (params: { sessionToken: string }) => Promise<any>;
		revokeUserSessions: (params: { userId: string }) => Promise<any>;
	};
	sso: {
		register: (params: any) => Promise<{ data: any; error: any }>;
	};
};

/**
 * Export commonly used auth functions and hooks.
 *
 * - signIn: Sign in with various methods (email, social, passkey, etc.)
 * - signOut: Sign out the current user
 * - signUp: Register a new user
 * - useSession: React hook to get the current session (client-side)
 */
export const {
	signIn,
	signOut,
	signUp,
	useSession,
	// Organization methods
	organization,
	useActiveOrganization,
	useListOrganizations,
} = authClient;

/**
 * Password reset - use authClient.forgetPassword() and authClient.resetPassword()
 * Email verification - use authClient.emailVerification.sendVerificationEmail()
 *
 * These are accessed directly through the authClient to get proper type inference.
 */

/**
 * Type exports for use in components
 */
export type Session = NonNullable<ReturnType<typeof useSession>["data"]>;
