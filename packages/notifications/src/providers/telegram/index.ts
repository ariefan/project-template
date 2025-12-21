import type { NotificationServiceConfig } from "../../types";
import type { TelegramProvider } from "../types";
import { createTelegramProvider } from "./telegram";

export function createTelegramProviderFromConfig(
  config: NotificationServiceConfig["telegram"]
): TelegramProvider | null {
  if (!config?.botToken) {
    return null;
  }

  return createTelegramProvider({ botToken: config.botToken });
}

export { createTelegramProvider } from "./telegram";
