/**
 * SMS service interface for auth operations
 * Implementations should use the notification system
 */
export type SmsService = {
  sendOTP(phoneNumber: string, code: string): Promise<void>;
  sendVerification(phoneNumber: string, code: string): Promise<void>;
};

/**
 * Creates a no-op SMS service that logs to console
 * Use this for development when no SMS provider is configured
 */
export function createConsoleSmsService(): SmsService {
  return {
    sendOTP(phoneNumber: string, code: string) {
      console.log(`[AUTH] OTP for ${phoneNumber}: ${code}`);
      return Promise.resolve();
    },
    sendVerification(phoneNumber: string, code: string) {
      console.log(`[AUTH] Verification for ${phoneNumber}: ${code}`);
      return Promise.resolve();
    },
  };
}
