import twilio from "twilio";
import type { SendResult, WhatsAppPayload } from "../../types";
import type { WhatsAppProvider } from "../types";

export type TwilioWhatsAppConfig = {
  accountSid: string;
  authToken: string;
  fromNumber: string;
};

export function createTwilioWhatsAppProvider(
  config: TwilioWhatsAppConfig
): WhatsAppProvider {
  const client = twilio(config.accountSid, config.authToken);

  return {
    name: "twilio-whatsapp",
    channel: "whatsapp",

    async send(payload: WhatsAppPayload): Promise<SendResult> {
      try {
        // WhatsApp numbers need 'whatsapp:' prefix
        const to = payload.to.startsWith("whatsapp:")
          ? payload.to
          : `whatsapp:${payload.to}`;
        const from = config.fromNumber.startsWith("whatsapp:")
          ? config.fromNumber
          : `whatsapp:${config.fromNumber}`;

        const message = await client.messages.create({
          body: payload.body,
          to,
          from,
        });

        return {
          success: true,
          messageId: message.sid,
          provider: "twilio-whatsapp",
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        const isRetryable =
          message.includes("timeout") || message.includes("rate limit");

        return {
          success: false,
          provider: "twilio-whatsapp",
          error: {
            code: "sendFailed",
            message,
            retryable: isRetryable,
          },
        };
      }
    },

    validatePayload(payload: WhatsAppPayload): boolean {
      return Boolean(payload.to && payload.body);
    },
  };
}
