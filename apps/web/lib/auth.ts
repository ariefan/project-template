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
export const authClient: AuthClient = createAuthClientInstance({
  baseURL: env.NEXT_PUBLIC_API_URL,
});

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
