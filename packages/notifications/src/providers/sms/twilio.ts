import twilio from "twilio";
import type { SendResult, SmsPayload } from "../../types";
import type { SmsProvider } from "../types";

export type TwilioSmsConfig = {
  accountSid: string;
  authToken: string;
  fromNumber: string;
};

export function createTwilioSmsProvider(config: TwilioSmsConfig): SmsProvider {
  const client = twilio(config.accountSid, config.authToken);

  return {
    name: "twilio-sms",
    channel: "sms",

    async send(payload: SmsPayload): Promise<SendResult> {
      try {
        const message = await client.messages.create({
          body: payload.body,
          to: payload.to,
          from: payload.from ?? config.fromNumber,
        });

        return {
          success: true,
          messageId: message.sid,
          provider: "twilio-sms",
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        const isRetryable =
          message.includes("timeout") || message.includes("rate limit");

        return {
          success: false,
          provider: "twilio-sms",
          error: {
            code: "sendFailed",
            message,
            retryable: isRetryable,
          },
        };
      }
    },

    validatePayload(payload: SmsPayload): boolean {
      return Boolean(payload.to && payload.body);
    },
  };
}
