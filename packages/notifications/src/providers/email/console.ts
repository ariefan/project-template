import type { EmailPayload, SendResult } from "../../types";
import type { EmailProvider } from "../types";

/**
 * Console Email Provider (Development/Testing)
 *
 * This provider logs email notifications to the console instead of sending them.
 * Perfect for:
 * - Development without email API keys
 * - Testing in-app notifications without external services
 * - CI/CD environments
 *
 * The notification is still saved to the database and appears in the UI,
 * but no actual email is sent.
 */
export function createConsoleProvider(defaultFrom?: string): EmailProvider {
  return {
    name: "console",
    channel: "email",

    validatePayload(payload: EmailPayload): boolean {
      return Boolean(payload.to && payload.subject && payload.body);
    },

    send(payload: EmailPayload): Promise<SendResult> {
      if (!this.validatePayload(payload)) {
        return Promise.resolve({
          success: false,
          provider: "console",
          error: {
            code: "invalidPayload",
            message: "Email payload is missing required fields",
            retryable: false,
          },
        });
      }

      // Log to console for development visibility
      console.log("📧 [Console Email Provider]");
      console.log(
        "From:",
        payload.from || defaultFrom || "noreply@example.com"
      );
      console.log("To:", payload.to);
      console.log("Subject:", payload.subject);
      console.log("Body:", `${payload.body.substring(0, 100)}...`);
      if (payload.html) {
        console.log("HTML:", `${payload.html.substring(0, 100)}...`);
      }
      console.log("---");

      // Return success - the notification is saved to DB and appears in-app
      return Promise.resolve({
        success: true,
        provider: "console",
        messageId: `console-${Date.now()}`,
      });
    },
  };
}
