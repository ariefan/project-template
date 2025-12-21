import { Resend } from "resend";
import type { EmailPayload, SendResult } from "../../types";
import type { EmailProvider } from "../types";

function isRetryableError(error: { name: string }): boolean {
  const nonRetryable = ["validation_error", "invalid_api_key"];
  return !nonRetryable.includes(error.name);
}

export function createResendProvider(
  apiKey: string,
  defaultFrom?: string
): EmailProvider {
  const resend = new Resend(apiKey);

  return {
    name: "resend",
    channel: "email",

    async send(payload: EmailPayload): Promise<SendResult> {
      const from = payload.from ?? defaultFrom;
      if (!from) {
        return {
          success: false,
          provider: "resend",
          error: {
            code: "missingFrom",
            message: "No from address specified",
            retryable: false,
          },
        };
      }

      try {
        const result = await resend.emails.send({
          from,
          to: payload.to,
          subject: payload.subject,
          text: payload.body,
          html: payload.html,
          replyTo: payload.replyTo,
          cc: payload.cc,
          bcc: payload.bcc,
        });

        if (result.error) {
          return {
            success: false,
            provider: "resend",
            error: {
              code: result.error.name,
              message: result.error.message,
              retryable: isRetryableError(result.error),
            },
          };
        }

        return {
          success: true,
          messageId: result.data?.id,
          provider: "resend",
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return {
          success: false,
          provider: "resend",
          error: {
            code: "sendFailed",
            message,
            retryable: true,
          },
        };
      }
    },

    validatePayload(payload: EmailPayload): boolean {
      return Boolean(payload.to && payload.subject && payload.body);
    },
  };
}
