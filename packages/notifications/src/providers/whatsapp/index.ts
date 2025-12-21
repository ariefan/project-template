import type { NotificationServiceConfig } from "../../types";
import type { WhatsAppProvider } from "../types";
import { createTwilioWhatsAppProvider } from "./twilio";

export function createWhatsAppProvider(
  config: NotificationServiceConfig["whatsapp"]
): WhatsAppProvider | null {
  if (!config) {
    return null;
  }

  if (config.provider === "twilio" && config.twilio) {
    return createTwilioWhatsAppProvider({
      accountSid: config.twilio.accountSid,
      authToken: config.twilio.authToken,
      fromNumber: config.twilio.fromNumber,
    });
  }

  return null;
}

export { createTwilioWhatsAppProvider } from "./twilio";
