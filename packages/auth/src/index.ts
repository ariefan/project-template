import { passkey } from "@better-auth/passkey";
import { sso } from "@better-auth/sso";
import bcrypt from "bcrypt";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  admin,
  anonymous,
  apiKey,
  bearer,
  magicLink,
  multiSession,
  oidcProvider,
  openAPI,
  phoneNumber,
  twoFactor,
  username,
} from "better-auth/plugins";
import { organization } from "better-auth/plugins/organization";
import { type AuthConfig, getCookieDomain } from "./config";

export type { AuthConfig, OIDCClient, SocialProviders } from "./config";
export {
  createConsoleEmailService,
  createConsoleSmsService,
  type EmailService,
  type SmsService,
} from "./services";

/**
 * Create a fully configured better-auth instance.
 *
 * Apps must create their own auth instance by calling this factory function
 * with the required configuration including a database instance.
 *
 * @example
 * ```ts
 * import { createAuth, createConsoleEmailService, createConsoleSmsService } from "@workspace/auth";
 * import { getDefaultDb } from "@workspace/db";
 *
 * const auth = createAuth({
 *   db: getDefaultDb(),
 *   baseUrl: env.BETTER_AUTH_URL,
 *   emailService: createConsoleEmailService(),
 *   smsService: createConsoleSmsService(),
 *   environment: env.NODE_ENV,
 * });
 * ```
 */
export function createAuth(config: AuthConfig): ReturnType<typeof betterAuth> {
  const {
    db,
    baseUrl,
    emailService,
    smsService,
    socialProviders,
    trustedClients,
    trustedOrigins,
    appName = "App",
    environment,
  } = config;

  const isProduction = environment === "production";
  const isTest = environment === "test";

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: isTest ? "sqlite" : "pg",
      usePlural: true,
    }),

    // Email/password authentication
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: isProduction,
      password: {
        hash: (password: string) => bcrypt.hash(password, 10),
        verify: ({ hash, password }: { hash: string; password: string }) =>
          bcrypt.compare(password, hash),
      },
      sendResetPassword: async ({
        user,
        url,
      }: {
        user: { email: string };
        url: string;
      }) => {
        await emailService.sendPasswordReset(user.email, url);
      },
      sendVerificationEmail: async ({
        user,
        url,
      }: {
        user: { email: string };
        url: string;
      }) => {
        await emailService.sendEmailVerification(user.email, url);
      },
    },

    // Social OAuth providers
    socialProviders: {
      github: socialProviders?.github,
      google: socialProviders?.google,
    },

    // Session configuration
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // Refresh session if older than 1 day
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5, // 5 minutes
      },
    },

    // Plugins
    plugins: [
      // Username authentication
      username(),

      // Anonymous users
      anonymous(),

      // Two-Factor Authentication
      twoFactor({
        issuer: appName,
      }),

      // Phone number authentication
      phoneNumber({
        sendOTP: async ({ phoneNumber: phone, code }) => {
          await smsService.sendOTP(phone, code);
        },
      }),

      // Magic link authentication
      magicLink({
        sendMagicLink: async (user, url) => {
          if (typeof user.email === "string" && typeof url === "string") {
            await emailService.sendMagicLink(user.email, url);
          }
        },
      }),

      // Passkey (WebAuthn)
      ...(config.passkey
        ? [
            passkey({
              rpID: config.passkey.rpID,
              rpName: config.passkey.rpName,
              origin: baseUrl,
            }),
          ]
        : []),

      // Admin - User/organization administration
      admin({
        defaultRole: "user",
        adminRoles: ["admin"],
        impersonationSessionDuration: 3600, // 1 hour
      }),

      // API Key Authentication
      apiKey(),

      // Organization - Multi-tenancy support
      organization({
        sendInvitationEmail: async (invitation) => {
          const organizationName =
            invitation.organization.name || "Organization";
          const inviterName = invitation.inviter.user.name || "Team Member";
          const invitationLink = `${baseUrl}/api/auth/organization/invitation/accept?token=${invitation.invitation.id}`;

          await emailService.sendOrganizationInvitation(
            invitation.email,
            organizationName,
            inviterName,
            invitationLink
          );
        },
        allowUserToCreateOrganization: true,
        organizationLimit: 5,
        membershipLimit: 100,
        invitationExpiresIn: 172_800, // 48 hours
        creatorRole: "owner",
      }),

      // OIDC Provider - Act as OpenID Connect provider for cross-app SSO
      ...(trustedClients && trustedClients.length > 0
        ? [
            oidcProvider({
              loginPage: "/login",
              consentPage: "/consent",
              trustedClients,
              allowDynamicClientRegistration: false,
            }),
          ]
        : []),

      // Enterprise SSO - Organizations can connect their own IdPs
      sso({
        organizationProvisioning: {
          disabled: false,
          defaultRole: "member",
        },
        domainVerification: {
          enabled: true,
        },
      }),

      // Bearer Token Authentication
      bearer(),

      // Multi-Session - Allow multiple active sessions per user
      multiSession(),

      // OpenAPI documentation
      openAPI({ path: "/docs" }),
    ],

    // Advanced configuration for cross-domain SSO
    advanced: {
      cookiePrefix: "auth",
      useSecureCookies: isProduction || baseUrl.startsWith("https"),
      crossSubDomainCookies: {
        enabled: true,
        domain: getCookieDomain(baseUrl),
      },
    },

    // Trusted origins for cross-domain requests
    trustedOrigins: trustedOrigins ?? [],
  });
}

// Export types for use across the app
export type Auth = ReturnType<typeof createAuth>;

/**
 * Session and User types - use with your auth instance:
 * @example
 * ```ts
 * const auth = createAuth({ ... });
 * type MySession = typeof auth.$Infer.Session;
 * type MyUser = typeof auth.$Infer.Session.user;
 * ```
 */
export type { Session, User } from "better-auth";
