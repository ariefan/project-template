import { passkeyClient } from "@better-auth/passkey/client";
import { ssoClient } from "@better-auth/sso/client";
import {
  adminClient,
  anonymousClient,
  apiKeyClient,
  magicLinkClient,
  multiSessionClient,
  oidcClient,
  organizationClient,
  phoneNumberClient,
  twoFactorClient,
  usernameClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export type AuthClientConfig = {
  /** Base URL for the auth API (required, no fallback) */
  baseURL: string;
};

/**
 * Create an auth client instance for use in frontend apps.
 *
 * Apps must provide the baseURL explicitly - no environment variable fallbacks.
 *
 * @example
 * ```ts
 * // In apps/web/lib/auth.ts
 * import { createAuthClientInstance } from "@workspace/auth/client";
 *
 * export const authClient = createAuthClientInstance({
 *   baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
 * });
 *
 * export const { signIn, signOut, signUp, useSession } = authClient;
 * ```
 */
export function createAuthClientInstance(config: AuthClientConfig) {
  return createAuthClient({
    baseURL: config.baseURL,
    plugins: [
      // Username authentication
      usernameClient(),

      // Anonymous users
      anonymousClient(),

      // Two-Factor Authentication
      twoFactorClient(),

      // Phone number authentication
      phoneNumberClient(),

      // Magic link authentication
      magicLinkClient(),

      // Passkey (WebAuthn)
      passkeyClient(),

      // Admin controls
      adminClient(),

      // API Key management
      apiKeyClient(),

      // Organization management
      organizationClient(),

      // OIDC client
      oidcClient(),

      // Enterprise SSO
      ssoClient(),

      // Multi-session support
      multiSessionClient(),
    ],
  });
}

// Type export for the auth client instance
export type AuthClient = ReturnType<typeof createAuthClientInstance>;
