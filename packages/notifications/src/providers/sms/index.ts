import type { NotificationServiceConfig } from "../../types";
import type { SmsProvider } from "../types";
import { createTwilioSmsProvider } from "./twilio";

export function createSmsProvider(
  config: NotificationServiceConfig["sms"]
): SmsProvider | null {
  if (!config) {
    return null;
  }

  if (config.provider === "twilio" && config.twilio) {
    return createTwilioSmsProvider(config.twilio);
  }

  return null;
}

export { createTwilioSmsProvider } from "./twilio";
