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
  baseURL: string;
};

export function createAuthClientInstance(config?: Partial<AuthClientConfig>) {
  return createAuthClient({
    baseURL:
      config?.baseURL ??
      process.env.NEXT_PUBLIC_API_URL ??
      "http://localhost:3001",
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

// Default auth client
export const authClient = createAuthClientInstance();

// Auth methods
export const { signIn, signOut, signUp, useSession } = authClient;
