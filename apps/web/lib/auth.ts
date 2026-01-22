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

// biome-ignore lint/suspicious/noExplicitAny: Internal better-auth results use any and are too complex to reproduce perfectly here
type AuthResponse<T = any> = Promise<{ data: T; error: any }>;

export const authClient = createAuthClientInstance({
  baseURL: env.NEXT_PUBLIC_API_URL,
}) as AuthClient & {
  organization: {
    create: (params: {
      name: string;
      slug: string;
      logo?: string;
      metadata?: Record<string, unknown>;
    }) => AuthResponse;
    update: (params: {
      organizationId: string;
      data: {
        name?: string;
        slug?: string;
        logo?: string;
        metadata?: Record<string, unknown>;
      };
    }) => AuthResponse;
    list: (params?: {
      // biome-ignore lint/suspicious/noExplicitAny: library types
      query: any;
      // biome-ignore lint/suspicious/noExplicitAny: library types
      fetchOptions: any;
      // biome-ignore lint/suspicious/noExplicitAny: library types
    }) => Promise<any>;
    getFullOrganization: (params: {
      query: { organizationId: string };
    }) => AuthResponse;
    listInvitations: (params: {
      query: { organizationId: string };
    }) => AuthResponse;
    inviteMember: (params: {
      email: string;
      role: string;
      organizationId: string;
    }) => AuthResponse;
    cancelInvitation: (params: { invitationId: string }) => AuthResponse;
    updateMemberRole: (params: {
      memberId: string;
      role: string;
    }) => AuthResponse;
    removeMember: (params: { memberIdOrEmail: string }) => AuthResponse;
    leave: (params: { organizationId: string }) => AuthResponse;
    delete: (params: { organizationId: string }) => AuthResponse;
    useListMembers: (params: { organizationId: string }) => {
      // biome-ignore lint/suspicious/noExplicitAny: library types
      data: any;
      isPending: boolean;
    };
  };
  admin: {
    impersonateUser: (params: { userId: string }) => AuthResponse;
    setRole: (params: { userId: string; role: string }) => AuthResponse;
    // biome-ignore lint/suspicious/noExplicitAny: library types
    listUsers: (params?: any) => AuthResponse;
    removeUser: (params: { userId: string }) => AuthResponse;
    getUser: (params: { userId: string }) => AuthResponse;
    createUser: (params: {
      email: string;
      password?: string;
      name?: string;
      role?: string;
      data?: Record<string, unknown>;
    }) => AuthResponse;
    listUserSessions: (params: { userId: string }) => AuthResponse;
    banUser: (params: {
      userId: string;
      reason?: string;
      expiresIn?: number;
    }) => AuthResponse;
    unbanUser: (params: { userId: string }) => AuthResponse;
    setUserPassword: (params: {
      userId: string;
      newPassword: string;
    }) => AuthResponse;
    revokeUserSession: (params: { sessionToken: string }) => AuthResponse;
    revokeUserSessions: (params: { userId: string }) => AuthResponse;
  };
  sso: {
    // biome-ignore lint/suspicious/noExplicitAny: library types
    register: (params: any) => AuthResponse;
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
