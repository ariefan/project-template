import type { EmailService } from "./services/email";
import type { SmsService } from "./services/sms";

/**
 * OIDC client configuration for trusted first-party clients
 */
export type OIDCClient = {
  clientId: string;
  clientSecret?: string;
  type: "web" | "native" | "user-agent-based" | "public";
  redirectUrls: string[];
  name: string;
  metadata: Record<string, unknown> | null;
  disabled: boolean;
  skipConsent?: boolean;
};

/**
 * Social provider configurations
 */
export type SocialProviders = {
  github?: { clientId: string; clientSecret: string };
  google?: { clientId: string; clientSecret: string };
  // Add more providers as needed
};

/**
 * Auth configuration for the factory function
 */
export type AuthConfig = {
  /**
   * Base URL for the auth server (e.g., https://auth.example.com)
   */
  baseUrl: string;

  /**
   * Email service for sending auth emails
   */
  emailService: EmailService;

  /**
   * SMS service for phone authentication
   */
  smsService: SmsService;

  /**
   * Social OAuth providers
   */
  socialProviders?: SocialProviders;

  /**
   * OIDC trusted clients for cross-app authentication
   */
  trustedClients?: OIDCClient[];

  /**
   * Allowed origins for cross-domain requests
   */
  trustedOrigins?: string[];

  /**
   * Passkey (WebAuthn) configuration
   */
  passkey?: {
    rpID: string;
    rpName: string;
  };

  /**
   * App name for 2FA authenticator
   */
  appName?: string;

  /**
   * Environment (affects cookie security, etc.)
   */
  environment: "development" | "production" | "test";
};

/**
 * Parse cookie domain from URL for cross-subdomain sharing
 */
export function getCookieDomain(baseUrl: string): string | undefined {
  try {
    const url = new URL(baseUrl);
    const hostname = url.hostname;
    const parts = hostname.split(".");
    if (parts.length >= 2) {
      // e.g., "accounts.local" -> ".local", "accounts.mydomain.com" -> ".mydomain.com"
      return `.${parts.slice(-2).join(".")}`;
    }
    return;
  } catch {
    return;
  }
}
