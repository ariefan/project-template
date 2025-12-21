/**
 * Email service interface for auth operations
 * Implementations should use the notification system
 */
export type EmailService = {
  sendPasswordReset(email: string, resetUrl: string): Promise<void>;
  sendEmailVerification(email: string, verificationUrl: string): Promise<void>;
  sendMagicLink(email: string, magicLinkUrl: string): Promise<void>;
  sendOrganizationInvitation(
    email: string,
    organizationName: string,
    inviterName: string,
    invitationLink: string
  ): Promise<void>;
  sendTwoFactorCode(email: string, code: string): Promise<void>;
};

/**
 * Creates a no-op email service that logs to console
 * Use this for development when no email provider is configured
 */
export function createConsoleEmailService(): EmailService {
  return {
    sendPasswordReset(email: string, resetUrl: string) {
      console.log(`[AUTH] Password reset for ${email}: ${resetUrl}`);
      return Promise.resolve();
    },
    sendEmailVerification(email: string, verificationUrl: string) {
      console.log(`[AUTH] Verification for ${email}: ${verificationUrl}`);
      return Promise.resolve();
    },
    sendMagicLink(email: string, magicLinkUrl: string) {
      console.log(`[AUTH] Magic link for ${email}: ${magicLinkUrl}`);
      return Promise.resolve();
    },
    sendOrganizationInvitation(
      email: string,
      organizationName: string,
      inviterName: string,
      invitationLink: string
    ) {
      console.log(
        `[AUTH] Org invitation for ${email} to ${organizationName} from ${inviterName}: ${invitationLink}`
      );
      return Promise.resolve();
    },
    sendTwoFactorCode(email: string, code: string) {
      console.log(`[AUTH] 2FA code for ${email}: ${code}`);
      return Promise.resolve();
    },
  };
}
